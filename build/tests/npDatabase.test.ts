import { expect, test, describe } from 'bun:test'
import semver from 'semver'
import crypto from 'crypto'
import { download, streamToBuffer } from '../src/download'
import {
    type DatabaseInfo,
    type InstallMethodExternalTool,
    type InstallMethodZip,
    type Package,
    type PackageDB,
    type PkgCCMod,
    ValidTags,
} from '../src/types'
import { getRepoBranches, gitReadFunc } from '../src/git'

async function loadNpDatabases() {
    const branch = process.env['BRANCH']!

    const npDatabasePromise = gitReadFunc(branch, 'npDatabase.min.json').then(
        data => JSON.parse(data!) as PackageDB
    )

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
                throw new Error(
                    `Invalid parent repo npDatatabase.min.json url: "${name}"`,
                    e as Error
                )
            }
        }

        const parentDbs = await Promise.all(parentBranches.map(getParentPackageDb))

        const merged = parentDbs.reduce((acc, v) => Object.assign(acc, JSON.parse(v)), {})
        resolve(merged)
    })

    return Promise.all([npDatabasePromise, parentNpDatabasesPromise])
}
const [npDatabase, parentNpDatabases] = await loadNpDatabases()

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

            expect(
                mod.metadataCCMod !== undefined,
                'metadataCCMod (type: object) required'
            ).toBeTrue()

            expect(
                typeof mod.installation === 'object',
                'installation (type: array) required'
            ).toBeTrue()
            expect(
                Array.isArray(mod.installation),
                'installation (type: array) required'
            ).toBeTrue()
            expect(mod.installation !== null, 'installation (type: array) required').toBeTrue()
        })

        if (!mod) return

        if (mod.metadataCCMod) testMetadataCCMod(mod.metadataCCMod)
        if (mod.installation) testInstallation(mod)
    })
}

/**
 * Mod dependencies to skip while checking if a mod has all it's dependencies in the database
 */
const skipTheseModDependencies = [
    'crosscode',
    'simplify',
    // https://github.com/CCDirectLink/CCLoader3/blob/edb3481d9ea504e2c7f7fe46709ab2b4a7f2ce0b/src/game.ts#L9-L17
    'fish-gear',
    'flying-hedgehag',
    'manlea',
    'ninja-skin',
    'post-game',
    'scorpion-robo',
    'snowman-tank',
]
/**
 * Searches databases for a dependency by it's id and title
 * @param {string} depName - Name of a dependency to look for
 */
function findDependency(depName: string) {
    for (const db of [npDatabase, parentNpDatabases].filter(Boolean)) {
        if (db[depName]) return db[depName]

        const dep = Object.values(db).find(mod => mod.metadataCCMod?.title == depName)
        if (dep) return dep
    }
}

/* see https://github.com/CCDirectLink/CCLoader3/issues/18 for details */
const ccmodIdValidationExceptions: string[] = [
    'CrossCode Map Editor',
    "Azure's Adjustments",
    'Boki Colors',
    'CCLoader display version',
    'CrossCode C Edition',
    'New game++',
]
function testMetadataCCMod(ccmod: PkgCCMod) {
    test('ccmod.json', () => {
        expect(typeof ccmod.id === 'string', 'ccmod.id (type: string) required').toBeTrue()

        expect(
            ccmod.id.length > 0 &&
                (/^[a-zA-Z0-9_-]+$/.test(ccmod.id) ||
                    ccmodIdValidationExceptions.includes(ccmod.id)),
            'ccmod.id (type: string) must consist only of one or more alphanumberic characters, hyphens or underscores'
        ).toBeTrue()

        expect(
            typeof ccmod.version === 'string' && semver.valid(ccmod.version) !== null,
            'ccmod.version (type: string) is missing or isnt valid semver'
        ).toBeTrue()

        expect(
            typeof ccmod.title === 'string' || typeof ccmod.title === 'object',
            'ccmod.title (type: string) is missing or has wrong type'
        ).toBeTrue()
        expect(
            ccmod.description !== undefined &&
                (typeof ccmod.description === 'string' || typeof ccmod.description === 'object'),
            'ccmod.description (type: string) is missing or has wrong type'
        ).toBeTrue()
        expect(
            ccmod.homepage === undefined || typeof ccmod.homepage === 'string',
            'ccmod.homepage (type: string) has wrong type'
        ).toBeTrue()

        expect(
            typeof ccmod.repository === 'string' && ccmod.repository.length > 0,
            'ccmod.repository (type: string) is missing, is empty or has wrong type'
        ).toBeTrue()

        expect(
            ccmod.tags !== undefined && Array.isArray(ccmod.tags),
            'ccmod.tags (type: array) is missing or has wrong type'
        ).toBeTrue()

        const tags = (ccmod.tags ?? []).sort()
        for (let i = 0; i < tags.length; i++) {
            const tag = tags[i]
            expect(
                ValidTags.includes(tag),
                `ccmod.tags (type: array) has an invalid tag: "${tag}"`
            ).toBeTrue()
            expect(
                tags[i - 1] != tag,
                `ccmod.tags (type: array) has a duplicate tag: "${tag}"`
            ).toBeTrue()
        }

        expect(
            ccmod.authors !== undefined && Array.isArray(ccmod.tags),
            'ccmod.authors (type: array) is missing or has wrong type'
        ).toBeTrue()
    })

    if (ccmod.dependencies) {
        test('mod dependencies', () => {
            expect(!ccmod.dependencies || typeof ccmod.dependencies == 'object').toBeTrue()

            expect(
                typeof ccmod.dependencies === 'object',
                'ccmod.dependencies (type: object) must be an object'
            ).toBeTrue()
            expect(
                Array.isArray(ccmod.dependencies),
                'ccmod.dependencies (type: object) must be an object'
            ).toBeFalse()
            expect(
                ccmod.dependencies !== null,
                'ccmod.dependencies (type: object) must be an object'
            ).toBeTrue()

            for (const depId in ccmod.dependencies!) {
                const requiredVersionRange = ccmod.dependencies![depId]
                expect(
                    semver.validRange(requiredVersionRange),
                    `dependency ${depId} must be specify a valid range`
                ).toBeTruthy()

                if (skipTheseModDependencies.includes(depId.toLowerCase())) continue

                const dep = findDependency(depId)
                expect(dep, `dependency ${depId} must be registered in CCModDb`).toBeTruthy()

                if (dep) {
                    const depDatabaseVersion = dep.metadataCCMod!.version
                    expect(
                        semver.satisfies(depDatabaseVersion, requiredVersionRange, {
                            includePrerelease: true,
                        }),
                        `the version of the dependency ${depId} (database version: ${depDatabaseVersion}) does not satisfy the required range: ${requiredVersionRange}`
                    ).toBeTrue()
                }
            }
        })
    }
}

function testInstallation(mod: Package) {
    for (let i = 0; i < mod.installation.length; i++) {
        const inst = mod.installation[i]
        test(`installation ${i}`, async () => {
            expect(
                typeof inst === 'object',
                'installation (type: object) must be an object'
            ).toBeTrue()
            expect(Array.isArray(inst), 'installation (type: object) must be an object').toBeFalse()
            expect(inst !== null, 'installation (type: object) must be an object').toBeTrue()

            expect(
                ['zip', 'externaltool', undefined].includes(inst.type),
                'installation.type (type: string) must be one of: ["zip", "externaltool", undefined]'
            ).toBeTrue()

            expect(
                inst.platform === undefined ||
                    [
                        'aix',
                        'darwin',
                        'freebsd',
                        'linux',
                        'openbsd',
                        'sunos',
                        'win32',
                        'android',
                    ].includes(inst.platform),
                'installation.platform (type: string) must be a valid platform'
            ).toBeTrue()

            switch ((inst as InstallMethodZip | InstallMethodExternalTool).type) {
                case 'externaltool':
                case 'zip':
                    await testZip(inst)
                    break
            }
        }, 100e3)
    }
}

async function testZip(modzip: InstallMethodZip) {
    expect(
        typeof modzip.hash === 'object',
        'modzip.hash (type: object) must be an object'
    ).toBeTrue()
    expect(Array.isArray(modzip.hash), 'modzip.hash (type: object) must be an object').toBeFalse()
    expect(modzip.hash !== null, 'modzip.hash (type: object) must be an object').toBeTrue()
    expect(
        typeof modzip.hash.sha256 === 'string',
        'modzip.hash.sha256 (type: string) must be a string'
    ).toBeTrue()

    expect(typeof modzip.url === 'string', 'modzip.url (type: string) must be a string').toBeTrue()
    expect(
        modzip.source === undefined || typeof modzip.source === 'string',
        'modzip.source (type: string) must be a string'
    ).toBeTrue()

    if (modzip.url) {
        const hash = await getHash(modzip.url)
        expect(modzip.hash.sha256.toLowerCase(), 'hash must match').toEqual(hash)
    }
}

async function getHash(url: string) {
    const file = await download(url)
    const buf = await streamToBuffer(file)
    return crypto.createHash('sha256').update(buf).digest('hex')
}
