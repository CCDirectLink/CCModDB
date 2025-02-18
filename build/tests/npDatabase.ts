// call with mocha
// require chai

import { expect } from 'chai'
import semver from 'semver'
import crypto from 'crypto'
import { download, streamToBuffer } from '../src/download'
import {
    DatabaseInfo,
    InstallMethodExternalTool,
    InstallMethodZip,
    Package,
    PackageDB,
    PkgCCMod,
    ValidTags,
} from '../src/types'
import { getRepoBranches, gitReadFunc } from '../src/git'

const branch = process.env['BRANCH']!

let npDatabase: PackageDB
const npDatabasePromise = gitReadFunc(branch, 'npDatabase.min.json').then(data => {
    npDatabase = JSON.parse(data!)
})

let parentNpDatabases: PackageDB
const parentNpDatabasesPromise = new Promise<void>(async resolve => {
    const dbInfo: DatabaseInfo = JSON.parse((await gitReadFunc(branch, 'db-info.json'))!)
    const parentBranches = dbInfo.parentBranches
    if (!parentBranches) return resolve()

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

    parentNpDatabases = merged

    resolve()
})

describe('NpDatabase', () => {
    it('Check json structure', async () => {
        await npDatabasePromise
        await parentNpDatabasesPromise

        expect(typeof npDatabase === 'object', 'Json not valid: Not an object').to.be.true
        expect(Array.isArray(npDatabase), 'Json not valid: Not an object').to.be.false
        expect(npDatabase !== null, 'Json not valid: Not an object').to.be.true
    })

    parentNpDatabases = {}
    describe('mods', async () => {
        await npDatabasePromise
        await parentNpDatabasesPromise

        for (let mod of Object.keys(npDatabase)) {
            testPackage(npDatabase[mod], mod)
        }
    })
})

if (!process.env['donttesttools']) {
    let tools: PackageDB
    const toolsPromise = new Promise<void>((resolve, reject) => {
        const branch = process.env['BRANCH']!
        gitReadFunc(branch, 'tools.json')
            .then(data => {
                if (!data) return reject(`tools.json not found on branch ${branch}`)
                tools = JSON.parse(data!)
                resolve()
            })
            .catch(err => reject(err))
    })

    describe('ToolsDB', async () => {
        it('Check json structure', async () => {
            await toolsPromise

            expect(typeof tools === 'object', 'Json not valid: Not an object').to.be.true
            expect(Array.isArray(tools), 'Json not valid: Not an object').to.be.false
            expect(tools !== null, 'Json not valid: Not an object').to.be.true
        })

        describe('tools', async () => {
            await toolsPromise

            for (const mod of Object.keys(tools)) {
                testPackage(tools[mod], mod)
            }
        })
    })
}

export function testPackage(mod: Package, name: string) {
    describe(`Package: ${name}`, () => {
        it('Check for required elements', () => {
            expect(mod !== null, 'package must not be null').to.be.true

            expect(mod.metadataCCMod !== undefined, 'metadataCCMod (type: object) required').to.be
                .true

            expect(typeof mod.installation === 'object', 'installation (type: array) required').to
                .be.true
            expect(Array.isArray(mod.installation), 'installation (type: array) required').to.be
                .true
            expect(mod.installation !== null, 'installation (type: array) required').to.be.true
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

function testMetadataCCMod(ccmod: PkgCCMod) {
    it('Test ccmod.json', () => {
        expect(typeof ccmod.id === 'string', 'ccmod.id (type: string) required').to.be.true

        expect(
            typeof ccmod.version === 'string' && semver.valid(ccmod.version) !== null,
            'ccmod.version (type: string) is missing or isnt valid semver'
        ).to.be.true

        expect(
            typeof ccmod.title === 'string' || typeof ccmod.title === 'object',
            'ccmod.title (type: string) is missing or has wrong type'
        ).to.be.true
        expect(
            ccmod.description !== undefined &&
                (typeof ccmod.description === 'string' || typeof ccmod.description === 'object'),
            'ccmod.description (type: string) is missing or has wrong type'
        ).to.be.true
        expect(
            ccmod.homepage === undefined || typeof ccmod.homepage === 'string',
            'ccmod.homepage (type: string) has wrong type'
        ).to.be.true

        expect(
            typeof ccmod.repository === 'string' && ccmod.repository.length > 0,
            'ccmod.repository (type: string) is missing, is empty or has wrong type'
        ).to.be.true

        expect(
            ccmod.tags !== undefined && Array.isArray(ccmod.tags),
            'ccmod.tags (type: array) is missing or has wrong type'
        ).to.be.true

        const tags = (ccmod.tags ?? []).sort()
        for (let i = 0; i < tags.length; i++) {
            const tag = tags[i]
            expect(ValidTags.includes(tag), `ccmod.tags (type: array) has an invalid tag: "${tag}"`)
                .to.be.true
            expect(tags[i - 1] != tag, `ccmod.tags (type: array) has a duplicate tag: "${tag}"`).to
                .be.true
        }

        expect(
            ccmod.authors !== undefined && Array.isArray(ccmod.tags),
            'ccmod.authors (type: array) is missing or has wrong type'
        ).to.be.true
    })

    if (ccmod.dependencies) {
        it('Test check dependencies', () => {
            expect(
                typeof ccmod.dependencies === 'object',
                'ccmod.dependencies (type: object) must be an object'
            ).to.be.true
            expect(
                Array.isArray(ccmod.dependencies),
                'ccmod.dependencies (type: object) must be an object'
            ).to.be.false
            expect(
                ccmod.dependencies !== null,
                'ccmod.dependencies (type: object) must be an object'
            ).to.be.true

            for (const depId in ccmod.dependencies!) {
                const requiredVersionRange = ccmod.dependencies![depId]
                expect(
                    semver.validRange(requiredVersionRange),
                    `dependency ${depId} must be specify a valid range`
                ).to.not.be.null

                if (skipTheseModDependencies.includes(depId.toLowerCase())) continue

                const dep = findDependency(depId)
                expect(dep, `dependency ${depId} must be registered in CCModDb`).to.not.be.undefined

                if (dep) {
                    const depDatabaseVersion = dep.metadataCCMod!.version
                    expect(
                        semver.satisfies(depDatabaseVersion, requiredVersionRange),
                        `the version of the dependency ${depId} (database version: ${depDatabaseVersion}) does not satisfy the required range: ${requiredVersionRange}`
                    ).to.be.true
                }
            }
        })
    } else {
        expect(ccmod.dependencies === undefined, 'ccmod.dependencies must not be used').to.be.true
    }
}

function testInstallation(mod: Package) {
    for (let i = 0; i < mod.installation.length; i++) {
        const inst = mod.installation[i]
        it(`Check installation ${i}`, async () => {
            expect(typeof inst === 'object', 'installation (type: object) must be an object').to.be
                .true
            expect(Array.isArray(inst), 'installation (type: object) must be an object').to.be.false
            expect(inst !== null, 'installation (type: object) must be an object').to.be.true

            expect(
                ['zip', 'externaltool', undefined].includes(inst.type),
                'installation.type (type: string) must be one of: ["zip", "externaltool", undefined]'
            ).to.be.true

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
            ).to.be.true

            switch ((inst as InstallMethodZip | InstallMethodExternalTool).type) {
                case 'externaltool':
                case 'zip':
                    await testZip(inst)
                    break
            }
        }).timeout(100e3)
    }
}

async function testZip(modzip: InstallMethodZip) {
    expect(typeof modzip.hash === 'object', 'modzip.hash (type: object) must be an object').to.be
        .true
    expect(Array.isArray(modzip.hash), 'modzip.hash (type: object) must be an object').to.be.false
    expect(modzip.hash !== null, 'modzip.hash (type: object) must be an object').to.be.true
    expect(
        typeof modzip.hash.sha256 === 'string',
        'modzip.hash.sha256 (type: string) must be a string'
    ).to.be.true

    expect(typeof modzip.url === 'string', 'modzip.url (type: string) must be a string').to.be.true
    expect(
        modzip.source === undefined || typeof modzip.source === 'string',
        'modzip.source (type: string) must be a string'
    ).to.be.true

    if (modzip.url) {
        const hash = await getHash(modzip.url)
        expect(modzip.hash.sha256.toLowerCase()).to.equal(hash, 'hash must match')
    }
}

async function getHash(url: string) {
    const file = await download(url)
    const buf = await streamToBuffer(file)
    return crypto.createHash('sha256').update(buf).digest('hex')
}
