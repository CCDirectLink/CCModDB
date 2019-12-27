'use strict';

const fs = require('fs');
const getFile = require('./get.js');
const scanZip = require('./zip.js');

const data = JSON.parse(fs.readFileSync('input-locations.json', 'utf8'));

// Maps 'type' to classes.
// Classes are constructed with (data).
// Then _download() is called to initialize the rest.
const classes = new Map();

class BasePackageLocation {
	constructor(data) {
		this.location = data;
		this.referent = JSON.stringify(data);
	}
	async _download() {
	}
	// Returns PNP.PackageDBPackage[]
	get packages() {
		throw new Error('Not implemented');
	}
}

classes.set('injected', class ModZip extends BasePackageLocation {
	constructor(data) {
		super(data);
		if (!(this.location.metadata.name))
			throw new Error('In ' + this.referent + ': No name');
		this.referent = this.location.metadata.name;
		if (!(this.location.metadata.version))
			throw new Error('In ' + this.referent + ': No version');
	}
	get packages() {
		return [
			{
				metadata:
					JSON.parse(JSON.stringify(this.location.metadata)),
				installation:
					JSON.parse(JSON.stringify(this.location.installation)),
			},
		];
	}
});

classes.set('modZip', class ModZip extends BasePackageLocation {
	constructor(data) {
		super(data);
		if (this.location.source) {
			this._packageJSONPath = this.location.source + '/package.json';
			this.referent = this.location.urlZip + '/' + this.location.source;
		} else {
			this._packageJSONPath = 'package.json';
			this.referent = this.location.urlZip;
		}
		if (this.location.packageJSONPath)
			this._packageJSONPath = this.location.packageJSONPath;
		this._packageJSONText = null;
	}
	async _download() {
		const downloadedZip = await getFile(this.location.urlZip);
		const scannedZip = scanZip(downloadedZip);
		for (let entry of scannedZip) {
			if (entry.name === this._packageJSONPath) {
				// Found it!
				this._packageJSONText = entry.data.toString('utf8');
				return;
			}
		}
		throw new Error('Unable to locate package.json in ' + this.referent +
			' at ' + this._packageJSONPath);
	}
	get packages() {
		const packageMetadata = JSON.parse(this._packageJSONText);
		const packageInstallation = {
			type: 'modZip',
			url: this.location.urlZip,
		};
		if (this.location.source)
			packageInstallation.source = this.location.source;
		return [
			{
				metadata: packageMetadata,
				installation: [
					packageInstallation,
				],
			},
		];
	}
});

module.exports = {
	// Returns a Promise.
	downloadPackages: async() => {
		const packages = {};
		for (let pkg of data) {
			// regarding the naming here: see strongloop rules
			// the "new Clazz" later requires the first letter be a capital
			const Clazz = classes.get(pkg.type);
			if (!Clazz) {
				throw new Error('Unable to get package location type ' +
					pkg['type']);
			}
			const instance = new Clazz(pkg);
			try {
				await instance._download();
				for (let v of instance.packages) {
					if (!v.metadata.name)
						throw new Error('No name given to a package: ' +
							JSON.stringify(v));
					if (packages[v.metadata.name])
						throw new Error('Conflict: Two packages have name ' +
							v.metadata.name);
					packages[v.metadata.name] = v;
				}
			} catch (e) {
				console.warn('Issue on handling of ' + instance.referent, e);
			}
		}
		return packages;
	},
};
