# Input Locations Format

`input-locations.json` specifies the source ZIP files for creating the database.

It's a JSON file containing a JSON array.

Each array is a different input location.

## TypeScript

```typescript
// PNP.PackageDBPackage imported from npDatabaseFormat.md
// PSL.PatchStepsPatch imported from https://github.com/CCDirectLink/CLS/blob/master/proposals/1/patch-steps.md

declare type InputLocation = InjectedInputLocation | ModZipInputLocation;

// Represents a raw input location to put more or less directly into npDatabase.json
declare type InjectedInputLocation = {
	type: "injected";
} & PNP.PackageDBPackage;

declare type ModZipInputLocation = {
	type: "modZip";
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
```
