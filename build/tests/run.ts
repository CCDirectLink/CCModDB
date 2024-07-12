import mocha from 'mocha'
import { getRepoBranches, gitReadFunc } from '../src/git'

async function run() {
    const branch = process.env['BRANCH']!

    process.env['input-locations.json'] = await gitReadFunc(branch, 'input-locations.json')
    process.env['npDatabase.json'] = await gitReadFunc(branch, 'npDatabase.json')
    process.env['tools.json'] = await gitReadFunc(branch, 'tools.json')

    const parentBranchesRaw = process.env['PARENT_BRANCHES']!
    if (parentBranchesRaw) {
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
    }

    const mo = new mocha()
    mo.parallelMode(true)

    mo.addFile('build/tests/input.ts')
    mo.addFile('build/tests/npDatabase.ts')
    mo.addFile('build/tests/dbBuilt.ts')

    const runner = mo.run()

    const success = await new Promise<boolean>((resolve) => {
        runner.on('fail', () => resolve(false))
        runner.on('end', () => resolve(true))
    })

    if (!success) {
        process.exitCode = 1
    }
}


await run()
