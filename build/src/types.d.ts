declare type InputLocation = InjectedInputLocation | ModZipInputLocation;

// Represents a raw input location to put more or less directly into npDatabase.json
declare type InjectedInputLocation = {
	type: 'injected';
} & Package;

declare type ModZipInputLocation = {
	type: 'modZip';
	// The URL of the ZIP file.
	urlZip: string;
	// The subdirectory in which the package.json file is kept.
	// Note that GitHub archives have an additional enclosing directory, so you will usually need to use this.
	// Only this subdirectory & subdirectories of it are extracted, and it is extracted at the target installation directory.
	source?: string;
	// If provided, then the package.json file is at this location in the archive, regardless of 'source'.
	// This must pretty much only be used for base packages.
	packageJSONPath?: string;
};

// The content of the input-locations.json file.
declare type InputLocations = InputLocation[];


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
declare type PackageType = 'mod' | 'tool' | 'base';

/*
 * A page relating to the mod.
 */
declare type Page = {
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
declare type PkgMetadata = {
	// This is the unique ID for this package, used for dependency handling. Note that this DOES NOT have to avoid collision with the NPM registry.
	name: string;
	// If not provided, defaults to "mod".
	ccmodType?: PackageType;
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
declare type PkgHash = {
	// Lowercase hexadecimal-encoded SHA-256 hash of the data.
	sha256: string;
};

/*
 * Represents a method of installing the package.
 */
declare type InstallMethod = InstallMethodCommon | InstallMethodModZip;

/*
 * The common fields between all PackageDBInstallationMethods.
 */
declare type InstallMethodCommon = {
	// Declares the type of installation method. ALWAYS CHECK THIS.
	type: string;
	// If present, constrains the platform this method may be used for.
	platform?: NodeOSPlatform;
}

declare type InstallMethodModZip = InstallMethodCommon & {
	type: 'modZip';
	// The URL of the ZIP to download. (example: "https://github.com/CCDirectLink/CCLoader/archive/master.zip")
	url: string;
	// The hash of the file at url.
	hash: PkgHash;
	// If provided, the subdirectory of the ZIP that is the root of the extraction (example: "CCLoader-master")
	source?: string;
};

/*
 * Represents a package in the database.
 */
declare type Package = {
	// Metadata for the package.
	metadata: PkgMetadata;
	// Installation methods (try in order)
	installation: InstallMethod[];
};

/*
 * Represents the database. Keys in this Record MUST match their respective `value.metadata.name`
 */
declare type PackageDB = Record<string, Package>;
