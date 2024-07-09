import simpleGit from 'simple-git'

export const git = simpleGit()

export const gitReadFunc = async (branch: string, path: string) => {
    try {
        return await git.show(`${branch}:${path}`)
    } catch (e) {
        return undefined
    }
}

export async function getRepoBranches(): Promise<string[]> { 
    const branches = await git.branchLocal()
    const repoBranches = branches.all.filter(name => !name.startsWith('master'))
    return repoBranches
}
