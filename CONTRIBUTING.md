# Database Guidelines

## Constraints

- All mods in this Database **must** be usable in [CCLoader](https://github.com/CCDirectLink/CCLoader), in order to ensure consistency. 
	- You aren't required to use its feature set, the requirement is to be compatible with the aforementioned modloader.
- To prevent conflict with NPM, newly submitted mods **must not** use `dependencies`; use `ccmodDependencies` instead.
- Mods must have versions. `1.0.0` is a reasonable default for a mod getting a public release.

## Mod structure

- Mods **must** have releases as a compressed container, either as a `zip` file or a `ccmod` file
- Mods **must** contain a `package.json` file and be located in the root directory of the repository. (See [basic-mod](https://github.com/CCDirectLink/basic-mod) template for an example.)

## Database workflow

1. All mods will be added to the `input-locations.json` file. For specific details, see `inputLocationsFormat.md`.
2. This is compiled into the `npDatabase.json` file and the `mods.json` file by running the following instructions:
	- Navigate to the `build` directory
	- Run `npm install`
	- Run `npm start`
	- Run `npm test` to verify that the mod you're introducing doesn't break the database
3. `npDatabase.json` provides a central database, while `mods.json` is a view available for compatibility.

- Tools will remain being added to `tools.json` for now.

## How to add your mod

Use the pull request feature to submit your mod by adding it to the `input-locations.json`.

An example `zip` mod entry would be:

```json
	{
		"type": "modZip",
		"urlZip": "https://github.com/keanuplayz/LeaTriblader/archive/1.0.0.zip",
		"source": "LeaTriblader-1.0.0"
	}
```

And an example `ccmod` entry would be:

```json
	{
		"type": "ccmod",
		"urlZip": "https://github.com/keanuplayz/LeaTriblader/releases/download/1.0.0/LeaTriblader.ccmod"
	}
```

If maintainers accept it, they'll merge it, then create a commit of their own updating the "downstream" files.
