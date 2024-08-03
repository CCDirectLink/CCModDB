# CCModDB database

## input-locations.json

`input-locations.json` specifies the source of mod archives for creating the database.  
It's a JSON file containing a JSON array.  
The TypeScript types for this file are under [`build/src/types.d.ts`](/build/src/types.d.ts) `InputLocations`.  

### Example entries

An example `zip` mod entry would be:

```json
    { "url": "https://github.com/CCDirectLink/input-api/archive/refs/tags/v1.0.2.zip" }
```

And an example `ccmod` entry would be:

```json
    { "url": "https://github.com/krypciak/cc-fancy-crash/releases/download/v1.1.0/cc-fancy-crash-1.1.0.ccmod" }
```

## npDatabase.json

`npDatabase.json` contains the mod "database".  
It contains all information necessary to display the mods in a list and to automatically install them by tools like [CCModManager](https://github.com/CCDirectLink/CCModManager).

The minified version of this file (`npDatabase.min.json`) is generated alongside this file as well.  

The TypeScript types for this file are under [`build/src/types.d.ts`](/build/src/types.d.ts) `PackageDB`.  

## Database workflow

The recommended method of adding and updating mods is through [LeaBot](https://github.com/CCDirectLink/ccbot).  
See how to do that in [CONTRIBUTING.md](/docs/CONTRIBUTING.md)  

Modifying the database manually is sometimes required.  
For example, CCLoader can only be updated that way.  
 
### Steps

1. Select the branch you want to add your mod to. `stable` is for stable versions, `testing` is for prototypes and beta versions.
2. Export your selected branch as an enviroment variable:  
   - In the case of `stable`, run `export BRANCH=stable`  
3. Switch to the branch you choose with.  
   To do that, run `git checkout $BRANCH`
4. Add your mod to the `input-locations.json` file. For specific details, see [DATABASE.md](/docs/DATABASE.md)
5. Commit the changes
6. Switch back to the `master` branch.  
   To do that, run `git checkout master`
7. Now to update the `npDatabase.json` file, run:  
	- Run `npm install`  
	- Now you have two choices:
	  - If you just want to have the entry you just changed updated, run:  
	    `npm run start`    
	  - If you want to re-generate the entire database from scratch, run:  
	    `npm run startScratch`  
8. If successful, you should be checked-out on the selected branch
10. Amend the last commit to also include the current changes
11. Switch back to the `master` branch
12. Run `npm run test` to verify that the mod you're introducing doesn't break the database

- Tools are in `tools.json` (also in the `npDatabase.json` format) and need to be modified manually.


### Self-hosting your own mod database branch

```bash
git clone https://github.com/krypciak/CCModDB
cd CCModDB
# das
gh repo set-default krypciak/CCModDB
# Create a fork of the repository
gh repo fork --remote
# Create a new branch called "mymods" based on the "stable" branch
git checkout -b mymods upstream/stable
# Delete all commits besides the first one
git reset --hard "$(git rev-list --max-parents=0 HEAD)"
# Push the changes
git push --set-upstream origin --force
```
