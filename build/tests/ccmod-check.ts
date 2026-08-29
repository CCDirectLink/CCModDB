import { Package, ValidTags, type PackageDB, type PkgCCMod } from '../src/types'
import semver from 'semver'

type TestFunc = (name: string, func: () => void) => void
type ExpectFunc = (
    value: any,
    error?: string
) => {
    toBeTrue: () => void
    toBeFalse: () => void
    toBeTruthy: () => void
}

export class CCModChecker {
    /* see https://github.com/CCDirectLink/CCLoader3/issues/18 for details */
    ccmodIdValidationExceptions: string[] = [
        'CrossCode Map Editor',
        "Azure's Adjustments",
        'Boki Colors',
        'CCLoader display version',
        'CrossCode C Edition',
        'New game++',
    ]

    /**
     * Mod dependencies to skip while checking if a mod has all it's dependencies in the database
     */
    skipTheseModDependencies = [
        'crosscode',
        'simplify',
        // https://github.com/CCDirectLink/CCLoader3/blob/edb3481d9ea504e2c7f7fe46709ab2b4a7f2ce0b/src/game.ts#L9-L17
        'fish-gear',
        'flying-hedgehag',
        'manlea',
        'ninja-skin',
        'post-game',
        'scorpion-robo',
        'snowman-tank',
    ]

    highestVersionMods: Record<string, Package>
    modTitleToId: Record<string, string>

    /**
     * Searches databases for a dependency by it's id and title
     * @param {string} depName - Name of a dependency to look for
     */
    findDependency(depName: string): Package | undefined {
        return this.highestVersionMods[depName] ?? this.modTitleToId[depName]
    }

    constructor(
        public databases: PackageDB[],
        private test: TestFunc,
        private expect: ExpectFunc
    ) {
        this.highestVersionMods = {}
        for (const db of databases) {
            for (const modId in db) {
                const pkg = db[modId]
                const prevPkg = this.highestVersionMods[modId]
                if (!prevPkg) {
                    this.highestVersionMods[modId] = pkg
                } else {
                    const version = pkg.metadataCCMod?.version ?? '0.0.0'
                    const prevVersion = prevPkg.metadataCCMod?.version ?? '0.0.0'
                    if (semver.gt(version, prevVersion)) {
                        this.highestVersionMods[modId] = pkg
                    }
                }
            }
        }

        this.modTitleToId = Object.fromEntries(
            Object.entries(this.highestVersionMods).map(([modId, pkg]) => [
                pkg.metadataCCMod?.title ?? 'UNKNOWN',
                modId,
            ])
        )
    }

    testMetadataCCMod(ccmod: PkgCCMod) {
        const { test, expect } = this
        test('ccmod.json', () => {
            expect(typeof ccmod.id === 'string', 'ccmod.id (type: string) required').toBeTrue()

            expect(
                ccmod.id.length > 0 &&
                    (/^[a-zA-Z0-9_-]+$/.test(ccmod.id) || this.ccmodIdValidationExceptions.includes(ccmod.id)),
                'ccmod.id (type: string) must consist only of one or more alphanumberic characters, hyphens or underscores'
            ).toBeTrue()

            expect(
                typeof ccmod.version === 'string' && semver.valid(ccmod.version) !== null,
                'ccmod.version (type: string) is missing or isnt valid semver'
            ).toBeTrue()

            expect(
                typeof ccmod.title === 'string' || typeof ccmod.title === 'object',
                'ccmod.title (type: string) is missing or has wrong type'
            ).toBeTrue()
            expect(
                ccmod.description !== undefined &&
                    (typeof ccmod.description === 'string' || typeof ccmod.description === 'object'),
                'ccmod.description (type: string) is missing or has wrong type'
            ).toBeTrue()
            expect(
                ccmod.homepage === undefined || typeof ccmod.homepage === 'string',
                'ccmod.homepage (type: string) has wrong type'
            ).toBeTrue()

            expect(
                typeof ccmod.repository === 'string' && ccmod.repository.length > 0,
                'ccmod.repository (type: string) is missing, is empty or has wrong type'
            ).toBeTrue()

            expect(
                ccmod.tags !== undefined && Array.isArray(ccmod.tags),
                'ccmod.tags (type: array) is missing or has wrong type'
            ).toBeTrue()

            const tags = (ccmod.tags ?? []).sort()
            for (let i = 0; i < tags.length; i++) {
                const tag = tags[i]
                expect(ValidTags.includes(tag), `ccmod.tags (type: array) has an invalid tag: "${tag}"`).toBeTrue()
                expect(tags[i - 1] != tag, `ccmod.tags (type: array) has a duplicate tag: "${tag}"`).toBeTrue()
            }

            expect(
                ccmod.authors !== undefined && Array.isArray(ccmod.tags),
                'ccmod.authors (type: array) is missing or has wrong type'
            ).toBeTrue()
        })

        if (ccmod.dependencies) {
            test('mod dependencies', () => {
                expect(!ccmod.dependencies || typeof ccmod.dependencies == 'object').toBeTrue()

                expect(
                    typeof ccmod.dependencies === 'object',
                    'ccmod.dependencies (type: object) must be an object'
                ).toBeTrue()
                expect(
                    Array.isArray(ccmod.dependencies),
                    'ccmod.dependencies (type: object) must be an object'
                ).toBeFalse()
                expect(ccmod.dependencies !== null, 'ccmod.dependencies (type: object) must be an object').toBeTrue()

                for (const depId in ccmod.dependencies!) {
                    const requiredVersionRange = ccmod.dependencies![depId]
                    expect(
                        semver.validRange(requiredVersionRange),
                        `dependency ${depId} must be specify a valid range`
                    ).toBeTruthy()

                    if (this.skipTheseModDependencies.includes(depId.toLowerCase())) continue

                    const dep = this.findDependency(depId)
                    expect(dep, `dependency ${depId} must be registered in CCModDb`).toBeTruthy()

                    if (dep) {
                        const depDatabaseVersion = dep.metadataCCMod!.version
                        expect(
                            semver.satisfies(depDatabaseVersion, requiredVersionRange, {
                                includePrerelease: true,
                            }),
                            `the version of the dependency ${depId} (database version: ${depDatabaseVersion}) does not satisfy the required range: ${requiredVersionRange}`
                        ).toBeTrue()
                    }
                }
            })
        }
    }
}
