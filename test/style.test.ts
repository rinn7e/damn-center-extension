/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import { describe, expect, it } from 'vitest'

import {
  getActivePadThemePure,
  resolveBgStyles,
} from '../src/common/style-helper'

describe('Style Helpers', () => {
  describe('getActivePadThemePure', () => {
    const lightTheme = { name: 'light-theme' }
    const darkTheme = { name: 'dark-theme' }

    it('returns light theme when mode is light', () => {
      expect(getActivePadThemePure('light', lightTheme, darkTheme, false)).toBe(
        lightTheme,
      )
      expect(getActivePadThemePure('light', lightTheme, darkTheme, true)).toBe(
        lightTheme,
      )
    })

    it('returns dark theme when mode is dark', () => {
      expect(getActivePadThemePure('dark', lightTheme, darkTheme, false)).toBe(
        darkTheme,
      )
      expect(getActivePadThemePure('dark', lightTheme, darkTheme, true)).toBe(
        darkTheme,
      )
    })

    it('returns theme matching system preference when mode is system', () => {
      expect(
        getActivePadThemePure('system', lightTheme, darkTheme, false),
      ).toBe(lightTheme)
      expect(getActivePadThemePure('system', lightTheme, darkTheme, true)).toBe(
        darkTheme,
      )
    })
  })

  describe('resolveBgStyles', () => {
    it('returns plain color rules when type is color', () => {
      const styles = resolveBgStyles('color', '#ff0000', 'none')
      expect(styles).toEqual({
        backgroundColor: '#ff0000',
        backgroundImage: 'none',
        backgroundSize: '',
      })
    })

    it('returns pattern styles when type is pattern', () => {
      const styles = resolveBgStyles('pattern', '#ffffff', 'dots')
      expect(styles.backgroundColor).toBe('#ffffff')
      expect(styles.backgroundImage).toContain('radial-gradient')
      expect(styles.backgroundSize).toBe('16px 16px')
    })

    it('returns transparent rules for invalid pattern IDs or type transparent', () => {
      const styles = resolveBgStyles('transparent', '#ffffff', 'none')
      expect(styles).toEqual({
        backgroundColor: 'transparent',
        backgroundImage: 'none',
        backgroundSize: '',
      })

      const badPatternStyles = resolveBgStyles(
        'pattern',
        '#ffffff',
        'invalid-pattern-id',
      )
      expect(badPatternStyles).toEqual({
        backgroundColor: '#ffffff',
        backgroundImage: 'none',
      })
    })
  })
})
