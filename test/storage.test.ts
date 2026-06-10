/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-only
 */
import { describe, expect, it, vi } from 'vitest'

import {
  getGlobError,
  getHostname,
  matchUrlPattern,
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
