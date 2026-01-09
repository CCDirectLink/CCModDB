import * as source from './source'
import * as db from './db'
import type { InputLocations, PackageDB } from './types'

import * as fs from 'fs'
import * as path from 'path'
import { configDotenv } from 'dotenv'
import { getRepoBranches, git, gitReadFunc } from './git'

export type ReadFunc = (path: string) => Promise<string | undefined>
export type WriteFunc = (path: string, data: Buffer | string) => Promise<void>

async function main() {
    configDotenv({ quiet: true })

    const GITHUB_TOKEN = process.env['GITHUB_TOKEN']
    if (!GITHUB_TOKEN)
        throw new Error(
            'GITHUB_TOKEN enviroment variable is required.\n' +
                'Add it to the .env file or export it.\n' +
                'To create a token, see https://github.com/settings/tokens?type=beta'
        )

    const branch: string = process.argv[2]

    let type: 'scratch' | undefined = process.argv[3] as any
    if (type != 'scratch' && type !== undefined) {
        throw new Error(`Invalid second arguemnt: "${type}"\n`)
    }

    const repoBranches = await getRepoBranches()
    if (!repoBranches.includes(branch)) {
        console.log(`Branch: ${branch} is invalid.\nAvailable branches: ${repoBranches.join(', ')}`)
        process.exit(1)
    }

    const toWrite: [string, Buffer][] = []
    const gitWriteFunc: WriteFunc = async (path: string, data) => {
        toWrite.push([path, typeof data === 'string' ? Buffer.from(data) : data])
    }

    await createNpDatabase(
        type == 'scratch',
        (path: string) => gitReadFunc(branch, path),
        gitWriteFunc
    )

    // console.log(toWrite.map(e => [e[0], e[1].toString()]).join('\n'))
    await git.checkout(branch)

    await Promise.all(
        toWrite.map(async ([filePath, buffer]) => {
            await fs.promises.mkdir(path.dirname(filePath), { recursive: true })
            return fs.promises.writeFile(filePath, buffer)
        })
    )
}

async function readInputLocations(
    read: ReadFunc
): Promise<{ locations: InputLocations; raw: string }> {
    const path = 'input-locations.json'
    const data = await read(path)
    if (!data) throw new Error(`input-locations.json doesn't exist on the target branch!`)
    return { locations: JSON.parse(data), raw: data }
}
async function readOldInputLocations(read: ReadFunc): Promise<InputLocations | undefined> {
    const path = 'input-locations.old.json'
    const data = await read(path)
    if (!data) return undefined
    return JSON.parse(data)
}

function getInputLocationsDiff(
    newl: InputLocations,
    oldl: InputLocations
): { toFetch: InputLocations; urlsToRemove: string[] } {
    const diffl: InputLocations = []
    const urls: Set<string> = new Set(oldl.map(e => e.url))
    const urlsToRemove: Set<string> = new Set([...urls])

    for (let i = 0; i < newl.length; i++) {
        const newE = newl[i]
        if (!urls.has(newE.url)) {
            diffl.push(newE)
        } else {
            urlsToRemove.delete(newE.url)
        }
    }
    return { toFetch: diffl, urlsToRemove: [...urlsToRemove] }
}

async function getPackageDb(read: ReadFunc): Promise<PackageDB | undefined> {
    const data = await read('npDatabase.json')
    if (!data) return undefined
    return JSON.parse(data)
}

function databaseToUrlRecord(db: PackageDB): Record<string, string[]> {
    const urlToDbKey: Record<string, string[]> = {}
    for (const dbKey in db) {
        const entry = db[dbKey]
        for (const { url } of entry.installation) {
            urlToDbKey[url] ??= []
            urlToDbKey[url].push(dbKey)
        }
    }
    return urlToDbKey
}

async function createNpDatabase(fromScratch: boolean, read: ReadFunc, write: WriteFunc) {
    const { locations, raw: locationsStr } = await readInputLocations(read)

    let dbToMerge: PackageDB = {}
    let inputLocationsToFetch: InputLocations = []

    nonFromScratchIf: if (!fromScratch) {
        const oldLocations = await readOldInputLocations(read)
        if (!oldLocations) {
            fromScratch = true
            break nonFromScratchIf
        }
        const oldDb = await getPackageDb(read)
        if (!oldDb) {
            fromScratch = true
            break nonFromScratchIf
        }

        const { toFetch, urlsToRemove } = getInputLocationsDiff(locations, oldLocations)

        inputLocationsToFetch = toFetch
        dbToMerge = oldDb

        const urlToDbKey = databaseToUrlRecord(dbToMerge)
        for (const url of urlsToRemove) {
            for (const key of urlToDbKey[url] ??
                [] /* <- this only happens when input-locations.old.json gets changed as a part of a ccbot commit*/) {
                delete dbToMerge[key]
            }
        }
    }

    if (fromScratch) {
        inputLocationsToFetch = locations
    }
    const promises: Promise<source.ModMetadatasInput>[] = []
    for (const loc of inputLocationsToFetch) {
        promises.push(source.get(loc, write))
    }
    const packages = await Promise.all(promises)

    const pkgDb = await db.build(packages)

    const mergedDb = db.sort(Object.assign(dbToMerge, pkgDb))
    await Promise.all([
        db.write(mergedDb, write),
        db.writeMinified(mergedDb, write),
        write('input-locations.old.json', locationsStr),
    ])

    console.log(JSON.stringify(pkgDb, null, 4))
}

main().catch(err => console.error('error: ', err))
