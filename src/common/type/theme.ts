/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type Theme = {
  id: string
  name: string
  headerFont: string
  normalFont: string

  // Light Mode Variables
  primaryColor: string
  secondaryColor: string
  bgCard: string
  bgInput: string
  borderCard: string
  borderInput: string
  textMain: string
  textMuted: string
  textDim: string

  // Dark Mode Equivalents (suffixed with Dark)
  primaryColorDark: string
  secondaryColorDark: string
  bgCardDark: string
  bgInputDark: string
  borderCardDark: string
  borderInputDark: string
  textMainDark: string
  textMutedDark: string
  textDimDark: string
}

export const themes: Record<string, Theme> = {
  neon: {
    id: 'neon',
    name: 'Neon Green',
    headerFont: "'Inter', sans-serif",
    normalFont: "'Inter', sans-serif",

    // Light Mode
    primaryColor: '#10b981', // emerald-500
    secondaryColor: '#f8fafc', // slate-50
    bgCard: '#ffffff', // white
    bgInput: '#f1f5f9', // slate-100
    borderCard: '#e2e8f0', // slate-200
    borderInput: '#cbd5e1', // slate-300
    textMain: '#0f172a', // slate-900
    textMuted: '#334155', // slate-700
    textDim: '#64748b', // slate-500

    // Dark Mode
    primaryColorDark: '#10b981', // emerald-500
    secondaryColorDark: '#090d16', // deep dark slate root BG
    bgCardDark: '#111827', // slate-900
    bgInputDark: '#1f2937', // slate-800
    borderCardDark: '#1f2937', // slate-800 border
    borderInputDark: '#374151', // slate-700 border
    textMainDark: '#f9fafb', // slate-50
    textMutedDark: '#cbd5e1', // slate-300
    textDimDark: '#9ca3af', // slate-400
  },
  solarizedLight: {
    id: 'solarizedLight',
    name: 'Solarized Light',
    headerFont: "'Inter', sans-serif",
    normalFont: "'Inter', sans-serif",

    // Light Mode (light base3 background, base2 card background, base01/base00 text, blue primary)
    primaryColor: '#2aa198', // solarized cyan
    secondaryColor: '#fdf6e3', // solarized base3 (root BG)
    bgCard: '#eee8d5', // solarized base2 (card BG)
    bgInput: '#e4ddcb', // slightly darker base for inputs
    borderCard: '#d3c7a7', // warm border for cards
    borderInput: '#93a1a1', // base1 border for inputs
    textMain: '#073642', // solarized base02 (main text)
    textMuted: '#586e75', // solarized base01 (body text)
    textDim: '#657b83', // solarized base00 (muted text)

    // Dark Mode (dark base03 background, base02 card background, base0/base1 text, cyan primary)
    primaryColorDark: '#2aa198', // solarized cyan
    secondaryColorDark: '#002b36', // solarized base03 (root BG)
    bgCardDark: '#073642', // solarized base02 (card BG)
    bgInputDark: '#0b4c5e', // slightly lighter base for inputs
    borderCardDark: '#586e75', // base01 border for cards
    borderInputDark: '#839496', // base0 border for inputs
    textMainDark: '#fdf6e3', // solarized base3 (main text)
    textMutedDark: '#93a1a1', // solarized base1 (body text)
    textDimDark: '#839496', // solarized base0 (muted text)
  },
}

export const injectTheme = (theme: Theme, isDark: boolean): void => {
  const root = document.documentElement
  root.style.setProperty(
    '--color-primary',
    isDark ? theme.primaryColorDark : theme.primaryColor,
  )
  root.style.setProperty(
    '--color-secondary',
    isDark ? theme.secondaryColorDark : theme.secondaryColor,
  )
  root.style.setProperty(
    '--color-bg-card',
    isDark ? theme.bgCardDark : theme.bgCard,
  )
  root.style.setProperty(
    '--color-bg-input',
    isDark ? theme.bgInputDark : theme.bgInput,
  )
  root.style.setProperty(
    '--color-border-card',
    isDark ? theme.borderCardDark : theme.borderCard,
  )
  root.style.setProperty(
    '--color-border-input',
    isDark ? theme.borderInputDark : theme.borderInput,
  )
  root.style.setProperty(
    '--color-text-main',
    isDark ? theme.textMainDark : theme.textMain,
  )
  root.style.setProperty(
    '--color-text-muted',
    isDark ? theme.textMutedDark : theme.textMuted,
  )
  root.style.setProperty(
    '--color-text-dim',
    isDark ? theme.textDimDark : theme.textDim,
  )
  root.style.setProperty('--font-header', theme.headerFont)
  root.style.setProperty('--font-normal', theme.normalFont)
}
