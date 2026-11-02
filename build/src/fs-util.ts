import type { DatabaseInfo, InputLocations, PackageDB } from './types'

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
