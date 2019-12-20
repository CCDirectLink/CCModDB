# PNP 

"PNP" is a new format for CCModDB's to replace `mods.json` and maybe `tools.json` one day.
The goal is to simplify automatic installation.

## Concepts

A Package is an abstract blob on disk or remote that contains a PackageDBPackageMetadata structure.

This structure is a (potentially modified for compliance) copy of the package's `package.json` file (if one exists; otherwise, it comes from thin air).

The installation method and local-copy detection procedure varies; handling for these must be written into the package manager's "core".

The local set of packages is NOT stored in any local database. Instead, the local set of packages is determined by checking the locations where these packages are installed.

The remote set of packages, however, is a master "database" file with all information required and ZIP file URLs.

`https://raw.githubusercontent.com/CCDirectLink/CCModDB/master/npDatabase.json` contains this remote set of packages.

## Package Types

A Package Type defines the detection method used for local copies of the package and the place where the package is installed.

The "mod" Package Type is installed as a sub-directory in `assets/mods`, as per usual. The sub-directory name used is arbitrary.
The mod with the ID "Simplify" must be reclassified as a "base" package regardless.

The "tool" Package Type is the same as the "mod" Package Type, but is placed into `assets/tools` instead of `assets/mods`.

All "mod" and "tool" packages must have a `package.json` file as the local copy of their metadata, which is how they are detected.

(A previous version of this format declared that the `package.json` would be overwritten with the one provided by CCModDB. This is no longer the case.)

The "base" Package Type requires a per-case local copy detection method and a per-case removal method, and is used for CrossCode (which must never have a remote package), CCLoader, and potentially future NWJS upgrades. It is installed inline with CrossCode itself.

## Procedures

To remove a package depends on what kind it is. For "mod" and "tool" packages, the procedure is simple; for "base" packages, it is entirely package-dependent, and you are entirely expected to check package IDs here.

To install a package, the first usable PackageDBInstallationMethod is found. The ZIP file it contains is downloaded.

To upgrade a package, it is removed and then installed again.

The exact names of mod and tool directories names are considered theoretically irrelevant due to the way loading and the upgrade process is defined. They should be chosen in a way that preserves uniqueness; using the package name is valid.

## TypeScript

```typescript
// An os.platform() value (see https://nodejs.org/api/os.html#os_os_platform )
declare type NodeOSPlatform = string;

// Imported from https://github.com/CCDirectLink/CLS/blob/master/proposals/1/standardized-mod-format.md
declare type Semver = string;
declare type SemverConstraint = string;
// StandardizedModPackage is retroactively made a subclass of PackageDBPackageMetadata.

/*
 * Represents a kind of package.
 * Please be aware that "base" is reserved for packages that absolutely require special-case local detection,
 *  and special-case UI to be user-friendly, such as CCLoader and NWJS upgrades.
 * (In particular, CrossCode, CCLoader and NWJS upgrades require custom detection methods for their local copies.)
 */
declare type PackageDBPackageType = "mod" | "tool" | "base";

/*
 * A page relating to the mod.
 */
declare type PackageDBMetadataPage = {
	// The name of the page. For the canonical GitHub or GitLab page, this must be "GitHub" / "GitLab".
	name: string;
	url: string;
};

/*
 * This is related to the supported package metadata for mods, on purpose.
 * Note, however, that the 'dependencies' key is NOT supported.
 * Also note the care to try not to reinvent NPM fields, but also to avoid them when inappropriate.
 * Some mods will use NPM packages, have NPM build commands (See: TypeScript mods), etc.
 * So it's very important to keep the package metadata format safe for NPM to read,
 *  and that means ensuring all package metadata is either avoided by NPM or understood by it.
 */
declare type PackageDBPackageMetadata = {
	// This is the unique ID for this package, used for dependency handling. Note that this DOES NOT have to avoid collision with the NPM registry.
	name: string;
	// If not provided, defaults to "mod".
	ccmodType?: PackageDBPackageType;
	// This is the version of the package for dependency purposes. (see https://docs.npmjs.com/files/package.json )
	// If not present, assumed to be "0.0.0". NEW MODS WITHOUT VERSIONS WILL NOT BE ACCEPTED.
	version?: Semver;
	// This is the dependencies of the package, if any. If not present, `dependencies` is checked.
	// If `dependencies` contains NPM packages, you must supply at least an empty object here to prevent issues.
	ccmodDependencies?: Record<string, SemverConstraint>;
	// This is the dependencies of the package, if any. WARNING: THIS CONFLICTS WITH NPM. DO NOT USE. NEW MODS WITH THIS WILL NOT BE ACCEPTED.
	dependencies?: Record<string, SemverConstraint>;

	// Below here is metadata that has no effect on function.

	// This is the name the user is supposed to see. Really meant as a preservation mechanism for old mods.json naming information. Defaults to name.
	ccmodHumanName?: string;
	// This is the description of the package. (see https://docs.npmjs.com/files/package.json )
	description?: string;
	// SPDX license identifier or human readable text (see https://docs.npmjs.com/files/package.json )
	license?: string;
	// Homepage URL (see https://docs.npmjs.com/files/package.json )
	homepage?: string;
};

// Represents some set of hashes for something.
declare type PackageDBHash = {
	// Lowercase hexadecimal-encoded SHA-256 hash of the data.
	sha256: string;
};

/*
 * Represents a method of installing the package.
 */
declare type PackageDBInstallationMethod = PackageDBInstallationMethodCommon | PackageDBInstallationMethodModZip;

/*
 * The common fields between all PackageDBInstallationMethods.
 */
declare type PackageDBInstallationMethodCommon = {
	// Declares the type of installation method. ALWAYS CHECK THIS.
	type: string;
	// If present, constrains the platform this method may be used for.
	platform?: NodeOSPlatform;
}

declare type PackageDBInstallationMethodModZip = PackageDBInstallationMethodCommon & {
	type: "modZip";
	// The URL of the ZIP to download. (example: "https://github.com/CCDirectLink/CCLoader/archive/master.zip")
	url: string;
	// The hash of the file at url.
	hash: PackageDBHash;
	// If provided, the subdirectory of the ZIP that is the root of the extraction (example: "CCLoader-master")
	source?: string;
};

/*
 * Represents a package in the database.
 */
declare type PackageDBPackage = {
	// Metadata for the package.
	metadata: PackageDBPackageMetadata;
	// Installation methods (try in order)
	installation: PackageDBInstallationMethod[];
};

/*
 * Represents the database. Keys in this Record MUST match their respective `value.metadata.name`
 */
declare type PackageDB = Record<string, PackageDBPackage>;
```

## Known "base" Packages

`crosscode`:
Detected by checking for `assets/data/changelog.json`, version extracted from there.
implementations may fail if this package is not available in order to show a more coherent error about why CrossCode did not exist rather than showing non-existence.
Must never ever ever ever have a remote version or a removal method.

`ccloader`:
Detected by checking for `ccloader/package.json`, which is a valid package metadata file.
The remote version also has such a file, so this all lines up.
Older CCLoader versions do not have this file, and will not be detected; this is intended behavior to convince a user to update CCLoader.
Removal method is to restore the CrossCode `package.json`, and then delete the following:
Vital to success (failure to remove means aborting):
`ccloader`
`assets/mods/simplify`
Non-vital:
`assets/mods/ccloader-version-display`
`assets/mods/openDevTools`

`Simplify`, `CCLoader display version`, and `OpenDevTools`:
These are "CCLoader attached mods"; detected as part of standard mod scanning.
They should be handled internally, for the most part, like normal mods.
However, because they get updated with CCLoader, things would seem broken if we didn't hide them. As such:
+ As they don't exist, their dependencies metadata should be outright considered non-existent. (Things can depend ON them, but shouldn't)
+ As they are attached to CCLoader they have no remote versions.
+ They should be displayed like Base packages (i.e. not at all) & should not be touched by users. Users MAY enable/disable `CCLoader display version` & `OpenDevTools`.

## Compatibility

For compatibility with unpatched CCUpdaterCLI and CCBot, `mods.json` will remain for a while.

Due to problems fitting the tools into the package system, `tools.json` will remain until I can find a way to handle that.

## Credits

20kdc
