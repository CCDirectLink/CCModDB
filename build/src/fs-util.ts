import type { DatabaseInfo, InputLocation, InputLocations, PackageDB } from './types'

export type ReadFunc = (path: string) => Promise<string | undefined>
export type WriteFunc = (path: string, data: Buffer | string) => Promise<void>

export async function readInputLocations(read: ReadFunc): Promise<InputLocations> {
    const path = 'input-locations.json'
    const data = await read(path)
    if (!data) throw new Error(`input-locations.json doesn't exist on the target branch!`)
    return JSON.parse(data)
}

export async function readPackageDb(read: ReadFunc): Promise<PackageDB | undefined> {
    const data = await read('npDatabase.json')
    if (!data) return undefined
    return JSON.parse(data)
}

export async function readDbInfo(read: ReadFunc): Promise<DatabaseInfo> {
    const data = await read('db-info.json')
    if (!data) throw new Error(`db-info.json doesn't exist on the target branch!`)
    const dbInfo: DatabaseInfo = JSON.parse(data)
    return dbInfo
}

function stringifyLocation(loc: InputLocation) {
    const body = Object.entries(loc)
        .map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`)
        .join(', ')
    return '{ ' + body + ' }'
}

export function stringifyInputLocations(locations: InputLocations) {
    const pad = ' '.repeat(4)
    const body = Object.entries(locations)
        .map(([k, v]) => `${pad}${JSON.stringify(k)}: ${stringifyLocation(v)}`)
        .join(',\n')
    return `{\n${body}\n}`
}
