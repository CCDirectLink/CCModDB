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

## How to add your mod with LeaBot

[LeaBot](https://github.com/CCDirectLink/ccbot) is the preferred and easiest way to add and update your mod.  
It can be accessed in the CrossCode Modding Server. Invite link below

[![Discord Server](https://img.shields.io/discord/382339402338402315.svg?label=Discord%20Server)](https://discord.gg/3Xw69VjXfW)

First follow the steps on how to pack your mod [here](https://wiki.c2dl.info/CrossCode_Modding_Tutorial#Share_your_mod).  
You should make use of the GitHub releases to publish your packed mod archives there.  
Once the release is made and the mod archive is uploaded, copy it's link.

Then type the following command in the designated channel for using LeaBot:  

```
.cc publish-mod <mod-archive-url>
```

For example, here's how you would upload the `1.0.1` version of the mod [input-api](https://github.com/CCDirectLink/input-api/releases/tag/v1.0.1):  

```
.cc publish-mod https://github.com/CCDirectLink/input-api/releases/download/v1.0.1/input-api.ccmod
```

Now you need to wait for your mod to be approved by one of the database administrators.  

You can also submit the mod to the `testing` branch.  
That branch is for pre-release mods, that you do not wish to force upon all users.   
Just append `testing` to the end of the command:  

```
.cc publish-mod <mod-archive-url> testing
```
