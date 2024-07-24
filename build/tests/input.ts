import { expect } from 'chai'
import { InputLocations } from '../src/types'
// import { download, streamToBuffer } from '../src/download'

const inputLocations: InputLocations = JSON.parse(process.env['input-locations.json']!)

describe('InputLocations', async () => {
    it('Check json structure', () => {
        expect(typeof inputLocations === 'object', 'Json not valid: Not an array').to.be.true
        expect(Array.isArray(inputLocations), 'Json not valid: Not an array').to.be.true
        expect(inputLocations !== null, 'Json not valid: Not an array').to.be.true
    })

    describe('mods', () => {
        for (let i = 0; i < inputLocations.length; i++) {
            const loc = inputLocations[i]
            describe(loc.url, () => {
                it('Check for required elements', async () => {
                    expect(loc.type).to.be.oneOf(
                        [undefined, 'zip'],
                        'type (type: string) must be one of: [undefined, "zip"]'
                    )

                    switch (loc.type) {
                        case undefined:
                        case 'zip':
                            expect(typeof loc.url).to.equal('string')
                            expect(loc.source === undefined || typeof loc.source === 'string').to.be
                                .true
                            break
                    }
                })
            })
        }
    })
})
