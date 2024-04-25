import fs from 'fs'
import type { InputLocations } from './types'

export async function parse(): Promise<InputLocations> {
    return JSON.parse((await read()) as any)
}

function read(): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        fs.readFile('./input-locations.json', (err, data) => {
            if (err) {
                reject(err)
            }
            resolve(data)
        })
    })
}
