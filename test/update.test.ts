/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import { describe, expect, it } from 'vitest'

import { type PadSettings, defaultPadSettings } from '../src/type'
import {
  buildGlobPatternFromSegments,
  determineIsDarkPure,
  getActivePadSettingIndex,
  parseUrlSegments,
  resolveNewSidePure,
  resolveNewWidthPure,
  swapArrayElements,
  updatePadSettingInList,
  validateBackupData,
} from '../src/update'

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

  describe('resolveNewSidePure', () => {
    it('switches to Left side and preserves width', () => {
      expect(resolveNewSidePure({ _tag: 'Left', width: 100 }, 'Left')).toEqual({
        _tag: 'Left',
        width: 100,
      })
      expect(resolveNewSidePure({ _tag: 'Right', width: 120 }, 'Left')).toEqual(
        {
          _tag: 'Left',
          width: 120,
        },
      )
      expect(
        resolveNewSidePure(
          { _tag: 'Both', leftWidth: 90, rightWidth: 110 },
          'Left',
        ),
      ).toEqual({ _tag: 'Left', width: 90 })
    })

    it('switches to Right side and preserves width', () => {
      expect(resolveNewSidePure({ _tag: 'Left', width: 100 }, 'Right')).toEqual(
        {
          _tag: 'Right',
          width: 100,
        },
      )
      expect(
        resolveNewSidePure({ _tag: 'Right', width: 120 }, 'Right'),
      ).toEqual({
        _tag: 'Right',
        width: 120,
      })
      expect(
        resolveNewSidePure(
          { _tag: 'Both', leftWidth: 90, rightWidth: 110 },
          'Right',
        ),
      ).toEqual({ _tag: 'Right', width: 110 })
    })

    it('switches to Both side and resolves left/right fallback widths', () => {
      expect(resolveNewSidePure({ _tag: 'Left', width: 100 }, 'Both')).toEqual({
        _tag: 'Both',
        leftWidth: 100,
        rightWidth: 80,
      })
      expect(resolveNewSidePure({ _tag: 'Right', width: 120 }, 'Both')).toEqual(
        {
          _tag: 'Both',
          leftWidth: 80,
          rightWidth: 120,
        },
      )
      expect(
        resolveNewSidePure(
          { _tag: 'Both', leftWidth: 90, rightWidth: 110 },
          'Both',
        ),
      ).toEqual({ _tag: 'Both', leftWidth: 90, rightWidth: 110 })
    })
  })

  describe('resolveNewWidthPure', () => {
    it('sets left width correctly', () => {
      expect(
        resolveNewWidthPure({ _tag: 'Left', width: 100 }, 'left', 150),
      ).toEqual({
        _tag: 'Left',
        width: 150,
      })
      expect(
        resolveNewWidthPure(
          { _tag: 'Both', leftWidth: 90, rightWidth: 110 },
          'left',
          130,
        ),
      ).toEqual({ _tag: 'Both', leftWidth: 130, rightWidth: 110 })
      expect(
        resolveNewWidthPure({ _tag: 'Right', width: 100 }, 'left', 150),
      ).toEqual({ _tag: 'Right', width: 100 })
    })

    it('sets right width correctly', () => {
      expect(
        resolveNewWidthPure({ _tag: 'Right', width: 120 }, 'right', 160),
      ).toEqual({
        _tag: 'Right',
        width: 160,
      })
      expect(
        resolveNewWidthPure(
          { _tag: 'Both', leftWidth: 90, rightWidth: 110 },
          'right',
          140,
        ),
      ).toEqual({ _tag: 'Both', leftWidth: 90, rightWidth: 140 })
      expect(
        resolveNewWidthPure({ _tag: 'Left', width: 100 }, 'right', 150),
      ).toEqual({ _tag: 'Left', width: 100 })
    })
  })
})
