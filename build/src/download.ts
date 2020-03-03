import https from 'https';
import http from 'http';
import urlModule from 'url';
import stream from 'stream';
import * as cache from './cache';

/**
 *
 * @param url
 * @returns path to file
 */
export async function download(url: string): Promise<stream.Readable> {
	const [head, realUrl] = await follow(url);
	const etag = getTag(head);

	const cached = await cache.get(etag);
	if (cached) {
		return cached;
	}

	const resp = await body(realUrl);
	cache.put(etag, resp.pipe(new stream.PassThrough()));
	return resp.pipe(new stream.PassThrough());
}

export function streamToBuffer(readable: stream.Readable): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const parts: Buffer[] = [];
		readable
			.on('data', (d) => parts.push(d))
			.on('end', () => resolve(Buffer.concat(parts)))
			.on('error', (err) => reject(err));
	});
}

async function follow(url: string): Promise<[http.IncomingMessage, string]> {
	let result = await head(url);
	while (result.statusCode === 302) {
		url = result.headers.location!;
		result = await head(url);
	}
	return [result, url];
}

function head(url: string): Promise<http.IncomingMessage> {
	return getUsingMethod(url, 'HEAD');
}

function body(url: string): Promise<http.IncomingMessage> {
	return getUsingMethod(url, 'GET');
}

async function getUsingMethod(url: string, method: string): Promise<http.IncomingMessage> {
	const uri = urlModule.parse(url);
	const { get } = uri.protocol === 'https:' ? https : http;
	const options = {method};

	return new Promise((resolve, reject) =>
		get(url, options)
			.on('response', (resp) => resolve(resp))
			.on('error', (err) => reject(err)));
}

function getTag(head: http.IncomingMessage): string {
	switch (typeof head.headers.etag) {
	case 'string':
		return head.headers.etag;
	case 'object':
		return head.headers.etag[0];
	default:
		return '';
	}
}
