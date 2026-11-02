import { expect, describe, test } from 'bun:test'
import type { InputLocations } from '../src/types'
import { gitReadFunc } from '../src/git'

const branch = process.env['BRANCH']
if (!branch) throw new Error('enviroment variable BRANCH is not set!')
const inputLocationsPromise: Promise<InputLocations> = await gitReadFunc(
    branch,
    'input-locations.json'
).then(data => JSON.parse(data!))

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
