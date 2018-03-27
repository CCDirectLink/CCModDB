'use strict';

// call with mocha
// require chai

const { expect } = require('chai');
const fs = require('fs');

describe('ModDB', () => {

	const FILE_PATH = 'mods.json';
	const jsonData = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));

	it('Check json structure', () => {
		expect(typeof jsonData === 'object',
			'Json not valid: Not an object').to.be.true;
		expect(Array.isArray(jsonData),
			'Json not valid: Not an object').to.be.false;
		expect(jsonData !== null,
			'Json not valid: Not an object').to.be.true;

		expect(typeof jsonData.mods === 'object',
			'mods key missing').to.be.true;
	});

	describe('mods', () => {

		for (let mod in jsonData.mods) {

			describe(mod, () => {

				it('Check for required elements', () => {
					expect(typeof jsonData.mods[mod].name === 'string',
						'name (type: string) required').to.be.true;
					expect(typeof jsonData.mods[mod].description === 'string',
						'description (type: string) required').to.be.true;
					expect(typeof jsonData.mods[mod].archive_link === 'string',
						'archive_link (type: string) required').to.be.true;
					expect(typeof jsonData.mods[mod].hash === 'object',
						'hash (type: object) required').to.be.true;
				});

				it('Check file', () => {
					expect(/^https?:\/\//
						.test(jsonData.mods[mod].archive_link),
					'invalid url').to.be.true;
				});

			});

		}

	});

});
