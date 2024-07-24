import { PackageDB } from '../src/types'
import { expect } from 'chai'
import { testPackage } from './npDatabase'

const tools: PackageDB = JSON.parse(process.env['tools.json']!)

describe('ToolsDB', async () => {
    it('Check json structure', () => {
        expect(typeof tools === 'object', 'Json not valid: Not an object').to.be.true
        expect(Array.isArray(tools), 'Json not valid: Not an object').to.be.false
        expect(tools !== null, 'Json not valid: Not an object').to.be.true
    })

    describe('tools', () => {
        for (const mod of Object.keys(tools)) {
            testPackage(tools[mod], mod)
        }
    })
})
