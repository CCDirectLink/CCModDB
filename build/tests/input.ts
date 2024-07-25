import { expect } from 'chai'
import { InputLocations } from '../src/types'
import { gitReadFunc } from '../src/git'
// import { download, streamToBuffer } from '../src/download'

let inputLocations: InputLocations

const inputLocationsPromise: Promise<void> = new Promise<void>(async resolve => {
    const branch = process.env['BRANCH']!
    inputLocations = JSON.parse((await gitReadFunc(branch, 'input-locations.json'))!)
    resolve()
})

describe('InputLocations', () => {
    it('Check json structure', async () => {
        await inputLocationsPromise
        expect(typeof inputLocations === 'object', 'Json not valid: Not an array').to.be.true
        expect(Array.isArray(inputLocations), 'Json not valid: Not an array').to.be.true
        expect(inputLocations !== null, 'Json not valid: Not an array').to.be.true
    })

    describe('mods', async () => {
        await inputLocationsPromise
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
