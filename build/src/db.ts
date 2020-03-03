import semver from 'semver';
import crypto from 'crypto';
import fs from 'fs';
import { download, streamToBuffer } from './download';

export async function build(packages: [PackageDBPackageMetadata, InputLocation][]): Promise<PackageDB> {
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

async function buildEntry(result: PackageDB, pkg: PackageDBPackageMetadata, inputs: InputLocation[]): Promise<void> {
	result[pkg.name] = {
		metadata: pkg,
		installation: await generateInstallations(inputs),
	};
}

function check(pkg: PackageDBPackageMetadata): boolean {
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

async function generateInstallations(inputs: InputLocation[]): Promise<PackageDBInstallationMethod[]> {
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

async function generateInstallation(input: InputLocation): Promise<PackageDBInstallationMethod[] | PackageDBInstallationMethod | undefined> {
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
	case 'injected':
		return input.installation;
	}
}

function groupByName(packages: [PackageDBPackageMetadata, InputLocation][]) : Map<string, [PackageDBPackageMetadata, InputLocation[]]> {
	const result = new Map<string, [PackageDBPackageMetadata, InputLocation[]]>();

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
