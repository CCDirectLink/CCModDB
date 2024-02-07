// call with mocha
// require chai

const { expect } = require('chai');
const fs = require('fs');
const semver = require('semver');
const crypto = require('crypto');
const {download, streamToBuffer} = require('../dist/download');

describe('NpDatabase', () => {

	const FILE_PATH = '../npDatabase.json';
	const jsonData = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));

	it('Check json structure', () => {
		expect(typeof jsonData === 'object',
			'Json not valid: Not an object').to.be.true;
		expect(Array.isArray(jsonData),
			'Json not valid: Not an object').to.be.false;
		expect(jsonData !== null,
			'Json not valid: Not an object').to.be.true;
	});

	describe('mods', () => {
		for (let mod of Object.keys(jsonData)) {
			testPackage(jsonData, jsonData[mod], mod);
		}
	});

});

function testPackage(jsonData, mod, name) {
	describe(`Package: ${name}`, () => {
		it('Check for required elements', () => {
			expect(mod !== null,
				'package must not be null').to.be.true;

			expect(typeof mod.metadata === 'object',
				'metadata (type: object) required').to.be.true;
			expect(Array.isArray(mod.metadata),
				'metadata (type: object) required').to.be.false;
			expect(mod.metadata !== null,
				'metadata (type: object) required').to.be.true;

			expect(typeof mod.installation === 'object',
				'installation (type: array) required').to.be.true;
			expect(Array.isArray(mod.installation),
				'installation (type: array) required').to.be.true;
			expect(mod.installation !== null,
				'installation (type: array) required').to.be.true;
		});

		if (mod && mod.metadata) {
			testMetadata(jsonData, mod.metadata);
		}
		if (mod && mod.metadataCCMod) {
			testMetadataCCMod(jsonData, mod.metadataCCMod);
		}

		if (mod && mod.installation) {
			testInstallation(mod);
		}
	});
}

function testMetadata(jsonData, metadata) {
	it('Test metadata', () => {
		expect(typeof metadata.name === 'string',
			'metadata.name (type: string) required').to.be.true;

		expect([undefined, 'mod', 'tool', 'base'].includes(metadata.ccmodType),
			'metadata.ccmodType (type: string) must have one of: '
			+ '[undefined, "mod", "tool", "base"]').to.be.true;

		expect(metadata.version === undefined
			|| semver.valid(metadata.version) !== null,
		'metadata.version (type: string) must be undefined or valid semver')
			.to.be.true;

		expect(metadata.ccmodHumanName === undefined
			|| typeof metadata.ccmodHumanName === 'string',
		'metadata.ccmodHumanName (type: string) has wrong type').to.be.true;
		expect(metadata.description === undefined
			|| typeof metadata.description === 'string',
		'metadata.description (type: string) has wrong type').to.be.true;
		expect(metadata.license === undefined
			|| typeof metadata.license === 'string',
		'metadata.license (type: string) has wrong type').to.be.true;
		expect(metadata.homepage === undefined
			|| typeof metadata.homepage === 'string',
		'metadata.homepage (type: string) has wrong type').to.be.true;
	});

	if (metadata.ccmodDependencies) {
		it('Test check dependencies', () => {
			expect(typeof metadata.ccmodDependencies === 'object',
				'metadata.ccmodDependencies (type: object) must be an object')
				.to.be.true;
			expect(Array.isArray(metadata.ccmodDependencies),
				'metadata.ccmodDependencies (type: object) must be an object')
				.to.be.false;
			expect(metadata.ccmodDependencies !== null,
				'metadata.ccmodDependencies (type: object) must be an object')
				.to.be.true;

			for (const dep of Object.keys(metadata.ccmodDependencies)) {
				expect(semver.validRange(metadata.ccmodDependencies[dep]),
					`dependency ${dep} must be specify a valid range`)
					.to.not.be.null;

				if (
					[
						'crosscode',
						'simplify',
						// https://github.com/CCDirectLink/CCLoader3/blob/edb3481d9ea504e2c7f7fe46709ab2b4a7f2ce0b/src/game.ts#L9-L17
						'fish-gear',
						'flying-hedgehag',
						'manlea',
						'ninja-skin',
						'post-game',
						'scorpion-robo',
						'snowman-tank',
					].includes(dep.toLowerCase())) {
					continue;
				}

				expect(jsonData[dep],
					`dependency ${dep} must be registered in CCModDb`)
					.to.not.be.undefined;
			}
		});
	} else {
		expect(metadata.dependencies === undefined,
			'metadata.dependencies must not be used').to.be.true;
	}
}

function testMetadataCCMod(jsonData, ccmod) {
	it('Test ccmod.json', () => {
		expect(typeof ccmod.id === 'string',
			'ccmod.id (type: string) required').to.be.true;

		expect([undefined, 'mod', 'library'].includes(ccmod.type),
			'ccmod.type (type: string) must have one of: '
			+ '[undefined, "mod", "library"]').to.be.true;

		expect(ccmod.version === undefined
			|| semver.valid(ccmod.version) !== null,
		'ccmod.version (type: string) must be undefined or valid semver')
			.to.be.true;

		expect(ccmod.title === undefined
			|| typeof ccmod.title === 'string'
            || typeof ccmod.title === 'object',
		'ccmod.title (type: string) has wrong type').to.be.true;
		expect(ccmod.description === undefined
			|| typeof ccmod.description === 'string'
			|| typeof ccmod.description === 'object',
		'ccmod.description (type: string) has wrong type').to.be.true;
		expect(ccmod.license === undefined
			|| typeof ccmod.license === 'string',
		'ccmod.license (type: string) has wrong type').to.be.true;
		expect(ccmod.homepage === undefined
			|| typeof ccmod.homepage === 'string',
		'ccmod.homepage (type: string) has wrong type').to.be.true;
	});

	if (ccmod.dependencies) {
		it('Test check dependencies', () => {
			expect(typeof ccmod.dependencies === 'object',
				'ccmod.dependencies (type: object) must be an object')
				.to.be.true;
			expect(Array.isArray(ccmod.dependencies),
				'ccmod.dependencies (type: object) must be an object')
				.to.be.false;
			expect(ccmod.dependencies !== null,
				'ccmod.dependencies (type: object) must be an object')
				.to.be.true;

			for (const dep of Object.keys(ccmod.dependencies)) {
				expect(semver.validRange(ccmod.dependencies[dep]),
					`dependency ${dep} must be specify a valid range`)
					.to.not.be.null;

				if (
					[
						'crosscode',
						'simplify',
						// https://github.com/CCDirectLink/CCLoader3/blob/edb3481d9ea504e2c7f7fe46709ab2b4a7f2ce0b/src/game.ts#L9-L17
						'fish-gear',
						'flying-hedgehag',
						'manlea',
						'ninja-skin',
						'post-game',
						'scorpion-robo',
						'snowman-tank',
					].includes(dep.toLowerCase())) {
					continue;
				}

				expect(jsonData[dep],
					`dependency ${dep} must be registered in CCModDb`)
					.to.not.be.undefined;
			}
		});
	} else {
		expect(ccmod.dependencies === undefined,
			'ccmod.dependencies must not be used').to.be.true;
	}
}

function testInstallation(mod) {
	for (let i = 0; i < mod.installation.length; i++) {
		const inst = mod.installation[i];
		it(`Check installation ${i}`, async() => {
			expect(typeof inst === 'object',
				'installation (type: object) must be an object')
				.to.be.true;
			expect(Array.isArray(inst),
				'installation (type: object) must be an object')
				.to.be.false;
			expect(inst !== null,
				'installation (type: object) must be an object')
				.to.be.true;

			expect(['modZip', 'ccmod'].includes(inst.type),
				'installation.type (type: string) must be one of: ["modZip"]')
				.to.be.true;

			expect(inst.platform === undefined
				|| ['aix', 'darwin', 'freebsd', 'linux',
					'openbsd', 'sunos', 'win32', 'android']
					.includes(inst.platform),
			'installation.platform (type: string) must be a valid platform')
				.to.be.true;

			switch (inst.type) {
			case 'modZip':
				await testModZip(inst);
				break;
			case 'ccmod':
				await testCCMod(inst);
				break;
			}
		}).timeout(10000);
	}
}

async function testModZip(modzip) {
	expect(typeof modzip.hash === 'object',
		'modzip.hash (type: object) must be an object')
		.to.be.true;
	expect(Array.isArray(modzip.hash),
		'modzip.hash (type: object) must be an object')
		.to.be.false;
	expect(modzip.hash !== null,
		'modzip.hash (type: object) must be an object')
		.to.be.true;
	expect(typeof modzip.hash.sha256 === 'string',
		'modzip.hash.sha256 (type: string) must be a string').to.be.true;

	expect(typeof modzip.url === 'string',
		'modzip.url (type: string) must be a string').to.be.true;
	expect(modzip.source === undefined || typeof modzip.source === 'string',
		'modzip.source (type: string) must be a string').to.be.true;

	if (modzip.url) {
		const hash = await getHash(modzip.url);
		expect(modzip.hash.sha256.toLowerCase())
			.to.equal(hash, 'hash must match');
	}
}

async function testCCMod(ccmod) {
	expect(typeof ccmod.hash === 'object',
		'modzip.hash (type: object) must be an object')
		.to.be.true;
	expect(Array.isArray(ccmod.hash),
		'modzip.hash (type: object) must be an object')
		.to.be.false;
	expect(ccmod.hash !== null,
		'modzip.hash (type: object) must be an object')
		.to.be.true;
	expect(typeof ccmod.hash.sha256 === 'string',
		'modzip.hash.sha256 (type: string) must be a string').to.be.true;

	expect(typeof ccmod.url === 'string',
		'modzip.url (type: string) must be a string').to.be.true;
	expect(ccmod.source,
		'modzip.source (type: undefined) must not exist').to.be.undefined;

	if (ccmod.url) {
		const hash = await getHash(ccmod.url);
		expect(ccmod.hash.sha256.toLowerCase())
			.to.equal(hash, 'hash must match');
	}
}


async function getHash(url) {
	const file = await download(url);
	const buf = await streamToBuffer(file);
	return crypto.createHash('sha256').update(buf).digest('hex');
}

