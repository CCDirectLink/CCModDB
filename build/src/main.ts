import * as inputLocations from './inputLocations'
import * as source from './source'
import * as db from './db'
import fs from 'fs'

async function main() {
    const GITHUB_TOKEN = process.env['GITHUB_TOKEN']
    if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN enviroment variable is required. To create a token, see https://github.com/settings/tokens?type=beta')

    const locations = await inputLocations.parse()
    const promises: Promise<source.ModMetadatasInput>[] = []
    for (const loc of locations) {
        promises.push(source.get(loc))
    }
    const packages = await Promise.all(promises)

    const oldPkgDb: PackageDB | undefined = fs.existsSync('../npDatabase.json') ? JSON.parse(fs.readFileSync('../npDatabase.json').toString()) : undefined
    const pkgDb = await db.build(packages, oldPkgDb)
    await db.write(pkgDb)
    await db.writeMods(pkgDb)

    if (oldPkgDb) {
        for (const name in pkgDb) {
            if (!oldPkgDb[name]) {
                const pkg = pkgDb[name]
                const ccmod = pkg.metadataCCMod!
                // prettier-ignore
                const arr: string[] = [
                    ccmod.id,
                    ccmod.version!,
                    db.getStringFromLocalisedString(ccmod.title ?? 'unknown'),
                    db.getStringFromLocalisedString(ccmod.description ?? 'unknown')
                ]
                console.log(arr.join('|'))
            }
        }
    }
}

main().catch(err => console.error('error: ', err))
