<!-- markdownlint-disable MD013 MD034 -->

# `ccmod.json` format standard

## Each option explained

- `id` - Mod unique identifier. Not shown to the user
- `version` - Uses the [semver](https://semver.org/) format
- `title` - Title shown to users. Can be localized
- `description` - Description shown to users. Can be localized
- `license` - Dont know what to choose? I recommend `GPLv3`. Read more at https://choosealicense.com
- `homepage` - Put your GitHub repository link here
- `tags` (Optional) - A list of mod tags. Read what tags are availible below in Mod tag list
- `authors` - Either a string or an array of mod authors
- `icons` (Optional) - Mod icon. Currently only the size of 24x24 pixels is supported
- `dependencies` (Optional) - Require certain mods for the mod to function. Uses the [semver](https://semver.org/) format
- `plugin` (Optional) - Specifies the javascript file to run
- `preload` (Optional) - Specifies the javascript file to run at the `preload` stage
- `postload` (Optional) - Specifies the javascript file to run at the `postload` stage
- `prestart` (Optional) - Specifies the javascript file to run at the `prestart` stage
- `poststart` (Optional) - Specifies the javascript file to run at the `poststart` stage

## Mod tag list

- `QoL` - stands for "Quality of Life". Makes the playing experience smoother
- `character` - adds new playable characters and/or classes
- `combat arts` - adds new combat arts
- `maps` - adds new content maps
- `boss` - adds new bosses
- `ng++` - adds additional ng+ options
- `skins` - adds any kind of skin to the game
- `pets` - add a pet
- `accessibility` - makes the game more accessible
- `dev` - helps mod developers create mods
- `library` - used by other mods

## Example `ccmod.json`

```json
{
    "id": "crossedeyes",
    "version": "0.5.7",
    "name": "CrossedEyes",
    "description": "Accessibility mod for CrossCode",
    "license": "GPLv3",
    "homepage": "https://github.com/CCDirectLink/CrossedEyes",
    "tags": ["accessibility"],
    "authors": ["krypek", "2767mr"],
    "icons": {
        "24": "icon.png"
    },
    "dependencies": {
        "input-api": ">=1.0.0",
        "cc-blitzkrieg": ">=0.4.7",
        "crosscode": ">=1.4.0"
    },
    "plugin": "plugin.js"
}
```

Typescript types for this can be found in [CCUTD](https://github.com/CCDirectLink/ultimate-crosscode-typedefs)