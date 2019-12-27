'use strict';

const fs = require('fs');
const process = require('process');
const crypto = require('crypto');
const semver = require('semver');

const inputLocations = require('../lib/inputLocations.js');
const getFile = require('../lib/get.js');

// Gives a parse error on "async function"
const main = async() => {
	const npDatabase = await inputLocations.downloadPackages();

	for (let k in npDatabase) {
		const metadata = npDatabase[k].metadata;
		if (metadata.name !== k)
			throw new Error('Package name does not equal key: ' + k);
		// --- Warnings
		if (!metadata.version) {
			console.warn('Package is missing version: ' + k + '; correct ASAP');
		} else if (semver.parse(metadata.version) === null) {
			throw new Error('Package version invalid: ' + k);
		}
		if (metadata.dependencies && !metadata.ccmodDependencies)
			console.warn('Package has \'dependencies\',' +
				' not \'ccmodDependencies\': ' + k + '; correct ASAP');
		const dependencies =
			metadata.ccmodDependencies ||
			metadata.dependencies; // grrr
		if (dependencies) {
			if (dependencies.constructor !== Object)
				throw new Error('Package has dependencies not an object: ' + k);
			for (let dep in dependencies)
				if (semver.validRange(dependencies[dep]) === null)
					throw new Error('Package has invalid constraint: ' + k);
		}
		// ---
		for (let method of npDatabase[k].installation) {
			if (method.type !== 'modZip')
				continue;
			const data = await getFile(method.url);
			method.hash = {
				sha256: crypto.createHash('sha256').update(data).digest('hex'),
			};
		}
	}

	fs.writeFileSync('npDatabase.json', JSON.stringify(npDatabase, null, 4));

	const mods = {};
	for (let k in npDatabase) {
		let type = npDatabase[k].metadata.ccmodType || 'mod';
		if (type === 'base') {
			// Base doesn't contribute to mod processing
			continue;
		}
		let archiveURL;
		let archiveHash;
		for (let method of npDatabase[k].installation) {
			if (method.platform)
				continue;
			if (!method.url)
				continue;
			archiveURL = method.url;
			archiveHash = method.hash;
			break;
		}
		const page = [];
		const homepage = npDatabase[k].metadata.homepage;
		if (homepage) {
			let homepageName = 'mod\'s homepage';
			if (homepage.indexOf('github.com') !== -1)
				homepageName = 'GitHub';
			if (homepage.indexOf('gitlab.com') !== -1)
				homepageName = 'GitLab';
			page.push({
				name: homepageName,
				url: homepage,
			});
		}
		const result = {
			name: npDatabase[k].metadata.ccmodHumanName || k,
			description: npDatabase[k].metadata.description ||
				('A mod. (Description not available; contact mod author and' +
				' have them add a description to their package.json file)'),
			license: npDatabase[k].metadata.license,
			page: page,
			archive_link: archiveURL,
			hash: archiveHash,
			version: npDatabase[k].metadata.version || '0.1.0',
		};
		// Place in the appropriate area
		if (type === 'mod')
			mods[k] = result;
	}

	fs.writeFileSync('mods.json', JSON.stringify({mods: mods}, null, 4));
};

(async() => {
	try {
		await main();
	} catch (err) {
		console.error(err);
		process.exit(1);
	}
})();
