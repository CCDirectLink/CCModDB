import semver from 'semver'
import crypto from 'crypto'
import { download, streamToBuffer } from './download'
import {
    ModMetadatasInput,
    ModMetadatas,
    addStarsAndTimestampsToResults,
    addReleasePages,
} from './source'
import type { PackageDB, InputLocation, InstallMethod, PkgCCMod, ValidPkgCCMod } from './types'
import { WriteFunc } from './main'

export async function build(packages: ModMetadatasInput[]): Promise<PackageDB> {
    const result: PackageDB = {}
    const promises: Promise<void>[] = []

    for (const [, { ccmod, inputs }] of groupByName(packages)) {
        if (ccmod && !checkCCMod(ccmod)) continue

        promises.push(buildEntry(result, ccmod, inputs))
    }

    await Promise.all(promises)
    // Both addStarsAndTimestampsToResults and addReleasePages use the GitHub api
    // so it shouldn't be done concurrently
    await addStarsAndTimestampsToResults(result)
    await addReleasePages(result)

    return result
}

export async function write(db: PackageDB, write: WriteFunc): Promise<void> {
    return write('npDatabase.json', JSON.stringify(db, null, 4))
}

export async function writeMinified(db: PackageDB, write: WriteFunc): Promise<void> {
    return write('npDatabase.min.json', JSON.stringify(db))
}

async function buildEntry(
    result: PackageDB,
    ccmod: ValidPkgCCMod,
    inputs: InputLocation[]
): Promise<void> {
    result[ccmod.id] = {
        metadataCCMod: ccmod,
        installation: await generateInstallations(inputs),
    }
}

function checkCCMod(ccmod: PkgCCMod): ccmod is ValidPkgCCMod {
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

async function generateInstallation(
    input: InputLocation
): Promise<InstallMethod[] | InstallMethod | undefined> {
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

function groupByName(
    packages: ModMetadatasInput[]
): Map<string, ModMetadatas & { inputs: InputLocation[] }> {
    const result = new Map<string, ModMetadatas & { inputs: InputLocation[] }>()

    for (const { ccmod, input } of packages) {
        for (const name of [ccmod!.id]) {
            if (result.has(name)) {
                result.get(name)?.inputs.push(input)
            } else {
                result.set(name, { ccmod, inputs: [input] })
            }
            break
        }
    }

    return result
}

export function sort(db: PackageDB): PackageDB {
    const result: PackageDB = {}
    for (const key of Object.keys(db).sort()) {
        result[key] = db[key]
    }
    return result
}
