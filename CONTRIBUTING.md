# Database Guidelines
## Constraints
- All mods in this Database **must** use [CCLoader](https://github.com/CCDirectLink/CCLoader), in order to ensure consistency. 
	- You aren't required to use its feature set, the requirement is to be compatible with the aforementioned modloader.

## Mod structure
- Mods **must** have releases as compressed container (zip)
- Mods **must** contain a `package.json` file and be located in the root directory of the repository. (See [basic-mod](https://github.com/CCDirectLink/basic-mod) template for an example.)

## Database structure
- All mods will be added to the `mods.json`
- All container are protected with a hash

## How to add your mod
Use the pull request feature to submit your mod by adding it to the `mods.json`

