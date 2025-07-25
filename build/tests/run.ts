import mocha from 'mocha'

if (!process.env['BRANCH']) {
    throw new Error(`enviroment variable BRANCH not set`)
}

const mo = new mocha()
mo.parallelMode(true)

mo.addFile('build/tests/input.ts')
mo.addFile('build/tests/npDatabase.ts')

const runner = mo.run()

const success = await new Promise<boolean>(resolve => {
    runner.on('fail', () => resolve(false))
    runner.on('end', () => resolve(true))
})

if (!success) {
    process.exitCode = 1
}
