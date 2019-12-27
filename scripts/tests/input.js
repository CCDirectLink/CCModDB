'use strict';

// call with mocha
// require chai

const { expect } = require('chai');
const fs = require('fs');
const getFile = require('../../lib/get.js');

describe('ModDB', () => {
	const FILE_PATH = 'input-locations.json';
	const jsonData = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));

	it('Check json structure', () => {
		expect(typeof jsonData === 'object',
			'Json not valid: Not an array').to.be.true;
		expect(Array.isArray(jsonData),
			'Json not valid: Not an array').to.be.true;
		expect(jsonData !== null,
			'Json not valid: Not an array').to.be.true;
	});

	describe('mods', () => {
		for (const mod of Object.keys(jsonData)) {
			describe(mod, () => {
				it('Check for required elements', async() => {
					expect(jsonData[mod].type).to.be.oneOf(['modZip'],
						'type (type: string) must be one of: ["modZip"]');

					switch (jsonData[mod].type) {
					case 'modZip':
						expect(typeof jsonData[mod].urlZip).to.equal('string');
						expect(jsonData[mod].source === undefined
                           || typeof jsonData[mod].source === 'string')
							.to.be.true;
						expect(await getFile(jsonData[mod].urlZip))
							.to.not.throw;
						break;
					}
				});
			});
		}
	});
});
