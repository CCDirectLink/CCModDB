import { expect, test, describe } from 'bun:test'
import crypto from 'crypto'
import { download } from '../src/download'
import {
    type DatabaseInfo,
    type InstallMethodExternalTool,
    type InstallMethodZip,
    type Package,
    type PackageDB,
} from '../src/types'
import { getRepoBranches, gitReadFunc } from '../src/git'
import { CCModChecker } from './ccmod-check'

async function loadNpDatabases() {
    const branch = process.env['BRANCH']
    if (!branch) throw new Error('enviroment variable BRANCH is not set!')

    const npDatabasePromise = gitReadFunc(branch, 'npDatabase.min.json').then(data => JSON.parse(data!) as PackageDB)

    const parentNpDatabasesPromise = new Promise<PackageDB>(async resolve => {
        const dbInfo: DatabaseInfo = JSON.parse((await gitReadFunc(branch, 'db-info.json'))!)
        const parentBranches = dbInfo.parentBranches
        if (!parentBranches) return resolve({})

        const repoBranches = await getRepoBranches()

        async function getParentPackageDb(name: string): Promise<string> {
            if (repoBranches.includes(name)) {
                const data = await gitReadFunc(name, 'npDatabase.min.json')
                if (!data) throw new Error(`npDatabase.min.json not found on branch "${name}"`)
                return data
            }

            try {
                return (await fetch(name)).text()
            } catch (e) {
                throw new Error(`Invalid parent repo npDatatabase.min.json url: "${name}"`, e as Error)
            }
        }

        const parentDbs = await Promise.all(parentBranches.map(getParentPackageDb))

        const merged = parentDbs.reduce((acc, v) => Object.assign(acc, JSON.parse(v)), {})
        resolve(merged)
    })

    return Promise.all([npDatabasePromise, parentNpDatabasesPromise])
}
const [npDatabase, parentNpDatabases] = await loadNpDatabases()
const ccmodChecker = new CCModChecker([npDatabase, parentNpDatabases], test, expect)

describe('NpDatabase', () => {
    test('json structure', async () => {
        expect(typeof npDatabase === 'object', 'Json not valid: Not an object').toBeTrue()
        expect(Array.isArray(npDatabase), 'Json not valid: Not an object').toBeFalse()
        expect(npDatabase !== null, 'Json not valid: Not an object').toBeTrue()
    })

    describe('mods', () => {
        for (const mod of Object.keys(npDatabase)) {
            testPackage(npDatabase[mod], mod)
        }
    })
})

if (!process.env['donttesttools']) {
    const branch = process.env['BRANCH']!
    const tools = await gitReadFunc(branch, 'tools.json').then(data => {
        if (!data) throw new Error(`tools.json not found on branch ${branch}`)
        return JSON.parse(data!) as PackageDB
    })

    describe('ToolsDB', async () => {
        test('json structure', async () => {
            expect(typeof tools === 'object', 'Json not valid: Not an object').toBeTrue()
            expect(Array.isArray(tools), 'Json not valid: Not an object').toBeFalse()
            expect(tools !== null, 'Json not valid: Not an object').toBeTrue()
        })

        describe('tools', () => {
            for (const mod of Object.keys(tools)) {
                testPackage(tools[mod], mod)
            }
        })
    })
}

export function testPackage(mod: Package, name: string) {
    describe(name, () => {
        test('required elements', () => {
            expect(mod !== null, 'package must not be null').toBeTrue()

            expect(mod.metadataCCMod !== undefined, 'metadataCCMod (type: object) required').toBeTrue()

            expect(typeof mod.installation === 'object', 'installation (type: array) required').toBeTrue()
            expect(Array.isArray(mod.installation), 'installation (type: array) required').toBeTrue()
            expect(mod.installation !== null, 'installation (type: array) required').toBeTrue()
        })

        if (!mod) return

        if (mod.metadataCCMod) ccmodChecker.testMetadataCCMod(mod.metadataCCMod)
        if (mod.installation) testInstallation(mod)
    })
}

function testInstallation(mod: Package) {
    for (let i = 0; i < mod.installation.length; i++) {
        const inst = mod.installation[i]
        test(
            `installation ${i}`,
            async () => {
                expect(typeof inst === 'object', 'installation (type: object) must be an object').toBeTrue()
                expect(Array.isArray(inst), 'installation (type: object) must be an object').toBeFalse()
                expect(inst !== null, 'installation (type: object) must be an object').toBeTrue()

                expect(
                    ['zip', 'externaltool', undefined].includes(inst.type),
                    'installation.type (type: string) must be one of: ["zip", "externaltool", undefined]'
                ).toBeTrue()

                expect(
                    inst.platform === undefined ||
                        ['aix', 'darwin', 'freebsd', 'linux', 'openbsd', 'sunos', 'win32', 'android'].includes(
                            inst.platform
                        ),
                    'installation.platform (type: string) must be a valid platform'
                ).toBeTrue()

                switch ((inst as InstallMethodZip | InstallMethodExternalTool).type) {
                    case 'externaltool':
                    case 'zip':
                        await testZip(inst)
                        break
                }
            },
            { timeout: 100e3, retry: 3 }
        )
    }
}

async function testZip(modzip: InstallMethodZip) {
    expect(typeof modzip.hash === 'object', 'modzip.hash (type: object) must be an object').toBeTrue()
    expect(Array.isArray(modzip.hash), 'modzip.hash (type: object) must be an object').toBeFalse()
    expect(modzip.hash !== null, 'modzip.hash (type: object) must be an object').toBeTrue()
    expect(typeof modzip.hash.sha256 === 'string', 'modzip.hash.sha256 (type: string) must be a string').toBeTrue()

    expect(typeof modzip.url === 'string', 'modzip.url (type: string) must be a string').toBeTrue()
    expect(
        modzip.source === undefined || typeof modzip.source === 'string',
        'modzip.source (type: string) must be a string'
    ).toBeTrue()

    if (modzip.url) {
        const buf = await download(modzip.url)
        const hash = await getHash(buf)
        expect(modzip.hash.sha256.toLowerCase(), 'hash must match').toEqual(hash)
    }
}

async function getHash(buf: Buffer) {
    return crypto.createHash('sha256').update(buf).digest('hex')
}
