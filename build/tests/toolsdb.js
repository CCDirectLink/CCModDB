// call with mocha
// require chai

const { expect } = require('chai');
const fs = require('fs');

describe('ToolsDB', () => {

	const FILE_PATH = '../tools.json';
	const HASH_TYPE = 'sha256';
	const jsonData = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));

	it('Check json structure', () => {
		expect(typeof jsonData === 'object',
			'Json not valid: Not an object').to.be.true;
		expect(Array.isArray(jsonData),
			'Json not valid: Not an object').to.be.false;
		expect(jsonData !== null,
			'Json not valid: Not an object').to.be.true;

		expect(typeof jsonData.tools === 'object',
			'tools key missing').to.be.true;
	});

	describe('tools', () => {

		for (let tool in jsonData.tools) {

			describe(tool, () => {

				it('Check for required elements', () => {
					expect(typeof jsonData.tools[tool]
						.name === 'string',
					'name (type: string) required').to.be.true;
					expect(typeof jsonData.tools[tool]
						.description === 'string',
					'description (type: string) required').to.be.true;
					expect(typeof jsonData.tools[tool]
						.archive_link === 'string',
					'archive_link (type: string) required').to.be.true;
					expect(typeof jsonData.tools[tool]
						.hash === 'object',
					'hash (type: object) required').to.be.true;
					expect(typeof jsonData.tools[tool]
						.hash[HASH_TYPE] === 'string',
					'hash.' + HASH_TYPE +
						' (type: string) required').to.be.true;
				});

				it('Check file', () => {
					expect(/^https?:\/\//
						.test(jsonData.tools[tool].archive_link),
					'invalid url').to.be.true;
				});

			});

		}

	});

});
