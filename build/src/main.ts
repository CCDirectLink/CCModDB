import * as source from './source'
import * as db from './db'
import type { InputLocation, PackageDB } from './types'

import * as fs from 'fs'
import * as path from 'path'
import { getRepoBranches, git, gitReadFunc } from './git'
import { readPackageDb, readInputLocations, type ReadFunc, type WriteFunc } from './fs-util'

async function main() {
    const GITHUB_TOKEN = process.env['GITHUB_TOKEN']
    if (!GITHUB_TOKEN)
        throw new Error(
            'GITHUB_TOKEN environment variable is required.\n' +
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

async function createNpDatabase(fromScratch: boolean, read: ReadFunc, write: WriteFunc) {
    const locations = await readInputLocations(read)

    let dbToMerge: PackageDB = {}
    let inputLocationsToFetch: InputLocation[] = []

    const oldDb = await readPackageDb(read)
    if (oldDb) {
        dbToMerge = oldDb
    } else {
        fromScratch = true
    }

    if (fromScratch) {
        inputLocationsToFetch = Object.values(locations)
    } else {
        for (const modId in locations) {
            const loc = locations[modId]
            if (loc.type === undefined || loc.type == 'zip') {
                if (loc.changed) inputLocationsToFetch.push(loc)
            }
        }
        for (const modId in oldDb) {
            if (!locations[modId]) delete oldDb[modId]
        }
    }

    const packages = await Promise.all(inputLocationsToFetch.map(loc => source.get(loc, write)))

    const pkgDb = await db.build(packages)

    const mergedDb = db.sort(Object.assign(dbToMerge, pkgDb))
    await Promise.all([db.write(mergedDb, write), db.writeMinified(mergedDb, write)])

    console.log(JSON.stringify(pkgDb, null, 4))
}

main()
