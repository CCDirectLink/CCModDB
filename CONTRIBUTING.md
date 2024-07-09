# Database Guidelines

## Constraints

- All mods in this Database **must** be usable in [CCLoader](https://github.com/CCDirectLink/CCLoader), in order to ensure consistency. 
	- You aren't required to use its feature set, the requirement is to be compatible with the aforementioned modloader.
- Mods must have versions. `1.0.0` is a reasonable default for a mod getting a public release.

## Mod structure

- Mods **must** have releases as a compressed container, either as a `zip` file or a `ccmod` file
- Mods **must** contain a `ccmod.json` file and be located in the root directory of the repository. (See [basic-mod](https://github.com/CCDirectLink/basic-mod) template for an example.)

## Database workflow

1. Select the branch you want to add your mod to. `stable` is for stable versions, `testing` is for prototypes and beta versions.
2. Switch to the branch you choose with.
   To do that, run `git checkout <branch>`
3. Add your mod to the `input-locations.json` file. For specific details, see `inputLocationsFormat.md`.
4. Switch back to the `master` branch.
   To do that, run `git checkout master`
5. Now to update the `npDatabase.json` file, run:
	- Run `npm install`
	- Run `npm run <branch>`
	  In the case of the stable branch, it's
	  `npm run stable`
6. If successful, you should be checked-out on the selected branch
7. Commit the changes
8. Switch back to the `master branch`
9. Run `npm run <branch>Test` to verify that the mod you're introducing doesn't break the database

- Tools are in `tools.json` (also in the `npDatabase.json` format) and need to be modified manually.

## How to add your mod

You should use the [LeaBot](https://github.com/CCDirectLink/ccbot) to add your mod.  
Join the main CrossCode modding server

[![Discord Server](https://img.shields.io/discord/382339402338402315.svg?label=Discord%20Server)](https://discord.gg/3Xw69VjXfW)
 
TODO

### Adding it manually

Use the pull request feature to submit your mod by adding it to the `input-locations.json`.

An example `zip` mod entry would be:

```json
    { "url": "https://github.com/CCDirectLink/input-api/archive/refs/tags/v1.0.2.zip" }
```

And an example `ccmod` entry would be:

```json
    { "url": "https://github.com/krypciak/cc-fancy-crash/releases/download/v1.1.0/cc-fancy-crash-1.1.0.ccmod" }
```

If maintainers accept it, they'll merge it, then create a commit of their own updating the "downstream" files.
