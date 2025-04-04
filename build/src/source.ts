import stream from 'stream'
import yauzl from 'yauzl'
import { download, streamToBuffer } from './download'
import path from 'path'
import * as github from '@octokit/openapi-types'
import type {
    InputLocation,
    PackageDB,
    ReleasePage,
    ValidPkgCCMod,
    ZipInputLocation,
} from './types'
import { getRepositoryEntry } from './api'
import { WriteFunc } from './main'
import * as semver from 'semver'

export type ModMetadatas = {
    ccmod: ValidPkgCCMod
}
export type ModMetadatasInput = ModMetadatas & { input: InputLocation }

export async function get(input: InputLocation, write: WriteFunc): Promise<ModMetadatasInput> {
    const fileFetchFunc: ((input: any, fileName: string, parseToJson?: boolean) => any) | 'error' =
        input.type === undefined || input.type === 'zip'
            ? (input: ZipInputLocation, fileName, parseToJson) =>
                  getModZipFile(input, fileName, parseToJson)
            : 'error'
    if (fileFetchFunc === 'error') throw new Error(`Unsupported location type '${input.type}'`)

    let pkg
    try {
        pkg = {
            ccmod: await fileFetchFunc(input, 'ccmod.json'),
            input,
        }
    } catch (e) {
        console.log('Error while extracting', input)
        console.log(e)
        throw e
    }
    if (!pkg.ccmod) throw new Error(`A mod has to have a ccmod.json: ${input.url}`)
    const iconPath = getModIconPath(pkg)
    if (iconPath) {
        const imgData = await fileFetchFunc(input, iconPath, false)
        await write(`icons/${pkg.ccmod!.id}.png`, imgData)
    }
    return pkg
}

function getModIconPath(pkg: ModMetadatasInput): string | undefined {
    const ccmod = pkg.ccmod
    if (!ccmod || !ccmod.icons || typeof ccmod.icons !== 'object' || !ccmod.icons['24']) return
    return ccmod.icons['24']
}

async function getModZipFile<T>(
    zip: ZipInputLocation,
    fileName: string,
    parseToJson: boolean = true
): Promise<T | undefined> {
    const file = await download(zip.url)
    const buf = await streamToBuffer(file)
    if (buf.length === 0) return
    const archive = await open(buf)

    /* find the source if it's missing */
    if (!zip.source && zip.url.endsWith('.zip')) {
        zip.source = await findZipRoot(buf)
    }
    const stream = await openFile(archive, modZipPath(zip, fileName))
    if (!stream) return
    const raw = await streamToBuffer(stream)

    archive.close()

    if (!parseToJson) return raw as unknown as T
    return JSON.parse(raw as unknown as string) as T
}

function modZipPath(zip: ZipInputLocation, fileName: string): string {
    if (fileName === 'package.json' && zip.packageJSONPath) return zip.packageJSONPath

    if (fileName === 'ccmod.json' && zip.ccmodPath) return zip.ccmodPath

    if (zip.source) {
        return `${zip.source}/${fileName}`
    }
    return fileName
}

function open(buffer: Buffer): Promise<yauzl.ZipFile> {
    return new Promise((resolve, reject) => {
        yauzl.fromBuffer(
            buffer,
            { autoClose: true, lazyEntries: true, decodeStrings: true },
            (err, zip) => {
                if (err || !zip) {
                    return reject(err)
                }
                resolve(zip)
            }
        )
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

async function findZipRoot(buffer: Buffer): Promise<string | undefined> {
    const zip = await open(buffer)
    return new Promise((resolve, reject) => {
        zip.readEntry()
        zip.on('entry', (entry: yauzl.Entry) => {
            if (!entry.fileName.endsWith('/')) {
                const name = path.basename(entry.fileName)
                if (name == 'package.json' || name == 'ccmod.json') {
                    zip.close()
                    let dirPath = path.dirname(entry.fileName)
                    if (dirPath == '.') dirPath = ''
                    resolve(dirPath)
                    return
                }
            }
            zip.readEntry()
        })
            .on('end', () => resolve(undefined))
            .on('error', err => reject(err))
    })
}

/* this has to be done outside of buildEntry to avoid concurent api requests */
export async function addStarsAndTimestampsToResults(result: PackageDB) {
    for (const id in result) {
        const mod = result[id]

        if (!mod) continue

        const res = await getStarsAndTimestamp(mod.metadataCCMod)
        if (!res) continue

        mod.stars = res.stars
        mod.lastUpdateTimestamp = res.timestamp
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
    ccmod: ValidPkgCCMod | undefined
): Promise<{ stars: number; timestamp?: number } | undefined> {
    const homepageArr = getRepositoryEntry(ccmod?.repository)
    if (homepageArr.length == 0) return
    if (homepageArr.length > 1) throw new Error('Multi page star counting not supported')
    const { name, url } = homepageArr[0]
    if (name == 'GitHub') {
        const apiUrl = `https://api.github.com/repos/${url.substring('https://github.com/'.length)}`
        const data = await fetchGithub<github.components['schemas']['full-repository']>(apiUrl)

        if ('status' in data && data.status == '404') {
            throw new Error(`Repository: ${url} has been deleted!`)
        }

        const stars = data.stargazers_count
        if (!data.branches_url) {
            console.log(data)
            throw new Error(`branches_url not found? mod id: ${ccmod?.id}`)
        }

        const branchApiUrl = data.branches_url.replace(/\{\/branch\}/, `/${data.default_branch}`)
        const branchData =
            await fetchGithub<github.components['schemas']['branch-with-protection']>(branchApiUrl)
        const date = branchData.commit.commit.author!.date!
        const timestamp = new Date(date).getTime()

        return { stars, timestamp }
    }
    return
}

/* this has to be done outside of buildEntry to avoid concurent api requests */
export async function addReleasePages(result: PackageDB) {
    for (const id in result) {
        const mod = result[id]

        if (!mod) continue

        mod.releasePages = await getReleasePages(mod.metadataCCMod!)
    }
}

type ReleaseRaw = github.components['schemas']['release']

async function fetchReleasePages(
    url: string,
    page: number,
    perPage: number
): Promise<ReleaseRaw[]> {
    const repo = url.substring('https://github.com/'.length)
    const apiUrl = `https://api.github.com/repos/${repo}/releases?per_page=${perPage}&page=${page}`
    const data: ReleaseRaw[] = await fetchGithub<ReleaseRaw[]>(apiUrl)

    if ('status' in data && data.status == '404') {
        throw new Error(`Repository: ${url} has been deleted!`)
    }
    return data
}

async function getReleasePages(ccmod: ValidPkgCCMod): Promise<ReleasePage[] | undefined> {
    const homepageArr = getRepositoryEntry(ccmod.repository)
    if (homepageArr.length == 0) return
    if (homepageArr.length > 1) throw new Error('Multi page release fetching not supported')
    const { name, url } = homepageArr[0]

    if (name == 'GitHub') {
        /* github has a maximum of 100 items per page, so keep fetching new pages until the page is empty */
        const perPage = 100
        const releasesInfo: ReleaseRaw[] = []
        let lastReleaseInfoBatch: ReleaseRaw[] | undefined
        for (let page = 0; ; page++) {
            lastReleaseInfoBatch = await fetchReleasePages(url, page, perPage)
            if (lastReleaseInfoBatch.length == 0) break

            releasesInfo.push(...lastReleaseInfoBatch)

            if (lastReleaseInfoBatch.length != perPage) break
        }

        const paresed: ReleasePage[] = releasesInfo.map(e => {
            const tagName = e.tag_name
            let version = tagName

            // Attempt to convert the tag name into a semver
            if (version.startsWith('v')) version = version.substring('v'.length)
            // Revert to the raw tag name if the semver is stil invalid
            if (!semver.parse(version)) version = tagName

            return {
                body: e.body ?? '',
                version,
                timestamp: new Date(e.created_at).getTime(),
                url: e.html_url,
            }
        })
        return paresed
    }

    return
}
