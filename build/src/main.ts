import * as inputLocations from './inputLocations'
import * as source from './source'
import * as db from './db'

async function main() {
    const GITHUB_TOKEN = process.env['GITHUB_TOKEN']
    if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN enviroment variable is required. To create a token, see https://github.com/settings/tokens?type=beta')
    const locations = await inputLocations.parse()
    const promises: Promise<source.ModMetadatasInput>[] = []
    for (const loc of locations) {
        promises.push(source.get(loc))
    }
    const packages = await Promise.all(promises)

    const pkgDb = await db.build(packages)
    await db.write(pkgDb)
    await db.writeMods(pkgDb)
}

main().catch(err => console.error('error: ', err))
