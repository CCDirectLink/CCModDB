import stream from 'stream'
import yauzl from 'yauzl'
import { download, streamToBuffer } from './download'

export type ModMetadatas = {
    ccmod?: PkgCCMod
    meta?: PkgMetadata
}
export type ModMetadatasInput = ModMetadatas & { input: InputLocation }

export async function get(input: InputLocation): Promise<ModMetadatasInput> {
    let out
    try {
        switch (input.type) {
            case 'modZip':
                out = {
                    meta: await getModZipFile<PkgMetadata>(input, 'package.json'),
                    ccmod: await getModZipFile<PkgCCMod>(input, 'ccmod.json'),
                    input,
                }
                break
            case 'ccmod':
                out = {
                    meta: await getCCModFile<PkgMetadata>(input, 'package.json'),
                    ccmod: await getCCModFile<PkgCCMod>(input, 'ccmod.json'),
                    input,
                }
                break
            default:
                throw new Error(`Unknown location type '${input.type}'`)
        }
    } catch (e) {
        console.log('Error while extracting', input)
        console.log(e)
        throw e
    }
    if (!out.ccmod && !out.meta) throw new Error(`A mod has to either have a package.json or a ccmod.json: ${input}`)
    return out
}

async function getModZipFile<T>(zip: ModZipInputLocation, fileName: string): Promise<T | undefined> {
    const file = await download(zip.urlZip)
    const buf = await streamToBuffer(file)
    if (buf.length === 0) return
    const archive = await open(buf)
    let stream
    stream = await openFile(archive, modZipPath(zip, fileName))
    if (!stream) return
    const rawPkg = await streamToBuffer(stream)

    archive.close()

    return JSON.parse(rawPkg as unknown as string) as T
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

async function getCCModFile<T>(ccmod: CCModInputLocation, fileName: string): Promise<T | undefined> {
    const file = await download(ccmod.url)
    const buf = await streamToBuffer(file)
    if (buf.length === 0) return
    const archive = await open(buf)
    const stream = await openFile(archive, fileName)
    if (!stream) return
    const rawPkg = await streamToBuffer(stream)

    archive.close()

    return JSON.parse(rawPkg as unknown as string) as T
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
