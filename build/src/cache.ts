import fs from 'fs'
import crypto from 'crypto'

const cacheDir = './build/cache'

const cache: Record<string, () => Promise<Buffer>> = {}
for (const path of await fs.promises.readdir(cacheDir)) {
    const tagHash = path.slice(0, -'.cache'.length)
    cache[tagHash] = () => readFromDisk(tagHash)
}

async function readFromDisk(tagHash: string): Promise<Buffer> {
    // console.log('cache hit!', tagHash)
    const readPromise = fs.promises.readFile(file(tagHash))
    cache[tagHash] = () => {
        // console.log('cache await hit!', tagHash)
        return readPromise
    }
    return readPromise
}

export async function get(tag: string, download: () => Promise<Buffer>): Promise<Buffer> {
    const tagHash = hash(tag)
    if (cache[tagHash]) return cache[tagHash]()
    // console.log('cache miss!', tagHash)

    const downloadPromise = download()
    cache[tagHash] = () => downloadPromise

    const data = await downloadPromise
    await write(tagHash, data)
    return data
}

async function write(tagHash: string, data: Buffer) {
    await fs.promises.mkdir(cacheDir, { recursive: true })
    await fs.promises.writeFile(file(tagHash), data)
}

function file(tagHash: string): string {
    return cacheDir + '/' + tagHash + '.cache'
}

function hash(tag: string): string {
    return crypto.createHash('sha256', { encoding: 'utf8' }).update(tag, 'utf8').digest('hex')
}
