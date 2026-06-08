import { describe, expect, it, vi } from 'vitest'

import { getHostname, matchUrlPattern } from '../src/storage/storage'
import { type PadSettings, defaultPadSettings } from '../src/type'
import {
  buildGlobPatternFromSegments,
  determineIsDarkPure,
  getActivePadSettingIndex,
  parseUrlSegments,
  swapArrayElements,
  updatePadSettingInList,
  validateBackupData,
} from '../src/update'

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
      expect(getHostname('')).toBe('system-settings')
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
      // Force picomatch to throw an error to trigger the catch block fallback
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
})

describe('Update Helpers', () => {
  describe('getActivePadSettingIndex', () => {
    const mockSettings: PadSettings[] = [
      {
        ...defaultPadSettings,
        enabled: true,
        matchPattern: '*://*.wikipedia.org/**',
      },
      {
        ...defaultPadSettings,
        enabled: true,
        matchPattern: '*://github.com/**',
      },
    ]

    it('returns correct index when a matching pattern is found', () => {
      expect(
        getActivePadSettingIndex(
          'https://en.wikipedia.org/wiki/Main_Page',
          mockSettings,
        ),
      ).toBe(0)
      expect(
        getActivePadSettingIndex('https://github.com/rinn7e', mockSettings),
      ).toBe(1)
    })

    it('falls back to index 0 when no matching pattern is found', () => {
      expect(
        getActivePadSettingIndex('https://google.com/', mockSettings),
      ).toBe(0)
    })
  })

  describe('parseUrlSegments', () => {
    it('successfully parses valid URLs into segments', () => {
      const parsed = parseUrlSegments('https://github.com/rinn7e/repo')
      expect(parsed).toEqual({
        origin: 'https://github.com',
        paths: ['rinn7e', 'repo'],
      })
    })

    it('returns null for empty or invalid URLs', () => {
      expect(parseUrlSegments('')).toBeNull()
      expect(parseUrlSegments('not-a-valid-url')).toBeNull()
    })
  })

  describe('buildGlobPatternFromSegments', () => {
    it('returns default fallback ** for null inputs', () => {
      expect(buildGlobPatternFromSegments(null)).toBe('**')
    })

    it('returns origin/** for URLs with no path segments', () => {
      expect(
        buildGlobPatternFromSegments({
          origin: 'https://google.com',
          paths: [],
        }),
      ).toBe('https://google.com/**')
    })

    it('returns origin/path{,/**} for URLs with exactly 1 path segment', () => {
      expect(
        buildGlobPatternFromSegments({
          origin: 'https://github.com',
          paths: ['rinn7e'],
        }),
      ).toBe('https://github.com/rinn7e{,/**}')
    })

    it('returns origin/path/** for URLs with more than 1 path segment', () => {
      expect(
        buildGlobPatternFromSegments({
          origin: 'https://github.com',
          paths: ['rinn7e', 'repo'],
        }),
      ).toBe('https://github.com/rinn7e/**')
    })
  })

  describe('determineIsDarkPure', () => {
    it('resolves dark theme Mode', () => {
      expect(determineIsDarkPure('dark', false)).toBe(true)
      expect(determineIsDarkPure('dark', true)).toBe(true)
    })

    it('resolves light theme Mode', () => {
      expect(determineIsDarkPure('light', false)).toBe(false)
      expect(determineIsDarkPure('light', true)).toBe(false)
    })

    it('resolves system theme Mode based on system preference', () => {
      expect(determineIsDarkPure('system', false)).toBe(false)
      expect(determineIsDarkPure('system', true)).toBe(true)
    })
  })

  describe('updatePadSettingInList', () => {
    const list: PadSettings[] = [
      { ...defaultPadSettings, matchPattern: 'site1' },
      { ...defaultPadSettings, matchPattern: 'site2' },
    ]

    it('returns original list if index is out of bounds', () => {
      expect(updatePadSettingInList(list, -1, (x) => x)).toBe(list)
      expect(updatePadSettingInList(list, 2, (x) => x)).toBe(list)
    })

    it('correctly updates list item using the updater function', () => {
      const updated = updatePadSettingInList(list, 1, (settings) => ({
        ...settings,
        matchPattern: 'site2-updated',
      }))
      expect(updated[1]?.matchPattern).toBe('site2-updated')
      expect(updated[0]?.matchPattern).toBe('site1')
      expect(updated).not.toBe(list) // verify immutability
    })
  })

  describe('swapArrayElements', () => {
    const list = ['a', 'b', 'c']

    it('swaps elements correctly when indices are valid', () => {
      expect(swapArrayElements(list, 0, 1)).toEqual(['b', 'a', 'c'])
      expect(swapArrayElements(list, 1, 2)).toEqual(['a', 'c', 'b'])
    })

    it('returns original list when indices are out of bounds', () => {
      expect(swapArrayElements(list, -1, 1)).toBe(list)
      expect(swapArrayElements(list, 0, 3)).toBe(list)
    })
  })

  describe('validateBackupData', () => {
    it('returns true for valid settings structures', () => {
      const validBackup = {
        global_settings: {
          schema_version: 1,
          enabled: true,
          showRuler: false,
        },
        'google.com': [
          {
            enabled: true,
            side: { _tag: 'Left', width: 80 },
            themeMode: 'system',
            light: {
              bgType: 'pattern',
              bgColor: 'transparent',
              bgPattern: 'dots',
            },
            dark: {
              bgType: 'pattern',
              bgColor: 'transparent',
              bgPattern: 'dots',
            },
            matchPattern: 'https://google.com/**',
          },
        ],
      }
      expect(validateBackupData(validBackup)).toBe(true)
    })

    it('returns false for non-object, null, or array inputs', () => {
      expect(validateBackupData(null)).toBe(false)
      expect(validateBackupData(undefined)).toBe(false)
      expect(validateBackupData('plain string')).toBe(false)
      expect(validateBackupData([])).toBe(false)
    })

    it('returns false for empty objects', () => {
      expect(validateBackupData({})).toBe(false)
    })

    it('returns false for invalid global_settings formats', () => {
      const badBackup = {
        global_settings: {
          schema_version: 1,
          enabled: 'should-be-boolean',
          showRuler: false,
        },
      }
      expect(validateBackupData(badBackup)).toBe(false)
    })

    it('returns false for invalid pad settings formats', () => {
      const badBackup = {
        'google.com': [
          {
            enabled: true,
            side: { _tag: 'Left', width: 'should-be-number' },
          },
        ],
      }
      expect(validateBackupData(badBackup)).toBe(false)
    })
  })
})
