import semver from 'semver';
import crypto from 'crypto';
import fs from 'fs';
import { download, streamToBuffer } from './download';

interface ModDb {
	[name: string]: {
		name: string,
		description: string,
		licence: string,
		page: Page[],
		archive_link: string,
		hash: {
			sha256: string,
		},
		version: string,
	}
}

export async function build(packages: [PkgMetadata, InputLocation][]): Promise<PackageDB> {
	const result: PackageDB = {};
	const promises: Promise<void>[] = [];

	for (const [, [pkg, inputs]] of groupByName(packages)) {
		if (!check(pkg)) {
			continue;
		}

		promises.push(buildEntry(result, pkg, inputs));
	}

	await Promise.all(promises);

	return sort(result);
}

export async function write(db: PackageDB): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		fs.writeFile('../npDatabase.json', JSON.stringify(db, null, 4), err => {
			if (err) {
				return reject(err);
			}
			resolve();
		});
	});
}

export async function writeMods(db: PackageDB): Promise<void> {
	const mods: ModDb = {};

	for (const name of Object.keys(db)) {
		const pkg = db[name];

		if (pkg.metadata.ccmodType === 'base' || pkg.metadata.ccmodType === 'tool') {
			continue;
		}

		const install = getInstallation(pkg.installation);
		if (!install) {
			continue;
		}

		mods[name] = {
			name: pkg.metadata.ccmodHumanName || name,
			description: pkg.metadata.description || 'A mod. (Description not available; contact mod author and have them add a description to their package.json file)',
			licence: pkg.metadata.license!,
			page: getHomepage(pkg.metadata.homepage),
			archive_link: install.url,
			hash: install.hash,
			version: pkg.metadata.version || '0.1.0',
		};
	}

	return new Promise<void>((resolve, reject) => {
		fs.writeFile('../mods.json', JSON.stringify({mods}, null, 4), err => {
			if (err) {
				return reject(err);
			}
			resolve();
		});
	});
}

function getHomepage(url?: string): Page[] {
	if (!url) {
		return [];
	}

	let name: string;
	switch (new URL(url).hostname) {
	case 'github.com':
		name = 'GitHub';
		break;
	case 'gitlab.com':
		name = 'GitLab';
		break;
	default:
		name = 'mod\'s homepage';
	}

	return [{name, url}];
}

function getInstallation(installations: InstallMethod[]): {url: string, hash: {sha256: string}} | undefined {
	const zip = installations.find(i => i.type === 'ccmod') as InstallMethodCCMod;
	if (zip) {
		return {url: zip.url, hash: zip.hash};
	}

	const modZip = installations.find(i => i.type === 'modZip') as InstallMethodModZip;
	if (modZip) {
		return {url: modZip.url, hash: modZip.hash};
	}

	return undefined;
}

async function buildEntry(result: PackageDB, pkg: PkgMetadata, inputs: InputLocation[]): Promise<void> {
	result[pkg.name] = {
		metadata: pkg,
		installation: await generateInstallations(inputs),
	};
}

function check(pkg: PkgMetadata): boolean {
	if (!pkg.version) {
		console.warn(`Package is missing version: ${pkg.name}; correct ASAP`);
		return false;
	}

	if (semver.parse(pkg.version) == null) {
		console.warn(`Package version invalid: ${pkg.name}`);
		return false;
	}

	if (pkg.dependencies) {
		console.warn(`Package has 'dependencies', not 'ccmodDependencies': ${pkg.name}; correct ASAP`);
		return false;
	}

	if (pkg.ccmodDependencies) {
		if (pkg.ccmodDependencies.constructor !== Object) {
			console.warn(`Package has dependencies not an object: ${pkg.name}`);
			return false;
		}

		for (let dep in pkg.ccmodDependencies) {
			if (semver.validRange(pkg.ccmodDependencies[dep]) === null) {
				console.warn(`Package has invalid constraint: ${pkg.name}`);
				return false;
			}
		}
	}
	return true;
}

async function generateInstallations(inputs: InputLocation[]): Promise<InstallMethod[]> {
	const result = [];

	for (const input of inputs) {
		const install = await generateInstallation(input);
		if (install) {
			if (install instanceof Array) {
				result.push(...install);
			} else {
				result.push(install);
			}
		}
	}

	return result;
}

async function generateInstallation(input: InputLocation): Promise<InstallMethod[] | InstallMethod | undefined> {
	switch (input.type) {
	case 'modZip': {
		const data = await streamToBuffer(await download(input.urlZip));

		return {
			type: 'modZip',
			url: input.urlZip,
			source: input.source,
			hash: {
				sha256: crypto.createHash('sha256').update(data).digest('hex'),
			},
		};
	}
	case 'ccmod': {
		const data = await streamToBuffer(await download(input.url));

		return {
			type: 'ccmod',
			url: input.url,
			hash: {
				sha256: crypto.createHash('sha256').update(data).digest('hex'),
			},
		};
	}
	case 'injected':
		return input.installation;
	}
}

function groupByName(packages: [PkgMetadata, InputLocation][]) : Map<string, [PkgMetadata, InputLocation[]]> {
	const result = new Map<string, [PkgMetadata, InputLocation[]]>();

	for (const [pkg, input] of packages) {
		if (result.has(pkg.name)) {
            result.get(pkg.name)?.[1].push(input);
		} else {
			result.set(pkg.name, [pkg, [input]]);
		}
	}

	return result;
}

function sort(db: PackageDB): PackageDB {
	const result: PackageDB = {};
	for (const key of Object.keys(db).sort()) {
		result[key] = db[key];
	}
	return result;
}
