// call with mocha
// require chai

const { expect } = require('chai');
const fs = require('fs');
const { intersects } = require('semver');

describe('ModDB', () => {
	const FILE_INPUT = '../input-locations.json';
	const FILE_PNP = '../npDatabase.json';
	const jsonInput = JSON.parse(fs.readFileSync(FILE_INPUT, 'utf8'));
	const jsonPnp = JSON.parse(fs.readFileSync(FILE_PNP, 'utf8'));

	for (const mod of jsonInput) {
		if (mod.type !== 'modZip' && mod.type !== 'ccmod') {
			continue;
		}
		it(`Check ${mod.urlZip || mod.url} registered`, () => {
			for (const name of Object.keys(jsonPnp)) {
				let found = false;
				const entry = jsonPnp[name];
				for (const i in entry.installation) {
					const inst = entry.installation[i];
					if (inst.type === 'modZip' && inst.url === mod.urlZip
					 || inst.type === 'ccmod' && inst.url === mod.url) {
						entry.installation.splice(i, 1);
						found = true;
						break;
					}
				}

				if (entry.installation.length === 0) {
					jsonPnp[name] = undefined;
					delete jsonPnp[name];
				}

				if (found) {
					return;
				}
			}

			expect.fail(undefined, mod.urlZip,
				'mod in input-locations but not in npDatabase'
                + ' (did you run `npm run build`?)');
		});
	}

	it('Check for deleted mods', () => {
		for (const name of Object.keys(jsonPnp)) {
			const entry = jsonPnp[name];
			for (const inst of entry.installation) {
				if (inst.type === 'modZip') {
					expect.fail(name, undefined,
						name + ' in npDatase but not in input-locations'
                        + ' (did you run `npm run build`?)');
					break;
				}
			}
		}
	});
});
