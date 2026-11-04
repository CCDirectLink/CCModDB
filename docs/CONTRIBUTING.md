# Adding or updating your own mod to the database

## Compatibility

- All mods in this database **must** be usable in [CCLoader](https://github.com/CCDirectLink/CCLoader), in order to ensure consistency. 
  You aren't required to use its feature set, the requirement is to be compatible with the aforementioned modloader.

## Mod structure

- Mods **must** have releases as a compressed container, either as a `.zip` file or a `.ccmod` file
- Mods **must** contain a `ccmod.json` file and be located in the root directory of the repository.
  The file needs to follow the standard found [here](/docs/CCMOD-STANDARD.md)
  (See [basic-mod](https://github.com/CCDirectLink/basic-mod) template for an example)

## Source hosting platform
 
You have to publish the mod's source code on a hosting platform.  
Currently, only [GitHub](https://github.com/) is supported.  
See a guide on how to use GitHub [here](https://docs.github.com/en/get-started/start-your-journey).  

## Packaging

You can package the mod as as either a `.ccmod` or a `.zip`.  
A `.ccmod` file is really just an `.zip` file with an changed extension to `.ccmod`.  
Note that `ccmod.json` HAS to be at the root of the archive for a `.ccmod` to work,   
aka it has to be at the very top of the archive folder structure.  

#### Example
Good ️✅
```
mymod.ccmod/
  ccmod.json
  icon.png
  plugin.js
```

Bad ❌
```
mymod.ccmod/
  mymod/
    ccmod.json
    icon.png
    plugin.js
```
> [!TIP]
> I recommend you check the mod structure and `ccmod.json` validity on https://crosscode-mods.krypek.cc/check-mod  

## How to add your mod though 

[https://crosscode-mods.krypek.cc/publish-mod](https://crosscode-mods.krypek.cc/publish-mod) is the preferred and easiest way to add and update your mod.  

First follow the steps on how to pack your mod [here](https://wiki.c2dl.info/CrossCode_Modding_Tutorial#Share_your_mod).  
You should make use of the GitHub releases to publish your packed mod archives there.  
Once the release is made and the mod archive is uploaded, copy it's link.

> [!WARNING]
> You must be added to the authorized users list by an database administrator before you can publish.  
> Ask for it in the CrossCode Modding Server (invite below).  
> [![Discord Server](https://img.shields.io/discord/382339402338402315.svg?label=Discord%20Server)](https://discord.gg/3Xw69VjXfW)

Then input the mod archive link into the "mod url".  
Press "Check" and check the console at the bottom of the site for errors.  
If all checks passed, the "Publish" button should be enabled, press it.  
Now you need to wait for your mod to be approved by one of the database administrators.  

You can also submit the mod to the `testing` branch.  
That branch is for pre-release mods, that you do not wish to force upon all users.   
Just change the branch in the dropdown menu.  
