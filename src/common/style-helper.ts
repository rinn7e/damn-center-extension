/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import { type PadSide } from './type/pad-setting'
import { patterns } from './type/preset'

/**
 * Resolves the active theme settings based on the theme mode and system preference.
 */
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

/**
 * Resolves style properties for background color, SVG patterns, or transparency.
 */
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

/**
 * Calculates individual left and right pad widths from a PadSide configuration.
 */
export const resolvePadWidths = (
  side: PadSide,
): { leftWidth: number; rightWidth: number } => {
  if (side._tag === 'Left') {
    return { leftWidth: side.width, rightWidth: 0 }
  } else if (side._tag === 'Right') {
    return { leftWidth: 0, rightWidth: side.width }
  } else {
    return { leftWidth: side.leftWidth, rightWidth: side.rightWidth }
  }
}
