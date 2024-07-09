// call with mocha
// require chai

import { expect } from 'chai'

const inputLocations = JSON.parse(process.env['input-locations.json']!)
const npDatabase = JSON.parse(process.env['npDatabase.json']!)

describe('ModDB', () => {
    const jsonPnp = JSON.parse(JSON.stringify(npDatabase))

    for (const mod of inputLocations) {
        if (mod.type !== 'zip') {
            continue
        }
        it(`Check ${mod.url} registered`, () => {
            for (const name of Object.keys(jsonPnp)) {
                let found = false
                const entry = jsonPnp[name]
                for (const i in entry.installation) {
                    const inst = entry.installation[i]
                    if (inst.type === 'zip' && inst.url === mod.url) {
                        entry.installation.splice(i, 1)
                        found = true
                        break
                    }
                }

                if (entry.installation.length === 0) {
                    delete jsonPnp[name]
                }

                if (found) {
                    return
                }
            }

            expect.fail(
                undefined,
                mod.url,
                'mod in input-locations but not in npDatabase' + ' (did you run `npm run build`?)'
            )
        })
    }

    it('Check for deleted mods', () => {
        for (const name of Object.keys(jsonPnp)) {
            const entry = jsonPnp[name]
            for (const inst of entry.installation) {
                if (inst.type === 'modZip') {
                    expect.fail(
                        name,
                        undefined,
                        name +
                            ' in npDatase but not in input-locations' +
                            ' (did you run `npm run build`?)'
                    )
                }
            }
        }
    })
})
