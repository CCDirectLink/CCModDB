import semver from 'semver'
import crypto from 'crypto'
import fs from 'fs'
import { download, streamToBuffer } from './download'
import { ModMetadatasInput, ModMetadatas, addStarsAndTimestampsToResults } from './source'
import type { LocalizedString, PackageDB, Page, InputLocation, InstallMethod, InstallMethodZip, PkgMetadata, PkgCCMod } from './types'

interface ModDb {
    [name: string]: {
        name: string
        description: string
        license?: string
        page: Page[]
        archive_link: string
        hash: {
            sha256: string
        }
        version: string
    }
}

export async function build(packages: ModMetadatasInput[], oldDb?: PackageDB): Promise<PackageDB> {
    const result: PackageDB = {}
    const promises: Promise<void>[] = []

    for (const [, { meta, ccmod, inputs }] of groupByName(packages)) {
        if (ccmod && !checkCCMod(ccmod)) continue
        if (meta && !checkMeta(meta)) continue

        promises.push(buildEntry(result, meta, ccmod, inputs))
    }

    await Promise.all(promises)
    await addStarsAndTimestampsToResults(result, oldDb)

    return sort(result)
}

export async function write(db: PackageDB): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        fs.writeFile('./npDatabase.json', JSON.stringify(db, null, 4), err => {
            if (err) {
                return reject(err)
            }
            resolve()
        })
    })
}

export async function writeMods(db: PackageDB): Promise<void> {
    const mods: ModDb = {}

    for (const name of Object.keys(db)) {
        const pkg = db[name]
        const meta = pkg.metadata
        const ccmod = pkg.metadataCCMod

        if (meta?.ccmodType === 'base' || meta?.ccmodType === 'tool') continue

        const install = getInstallation(pkg.installation)
        if (!install) continue

        mods[name] = {
            name: getStringFromLocalisedString(ccmod?.title || meta?.ccmodHumanName || name),
            description: getStringFromLocalisedString(
                ccmod?.description ||
                    meta?.description ||
                    'A mod. (Description not available; contact mod author and have them add a description to their package.json file)'
            ),
            license: ccmod?.license || meta?.license,
            page: getRepositoryEntry(ccmod?.repository || ccmod?.homepage || meta?.homepage) /* old field, should be unused, kept for compatibility */,
            archive_link: install.url,
            hash: install.hash,
            version: ccmod?.version || meta?.version || 'unknown',
        }
    }

    return new Promise<void>((resolve, reject) => {
        fs.writeFile('./mods.json', JSON.stringify({ mods }, null, 4), err => {
            if (err) {
                return reject(err)
            }
            resolve()
        })
    })
}

export function getRepositoryEntry(url?: string): Page[] {
    if (!url) {
        return []
    }

    let name: string
    switch (new URL(url).hostname) {
        case 'github.com':
            name = 'GitHub'
            break
        case 'gitlab.com':
            name = 'GitLab'
            break
        default:
            name = "mod's homepage"
    }

    return [{ name, url }]
}

export function getStringFromLocalisedString(str: LocalizedString): string {
    if (!str) throw new Error(`No mod name found: ${str}`)
    if (typeof str === 'string') return str
    const newStr = str.en_US
    if (!newStr) throw new Error(`No english mod name found: ${str}`)
    return newStr
}

function getInstallation(installations: InstallMethod[]): { url: string; hash: { sha256: string } } | undefined {
    const zip = installations.find(i => i.type === 'zip') as InstallMethodZip
    if (zip) {
        return { url: zip.url, hash: zip.hash }
    }

    return undefined
}

async function buildEntry(result: PackageDB, meta: PkgMetadata | undefined, ccmod: PkgCCMod | undefined, inputs: InputLocation[]): Promise<void> {
    result[ccmod?.id || meta!.name] = {
        // metadata: meta,
        metadataCCMod: ccmod,
        installation: await generateInstallations(inputs),
    }
}

function checkMeta(meta: PkgMetadata): boolean {
    if (meta.dependencies && !meta.ccmodDependencies) {
        console.warn(`Package has 'dependencies', not 'ccmodDependencies': ${meta.name}; correct ASAP`)
        return false
    }

    if (meta.ccmodDependencies) {
        if (meta.ccmodDependencies.constructor !== Object) {
            console.warn(`Package has dependencies not an object: ${meta.name}`)
            return false
        }

        for (let dep in meta.ccmodDependencies) {
            if (semver.validRange(meta.ccmodDependencies[dep]) === null) {
                console.warn(`Package has invalid constraint: ${meta.name}`)
                return false
            }
        }
    }

    if (!meta.version) {
        console.warn(`Package is missing version: ${meta.name}`)
        return false
    }

    if (semver.parse(meta.version) == null) {
        console.warn(`Package version invalid: ${meta.name}`)
        return false
    }

    return true
}

function checkCCMod(ccmod: PkgCCMod): boolean {
    if (ccmod.dependencies) {
        if (ccmod.dependencies.constructor !== Object) {
            console.warn(`Package has dependencies not an object: ${ccmod.id}`)
            return false
        }

        for (let dep in ccmod.dependencies) {
            if (semver.validRange(ccmod.dependencies[dep]) === null) {
                console.warn(`Package has invalid constraint: ${ccmod.id}`)
                return false
            }
        }
    }

    if (!ccmod.version) {
        console.warn(`Package is missing version: ${ccmod.id}`)
        return false
    }

    if (semver.parse(ccmod.version) == null) {
        console.warn(`Package version invalid: ${ccmod.id}`)
        return false
    }

    return true
}

async function generateInstallations(inputs: InputLocation[]): Promise<InstallMethod[]> {
    const result = []

    for (const input of inputs) {
        const install = await generateInstallation(input)
        if (install) {
            if (install instanceof Array) {
                result.push(...install)
            } else {
                result.push(install)
            }
        }
    }

    return result
}

async function generateInstallation(input: InputLocation): Promise<InstallMethod[] | InstallMethod | undefined> {
    switch (input.type) {
        case undefined:
        case 'zip': {
            const data = await streamToBuffer(await download(input.url))

            return {
                type: 'zip',
                url: input.url,
                source: input.source,
                hash: {
                    sha256: crypto.createHash('sha256').update(data).digest('hex'),
                },
            }
        }
        default:
            throw new Error('Unsupported type: ' + input.type)
    }
}

function groupByName(packages: ModMetadatasInput[]): Map<string, ModMetadatas & { inputs: InputLocation[] }> {
    const result = new Map<string, ModMetadatas & { inputs: InputLocation[] }>()

    for (const { meta: pkg, ccmod, input } of packages) {
        for (const name of [ccmod?.id, pkg?.name, 'nomodlikethiseverwillexist'].filter(Boolean) as string[]) {
            if (name == 'nomodlikethiseverwillexist') throw new Error(packages.join())
            if (result.has(name)) {
                result.get(name)?.inputs.push(input)
            } else {
                result.set(name, { meta: pkg, ccmod, inputs: [input] })
            }
            break
        }
    }

    return result
}

function sort(db: PackageDB): PackageDB {
    const result: PackageDB = {}
    for (const key of Object.keys(db).sort()) {
        result[key] = db[key]
    }
    return result
}
