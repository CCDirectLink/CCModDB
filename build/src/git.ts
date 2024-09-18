import simpleGit from 'simple-git'

export const git = simpleGit()

export const gitReadFunc = (branch: string, path: string) => {
    return new Promise<string | undefined>((resolve, reject) => {
        git.show(`${branch}:${path}`, err => {
            if (err) reject(err)
        })
            .then(data => resolve(data))
            .catch(() => resolve(undefined))
    })
}

export async function getRepoBranches(): Promise<string[]> {
    const branches = await git.branchLocal()
    const repoBranches = branches.all.filter(name => !name.startsWith('master'))
    return repoBranches
}
