# Database Guidelines

## Constraints

- All mods in this Database **must** be usable in [CCLoader](https://github.com/CCDirectLink/CCLoader), in order to ensure consistency. 
	- You aren't required to use its feature set, the requirement is to be compatible with the aforementioned modloader.
- To prevent conflict with NPM, newly submitted mods **must not** use `dependencies`; use `ccmodDependencies` instead.
- Mods must have versions. `1.0.0` is a reasonable default for a mod getting a public release.

## Mod structure

- Mods must contain a `package.json` file somewhere.

## Database workflow

1. All mods will be added to the `input-locations.json` file. For specific details, see `inputLocationsFormat.md`.
2. This is compiled into the `npDatabase.json` file and the `mods.json` file by running `npm run build`.
3. `npDatabase.json` provides a central database, while `mods.json` is a view available for compatibility.

- Tools will remain being added to `tools.json` for now.

## How to add your mod

Use the pull request feature to submit your mod by adding it to the `input-locations.json`.

An example mod would be:

```json
	{
		"type": "modZip",
		"urlZip": "https://github.com/keanuplayz/LeaTriblader/archive/1.0.0.zip",
		"source": "LeaTriblader-1.0.0"
	}
```

If maintainers accept it, they'll merge it, then create a commit of their own updating the "downstream" files.
