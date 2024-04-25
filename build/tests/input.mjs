// call with mocha
// require chai

import { expect } from 'chai';
import fs from 'fs';
import {download, streamToBuffer} from '../dist/src/download.js';

describe('InputLocations', () => {
	const FILE_PATH = './input-locations.json';
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
			describe(jsonData[mod].url || mod, () => {
				it('Check for required elements', async() => {
					expect(jsonData[mod].type).to.be.oneOf([undefined, 'zip'],
						'type (type: string) must be one of: [undefined, "zip"]');

					switch (jsonData[mod].type) {
					case 'zip':
						expect(typeof jsonData[mod].url).to.equal('string');
						expect(jsonData[mod].source === undefined
                           || typeof jsonData[mod].source === 'string')
							.to.be.true;
						expect(await streamToBuffer(await download(jsonData[mod].url)))
							.to.not.throw;
						break;
					}
				}).timeout(1000000);
			});
		}
	});
});
