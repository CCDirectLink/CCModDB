import stream from 'stream'
import yauzl from 'yauzl'
import { download, streamToBuffer } from './download'
import fs from 'fs'
import { getRepositoryEntry } from './db'
import * as github from '@octokit/openapi-types'

export type ModMetadatas = {
    ccmod?: PkgCCMod
    meta?: PkgMetadata
}
export type ModMetadatasInput = ModMetadatas & { input: InputLocation }

export async function get(input: InputLocation): Promise<ModMetadatasInput> {
    const fileFetchFunc: ((input: any, fileName: string, parseToJson?: boolean) => any) | 'error' =
        input.type === 'modZip'
            ? (input: ModZipInputLocation, fileName, parseToJson) => getModZipFile<PkgMetadata>(input, fileName, parseToJson)
            : input.type === 'ccmod'
            ? (input: CCModInputLocation, fileName, parseToJson) => getCCModFile<PkgMetadata>(input, fileName, parseToJson)
            : 'error'
    if (fileFetchFunc === 'error') throw new Error(`Unknown location type '${input.type}'`)

    let pkg
    try {
        pkg = {
            meta: await fileFetchFunc(input, 'package.json'),
            ccmod: await fileFetchFunc(input, 'ccmod.json'),
            input,
        }
    } catch (e) {
        console.log('Error while extracting', input)
        console.log(e)
        throw e
    }
    if (!pkg.ccmod && !pkg.meta) throw new Error(`A mod has to either have a package.json or a ccmod.json: ${input}`)
    const iconPath = getModIconPath(pkg)
    if (iconPath) {
        const imgData = await fileFetchFunc(input, iconPath, false)
        fs.writeFile(`../icons/${pkg.ccmod!.id}.png`, imgData, err => {
            if (err) throw err
        })
    }
    return pkg
}

function getModIconPath(pkg: ModMetadatasInput): string | undefined {
    const ccmod = pkg.ccmod
    if (!ccmod || !ccmod.icons || typeof ccmod.icons !== 'object' || !ccmod.icons['24']) return
    return ccmod.icons['24']
}

async function getModZipFile<T>(zip: ModZipInputLocation, fileName: string, parseToJson: boolean = true): Promise<T | undefined> {
    const file = await download(zip.urlZip)
    const buf = await streamToBuffer(file)
    if (buf.length === 0) return
    const archive = await open(buf)
    let stream
    stream = await openFile(archive, modZipPath(zip, fileName))
    if (!stream) return
    const raw = await streamToBuffer(stream)

    archive.close()

    if (!parseToJson) return raw as unknown as T
    return JSON.parse(raw as unknown as string) as T
}

function modZipPath(zip: ModZipInputLocation, fileName: string): string {
    if (fileName === 'package.json' && zip.packageJSONPath) {
        return zip.packageJSONPath
    }
    if (zip.source) {
        return `${zip.source}/${fileName}`
    }
    return fileName
}

async function getCCModFile<T>(ccmod: CCModInputLocation, fileName: string, parseToJson: boolean = true): Promise<T | undefined> {
    const file = await download(ccmod.url)
    const buf = await streamToBuffer(file)
    if (buf.length === 0) return
    const archive = await open(buf)
    const stream = await openFile(archive, fileName)
    if (!stream) return
    const raw = await streamToBuffer(stream)

    archive.close()

    if (!parseToJson) return raw as unknown as T
    return JSON.parse(raw as unknown as string) as T
}

function open(buffer: Buffer): Promise<yauzl.ZipFile> {
    return new Promise((resolve, reject) => {
        yauzl.fromBuffer(buffer, { autoClose: true, lazyEntries: true, decodeStrings: true }, (err, zip) => {
            if (err || !zip) {
                return reject(err)
            }
            resolve(zip)
        })
    })
}

function openFile(zip: yauzl.ZipFile, file: string): Promise<stream.Readable | undefined> {
    return new Promise((resolve, reject) => {
        zip.readEntry()
        zip.on('entry', (entry: yauzl.Entry) => {
            if (entry.fileName.endsWith('/')) {
                zip.readEntry()
            } else {
                if (entry.fileName === file) {
                    zip.openReadStream(entry, (err, result) => {
                        if (err || !result) {
                            return reject(err)
                        }
                        resolve(result)
                    })
                } else {
                    zip.readEntry()
                }
            }
        })
            .on('end', () => {
                resolve(undefined)
                return undefined
                // reject(new Error(`${file} not found`))
            })
            .on('error', err => reject(err))
    })
}

/* this has to be done outside of buildEntry to avoid concurent api requests */
export async function addStarsAndTimestampsToResults(result: PackageDB, oldDb?: PackageDB) {
    console.log('fetching stars and timestamps...')
    for (const id in result) {
        const mod = result[id]

        let fetchTimestamp = false
        let oldMod: Package | undefined
        if (oldDb) {
            const newVersion = mod.metadataCCMod?.version || mod.metadata?.version
            oldMod = oldDb[id]
            const oldVersion = oldMod.metadataCCMod?.version || oldMod.metadata?.version
            fetchTimestamp = oldVersion != newVersion || oldMod.lastUpdateTimestamp === undefined
        }

        const res = await getStarsAndTimestamp(mod.metadata, mod.metadataCCMod, fetchTimestamp)
        if (!res) continue
        mod.stars = res.stars

        if (!oldDb) continue
        mod.lastUpdateTimestamp = fetchTimestamp ? res.timestamp : oldMod!.lastUpdateTimestamp
    }
}

async function fetchGithub<T>(url: string): Promise<T> {
    const GITHUB_TOKEN = process.env['GITHUB_TOKEN']
    const data = await (
        await fetch(url, {
            method: 'GET',
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
            },
        })
    ).json()
    return data
}

async function getStarsAndTimestamp(
    meta: PkgMetadata | undefined,
    ccmod: PkgCCMod | undefined,
    fetchTimestamp: boolean
): Promise<{ stars: number; timestamp?: number } | undefined> {
    const homepageArr = getRepositoryEntry(ccmod?.repository || meta!.homepage)
    if (homepageArr.length == 0) return
    if (homepageArr.length > 1) throw new Error('Multi page star counting not supported')
    const { name, url } = homepageArr[0]
    if (name == 'GitHub') {
        const apiUrl = `https://api.github.com/repos/${url.substring('https://github.com/'.length)}`
        const data = await fetchGithub<github.components['schemas']['full-repository']>(apiUrl)
        const stars = data.stargazers_count

        let timestamp: number | undefined
        if (fetchTimestamp) {
            const branchApiUrl = data.branches_url.replace(/\{\/branch\}/, `/${data.default_branch}`)
            const branchData = await fetchGithub<github.components['schemas']['branch-with-protection']>(branchApiUrl)
            const date = branchData.commit.commit.author!.date!
            timestamp = new Date(date).getTime()
            console.log(url, date, timestamp)
        }
        return { stars, timestamp }
    }
    return
}
