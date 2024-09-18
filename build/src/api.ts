import { LocalizedString, Page } from './types'

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

export function getStringFromLocalisedString(str: LocalizedString, lang = 'en_US'): string {
    if (!str) throw new Error(`No mod name found: ${str}`)
    if (typeof str === 'string') return str
    const newStr = str[lang]
    if (!newStr) throw new Error(`No ${lang} mod name found: ${str}`)
    return newStr
}
