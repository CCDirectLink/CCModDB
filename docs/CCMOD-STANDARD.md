<!-- markdownlint-disable MD013 MD034 -->

# `ccmod.json` format standard v1.1.0

## Each option explained

- `id` - Mod unique identifier. Not shown to the user.  
   Must consist only of one or more alphanumeric characters, hyphens `-` or underscores `_`  
- `version` - Uses the [semver](https://semver.org/) format
- `title` - Title shown to users. Can be localized
- `description` - Description shown to users. Can be localized
- `homepage` (Optional) - Put your mod homepage link here (don't put your repository link here)
- `repository` - Put your repository link here. Non GitHub links will be missing some [CCModManager](https://github.com/CCDirectLink/CCModManager) functionality
- `tags` (Optional) - A list of mod tags. Read what tags are available below in Mod tag list.
   If the first tag is `library` [CCModManager](https://github.com/CCDirectLink/CCModManager) will hide the mod by default.
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
- `player character` - adds new playable characters and/or classes
- `party member` - adds new playable characters and/or classes
- `combat arts` - adds new combat arts
- `pvp duel` - adds a pvp duel
- `arena` - adds new arena cups
- `dungeon` - adds a new dungeon
- `quests` - adds new quests
- `maps` - adds new content maps
- `boss` - adds new bosses
- `puzzle` - adds new puzzles or something puzzle related
- `ng+` - adds additional ng+ options
- `cosmetic` - adds any kind of cosmetic things like skins, pets or menu skins
- `music` - adds or replaces music and/or sounds
- `fun` - fun things not necessarily useful
- `cheats` - do things you're not supposed to do like spawn items or infinite gold
- `speedrun` - helps speedrunners with speedruns or practice
- `widget` - adds a [CCUILib](https://github.com/conorlawton/nax-ccuilib) quick menu widget
- `language` - adds a new language
- `accessibility` - makes the game more accessible
- `dev` - helps mod developers create mods
- `library` - used by other mods
- `base` - used by stuff like CCLoader
- `externaltool` - reserved by tools like [crosscode-map-editor](https://github.com/CCDirectLink/crosscode-map-editor), do not use in mods

## Example `ccmod.json`

```json
{
    "id": "ccmodmanager",
    "version": "1.0.4",
    "title": "CCModManager",
    "description": "Mod manager for CrossCode!",
    "repository": "https://github.com/CCDirectLink/CCModManager",
    "tags": ["QoL"],
    "authors": ["krypek", "dmitmel", "2767mr", "elluminance"],
    "icons": {
        "24": "icon/icon.png"
    },
    "dependencies": {
        "ccloader": ">=3.2.2-alpha || ^2.0.0"
    },
    "plugin": "plugin.js"
}
```

Typescript types for this can be found under [`build/src/types.ts`](/build/src/types.ts) `ValidPkgCCMod`.  
[JSON Schema](https://json-schema.org/) for `ccmod.json` can be found [here](/ccmod-json-schema.json).  
The JSON Schema is uploaded to [JSON Schema Store](https://www.schemastore.org/).  

