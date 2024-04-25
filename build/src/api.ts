import { Page } from './types'

export function getRepositoryEntry(url?: string): Page[] {
    if (!url) {
        return []
    }

    let name: string
    switch (new URL(url).hostname) {
        case 'github.com':
            name = 'GitHub'
            break
        case 'gitlab.com':
            name = 'GitLab'
            break
        default:
            name = "mod's homepage"
    }

    return [{ name, url }]
}
