'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');

const cachePrefix = 'build-cache-zip/';

const requestCache = new Map();

function encodeStr(str) {
	str = str.replace(/\-/g, '--');
	str = str.replace(/\%/g, '-M');
	str = str.replace(/\+/g, '-P');
	str = str.replace(/\~/g, '-T');
	str = str.replace(/\ /g, '-S');
	str = str.replace(/\//g, '-F');
	str = str.replace(/\\/g, '-B');
	str = str.replace(/\:/g, '-C');
	str = str.replace(/\=/g, '-Z');
	return str;
}

class CacheRequest {
	constructor(url) {
		url = new URL(url);
		this._url = url;
		this._key = url.toString();
		this._cache = cachePrefix + encodeStr(this._key);
		this._callbacks = [];
		this._resultErr = null;
		this._resultData = null;

		requestCache.set(this._key, this);

		fs.readFile(this._cache, (err, data) => {
			if (err) {
				console.warn('cache: Downloading ' + this._key);
				console.warn(' can override with ' + this._cache);
				this._makeRequest(url, [], (err, data) => {
					if (!err) {
						// Just a cache, don't care about the result.
						// That said, we also don't want an *incomplete* result,
						//  so hold in a temporary buffer.
						fs.writeFile(this._cache, data, (err) => {
							if (err) {
								console.warn('cache: Unable to save ' +
									this._key, err);
								fs.unlink(this._cache, () => {});
							} else {
								// Just in case...
								requestCache.delete(this._key);
							}
						});
					}
					this._finished(err, data);
				});
			} else {
				// Cache hit
				// console.warn('cache: Found ' + this._key + ' in cache');
				this._finished(null, data);
			}
		});
	}

	_makeRequest(realURL, attemptedURLs, callback) {
		if (attemptedURLs.indexOf(realURL.toString()) !== -1) {
			callback(new Error('Cyclic redirect: ' + realURL.toString()), null);
			return;
		}
		attemptedURLs.push(realURL.toString());
		// Cache miss, retrieve file
		const handler = (res) => {
			// Before continuing, work out if we're being redirected.
			// (GitHub redirects to the "codeload" subdomain, for example.)
			// If we are, immediately abandon & run with a new URL.
			if (res.statusCode === 301 || res.statusCode === 302 ||
				res.statusCode === 303 || res.statusCode === 307 ||
				res.statusCode === 308) {
				const newLocation = new URL(res.headers['location']);
				console.warn('cache: ' + this._key +
					' via ' + newLocation.toString());
				this._makeRequest(newLocation, attemptedURLs, callback);
				res.destroy();
				return;
			}
			// Collate all the received buffers.
			const buffers = [];
			res.on('data', (part) => {
				buffers.push(part);
			});
			res.on('end', () => {
				if (!res.complete) {
					callback(new Error('data not complete'), null);
				} else {
					const downloaded = Buffer.concat(buffers);
					callback(null, downloaded);
				}
			});
		};
		// Protocols
		let options = {
			headers: {
				'user-agent': 'CCModDB Maintenance Scripts',
			},
		};
		let session;
		if (this._url.protocol === 'https:') {
			session = https.get(realURL, options, handler);
		} else {
			session = http.get(realURL, options, handler);
		}
		session.on('error', (err) => callback(err, null));
	}

	_finished(err, data) {
		this._resultErr = err;
		this._resultData = data;
		const backupCallbacks = this._callbacks;
		this._callbacks = null;
		for (const callback of backupCallbacks)
			this.pushCallback(callback);
	}

	get finished() {
		return !this._callbacks;
	}

	pushCallback(callback) {
		if (this._callbacks) {
			this._callbacks.push(callback);
		} else {
			setImmediate(() => {
				callback(this._resultErr, this._resultData);
			});
		}
	}
}

function downloadFile(url, callback) {
	const urlString = url.toString();
	// If there's an ongoing request for this specific file,
	//  the cache may not be valid.
	const oldRequest = requestCache.get(urlString);
	if (requestCache.has(urlString)) {
		oldRequest.pushCallback(callback);
		return oldRequest;
	}
	const val = new CacheRequest(url);
	if (callback)
		val.pushCallback(callback);
	return val;
}

module.exports = (url) => {
	return new Promise((resolve, reject) => {
		downloadFile(url, (err, data) => {
			if (err) {
				reject(err);
			} else {
				resolve(data);
			}
		});
	});
};
