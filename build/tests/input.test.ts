import { expect, describe, test } from 'bun:test'
import { gitReadFunc } from '../src/git'
import { readInputLocations } from '../src/fs-util'

const branch = process.env['BRANCH']
if (!branch) throw new Error('enviroment variable BRANCH is not set!')
const inputLocationsPromise = readInputLocations(path => gitReadFunc(branch, path))

describe('InputLocations', () => {
    test('json structure', async () => {
        const inputLocations = await inputLocationsPromise
        expect(typeof inputLocations === 'object', 'Json not valid: Not an object').toBe(true)
        expect(inputLocations !== null, 'Json not valid: Not an object').toBe(true)
    })

    describe('mods', async () => {
        const inputLocations = await inputLocationsPromise
        for (const modId in inputLocations) {
            const loc = inputLocations[modId]
            test(loc.url, async () => {
                expect(
                    [undefined, 'zip'],
                    'type (type: string) must be one of: [undefined, "zip"]'
                ).toContain(loc.type)

                switch (loc.type) {
                    case undefined:
                    case 'zip':
                        expect(loc.url).toBeTypeOf('string')
                        expect(
                            loc.source === undefined || typeof loc.source === 'string'
                        ).toBeTrue()
                        break
                }
            })
        }
    })
})
