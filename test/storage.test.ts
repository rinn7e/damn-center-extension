/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-only
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { defaultGlobalSetting } from '../src/common/type/global-setting'
import { type Hostname } from '../src/common/type/hostname'
import {
  type SiteSetting,
  defaultSiteSetting,
} from '../src/common/type/site-setting'
import {
  getGlobError,
  getHostname,
  loadGlobalSetting,
  loadSiteSetting,
  matchUrlPattern,
  saveGlobalSetting,
  saveSiteSetting,
} from '../src/storage/storage'

// Set up hoisted mock state so we can control picomatch behavior dynamically
const { mockState } = vi.hoisted(() => {
  return { mockState: { forceThrow: false } }
})

vi.mock('picomatch', async (importOriginal) => {
  const original = await importOriginal<any>()
  return {
    default: (pattern: string, options: any) => {
      if (mockState.forceThrow) {
        throw new Error('Mocked picomatch error')
      }
      return original.default(pattern, options)
    },
  }
})

describe('Storage Helpers', () => {
  describe('getHostname', () => {
    it('extracts correct hostname from standard URLs', () => {
      expect(getHostname('https://google.com/search?q=test')).toBe('google.com')
      expect(getHostname('http://subdomain.example.co.uk/path')).toBe(
        'subdomain.example.co.uk',
      )
    })

    it('returns system-settings for chrome system pages and empty inputs', () => {
      expect(getHostname('chrome://extensions/')).toBe('system-settings')
      expect(
        getHostname('chrome-extension://abcdefghijklmnopqrstuvwxyz/popup.html'),
      ).toBe('system-settings')
      expect(
        getHostname(
          'safari-web-extension://abcdefghijklmnopqrstuvwxyz/popup.html',
        ),
      ).toBe('system-settings')
      expect(getHostname('')).toBe('system-settings')
    })

    it('groups every other non-web page under system-settings', () => {
      expect(getHostname('about:newtab')).toBe('system-settings')
      expect(getHostname('file:///Users/me/notes.html')).toBe('system-settings')
      expect(
        getHostname('moz-extension://0b1c2d3e-uuid/index.html?mode=tab'),
      ).toBe('system-settings')
      expect(getHostname('edge://settings')).toBe('system-settings')
    })

    it('returns unknown-domain for invalid non-empty URLs', () => {
      expect(getHostname('not-a-valid-url')).toBe('unknown-domain')
    })
  })

  describe('matchUrlPattern', () => {
    it('matches exact URLs and patterns correctly using glob', () => {
      expect(matchUrlPattern('https://google.com/', '*://*google.com/**')).toBe(
        true,
      )
      expect(
        matchUrlPattern(
          'https://en.wikipedia.org/wiki/Main_Page',
          '*://*.wikipedia.org/**',
        ),
      ).toBe(true)
    })

    it('falls back to case-insensitive substring search when glob pattern compiler throws an error', () => {
      mockState.forceThrow = true
      try {
        expect(matchUrlPattern('https://github.com/rinn7e', 'GitHub')).toBe(
          true,
        )
        expect(matchUrlPattern('https://google.com/', 'google')).toBe(true)
        expect(matchUrlPattern('https://google.com/', 'yahoo')).toBe(false)
      } finally {
        mockState.forceThrow = false
      }
    })

    it('returns false for empty pattern', () => {
      expect(matchUrlPattern('https://google.com/', '')).toBe(false)
    })
  })

  describe('getGlobError', () => {
    it('returns null for valid glob patterns', () => {
      expect(getGlobError('**')).toBeNull()
      expect(getGlobError('*://*.wikipedia.org/**')).toBeNull()
    })

    it('returns null for empty or whitespace patterns', () => {
      expect(getGlobError('')).toBeNull()
      expect(getGlobError('   ')).toBeNull()
    })

    it('returns error message string when picomatch compilation fails', () => {
      mockState.forceThrow = true
      try {
        expect(getGlobError('invalid-pattern')).toBe('Mocked picomatch error')
      } finally {
        mockState.forceThrow = false
      }
    })
  })
})

describe('Storage reads', () => {
  // What chrome.storage does when the read fails, e.g. in a page whose
  // extension was updated: no result, and runtime.lastError set
  const stubFailingStorage = () =>
    vi.stubGlobal('chrome', {
      runtime: { lastError: { message: 'Extension context invalidated.' } },
      storage: {
        local: {
          // Asynchronous, like the real API
          get: (_keys: string[], callback: (res?: object) => void) =>
            setTimeout(() => callback(undefined), 0),
        },
      },
    })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fails loadGlobalSetting instead of hanging', async () => {
    stubFailingStorage()
    const result = await loadGlobalSetting()()

    expect(result._tag).toBe('Left')
  })

  it('fails loadSiteSetting instead of hanging', async () => {
    stubFailingStorage()
    const result = await loadSiteSetting('example.com' as Hostname, {
      width: 1920,
      height: 1080,
    })()

    expect(result._tag).toBe('Left')
  })
})

describe('Storage writes', () => {
  let stored: Record<string, unknown>

  beforeEach(() => {
    stored = {}
    vi.stubGlobal('chrome', {
      runtime: {},
      storage: {
        local: {
          get: (keys: string[] | null, callback: (res: object) => void) =>
            callback(
              keys === null
                ? { ...stored }
                : Object.fromEntries(
                    keys
                      .filter((key) => key in stored)
                      .map((key) => [key, stored[key]]),
                  ),
            ),
          set: (items: Record<string, unknown>, callback: () => void) => {
            Object.assign(stored, items)
            callback()
          },
        },
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const site: SiteSetting = { ...defaultSiteSetting, enabled: false }

  it('saves when nothing is saved yet, and over data of this schema', async () => {
    // The order of a fresh install: the popup saves the global settings
    // when it first opens
    expect((await saveGlobalSetting(defaultGlobalSetting)())._tag).toBe('Right')
    expect(
      (await saveSiteSetting('example.com' as Hostname, site)())._tag,
    ).toBe('Right')
    expect((await saveSiteSetting('other.org' as Hostname, site)())._tag).toBe(
      'Right',
    )
    expect(stored).toEqual({
      global_settings: defaultGlobalSetting,
      'example.com': site,
      'other.org': site,
    })
  })

  it('marks the format of a first save into empty storage', async () => {
    expect(
      (await saveSiteSetting('example.com' as Hostname, site)())._tag,
    ).toBe('Right')

    // Without it, the site alone would read as version 1 data
    expect(stored).toEqual({
      global_settings: defaultGlobalSetting,
      'example.com': site,
    })
  })

  it('never saves among version 1 settings without global settings', async () => {
    // Version 1 did not always save global settings; its sites are enough to
    // tell that the data waits for its migration
    stored = { 'example.com': [] }

    const siteResult = await saveSiteSetting('other.org' as Hostname, site)()
    const globalResult = await saveGlobalSetting(defaultGlobalSetting)()

    expect(siteResult._tag).toBe('Left')
    expect(globalResult._tag).toBe('Left')
    expect(stored).toEqual({ 'example.com': [] })
  })

  it('never saves among settings that wait for their migration', async () => {
    // Saving would mark them as migrated, so the migration would never run
    stored = {
      global_settings: { ...defaultGlobalSetting, schema_version: 1 },
      'example.com': [],
    }
    const before = structuredClone(stored)

    const siteResult = await saveSiteSetting('example.com' as Hostname, site)()
    const globalResult = await saveGlobalSetting(defaultGlobalSetting)()

    expect(siteResult._tag).toBe('Left')
    expect(globalResult._tag).toBe('Left')
    expect(stored).toEqual(before)
  })

  it('never saves over data of a newer schema', async () => {
    stored = {
      global_settings: { schema_version: 3, theme: 'auto' },
      'example.com': { _tag: 'SiteSettingV3' },
    }
    const before = structuredClone(stored)

    const siteResult = await saveSiteSetting('example.com' as Hostname, site)()
    const globalResult = await saveGlobalSetting(defaultGlobalSetting)()

    expect(siteResult._tag).toBe('Left')
    expect(globalResult._tag).toBe('Left')
    expect(stored).toEqual(before)
  })
})
