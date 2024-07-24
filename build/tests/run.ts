import mocha from 'mocha'
import { getRepoBranches, gitReadFunc } from '../src/git'

async function run() {
    const branch = process.env['BRANCH']!

    await Promise.all([
        ...['input-locations.json', 'npDatabase.json', 'tools.json'].map(
            path =>
                new Promise<void>(async resolve => {
                    process.env[path] = await gitReadFunc(branch, path)
                    resolve()
                })
        ),
        new Promise<void>(async resolve => {
            const parentBranchesRaw = process.env['PARENT_BRANCHES']!
            if (!parentBranchesRaw) return resolve()

            const repoBranches = await getRepoBranches()

            async function getParentPackageDb(name: string): Promise<string> {
                if (repoBranches.includes(name)) {
                    const data = await gitReadFunc(name, 'npDatabase.min.json')
                    if (!data) throw new Error(`npDatabase.json not found on branch "${name}"`)
                    return data
                }

                try {
                    return (await fetch(name)).text()
                } catch (e) {
                    throw new Error(
                        `Invalid parent repo npDatatabase.min.json url: "${name}"`,
                        e as Error
                    )
                }
            }

            const parentBranches: string[] = JSON.parse(parentBranchesRaw)
            const parentDbs = await Promise.all(parentBranches.map(getParentPackageDb))

            const merged = parentDbs.reduce((acc, v) => Object.assign(acc, JSON.parse(v)), {})
            const mergedRaw = JSON.stringify(merged)

            process.env['parentNpDatabases'] = mergedRaw

            resolve()
        }),
    ])

    const mo = new mocha()
    mo.parallelMode(true)

    mo.addFile('build/tests/input.ts')
    mo.addFile('build/tests/npDatabase.ts')
    if (!process.env['donttesttools']) mo.addFile('build/tests/tools.ts')

    const runner = mo.run()

    const success = await new Promise<boolean>(resolve => {
        runner.on('fail', () => resolve(false))
        runner.on('end', () => resolve(true))
    })

    if (!success) {
        process.exitCode = 1
    }
}

await run()
