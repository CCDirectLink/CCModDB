# Database Guidelines
## Constraints
- All mods in this Database **must** use [CCLoader](https://github.com/CCDirectLink/CCLoader), in order to ensure consistency. 
	- You aren't required to use its feature set, the requirement is to be compatible with the aforementioned modloader.

## Mod structure
- The entrypoint for all mods is `mod.js`. This file **must** exist and be located in the root directory of the repository.
- Mods **must** have releases as compressed container (zip)

## Database structure
- All mods will be added to the `mods.json`
- All container are protected with a hash

## How to add your mod
Use the pull request feature to submit your mod by adding it to the `mods.json`

