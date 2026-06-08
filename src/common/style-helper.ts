/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import { patterns } from './type/preset'

export const getActivePadThemePure = <T>(
  themeMode: 'light' | 'dark' | 'system',
  lightTheme: T,
  darkTheme: T,
  systemPrefersDark: boolean,
): T => {
  if (themeMode === 'light') {
    return lightTheme
  } else if (themeMode === 'dark') {
    return darkTheme
  } else {
    return systemPrefersDark ? darkTheme : lightTheme
  }
}

export const resolveBgStyles = (
  bgType: 'color' | 'pattern' | 'transparent',
  color: string,
  patternId: string,
): Record<string, string> => {
  if (bgType === 'color') {
    return {
      backgroundColor: color,
      backgroundImage: 'none',
      backgroundSize: '',
    }
  } else if (bgType === 'pattern') {
    const pat = patterns.find((p) => p.id === patternId) || patterns[0]
    if (!pat) {
      return {
        backgroundColor: 'transparent',
        backgroundImage: 'none',
        backgroundSize: '',
      }
    }
    return pat.style(color)
  } else {
    return {
      backgroundColor: 'transparent',
      backgroundImage: 'none',
      backgroundSize: '',
    }
  }
}
