/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import * as t from 'io-ts'

export type GlobalSetting = {
  // Tracks storage structure schema version. Useful for future storage migrations.
  // See: [publish_checklist.md](file:///home/rinne/projects/rinn7e-technology-project/symmetry-project/damn-center-extension/doc/publish_checklist.md) for strategy details.
  schema_version: number
  enabled: boolean
  showRuler: boolean
}

export const GlobalSettingCodec = t.type({
  schema_version: t.number,
  enabled: t.boolean,
  showRuler: t.boolean,
})

export const defaultGlobalSetting: GlobalSetting = {
  schema_version: 1,
  enabled: true,
  showRuler: false,
}

export type PadSide =
  | { _tag: 'Left'; width: number }
  | { _tag: 'Right'; width: number }
  | { _tag: 'Both'; leftWidth: number; rightWidth: number }

export const PadSideCodec = t.union([
  t.type({ _tag: t.literal('Left'), width: t.number }),
  t.type({ _tag: t.literal('Right'), width: t.number }),
  t.type({
    _tag: t.literal('Both'),
    leftWidth: t.number,
    rightWidth: t.number,
  }),
])

export type PadBgType = 'color' | 'pattern' | 'transparent'

export const PadBgTypeCodec: t.Type<PadBgType> = t.union([
  t.literal('color'),
  t.literal('pattern'),
  t.literal('transparent'),
])

export type PadThemeMode = 'light' | 'dark' | 'system'

export const PadThemeModeCodec: t.Type<PadThemeMode> = t.union([
  t.literal('light'),
  t.literal('dark'),
  t.literal('system'),
])

export type PadTheme = {
  bgType: PadBgType
  bgColor: string
  bgPattern: string
}

export const PadThemeCodec: t.Type<PadTheme> = t.type({
  bgType: PadBgTypeCodec,
  bgColor: t.string,
  bgPattern: t.string,
})

export type PadSettings = {
  enabled: boolean
  side: PadSide
  themeMode: PadThemeMode
  light: PadTheme
  dark: PadTheme
  matchPattern: string
}

export const PadSettingsCodec = t.type({
  enabled: t.boolean,
  side: PadSideCodec,
  themeMode: PadThemeModeCodec,
  light: PadThemeCodec,
  dark: PadThemeCodec,
  matchPattern: t.string,
})

export const createDefaultPadSettings = (
  matchPattern: string,
): PadSettings => ({
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
  matchPattern,
})

export const defaultPadSettings: PadSettings = createDefaultPadSettings('**')

export type Hostname = string & { readonly __brand: unique symbol }

export const HostnameCodec = new t.Type<Hostname, string, unknown>(
  'Hostname',
  (u): u is Hostname => typeof u === 'string',
  (u, c) =>
    typeof u === 'string' ? t.success(u as Hostname) : t.failure(u, c),
  (a) => a,
)

export interface Model {
  hostname: Hostname
  currentUrl: string
  globalSetting: GlobalSetting
  padSettingList: PadSettings[]
  selectedIndex: number
  activePresetTab: 'light' | 'dark'
  matchesCollapsed: boolean
}

export type Msg =
  | {
      _tag: 'Init'
      hostname: Hostname
      currentUrl: string
      globalSetting: GlobalSetting
      padSettingList: PadSettings[]
    }
  | { _tag: 'ToggleGlobalEnabled' }
  | { _tag: 'ToggleEnabled'; index: number }
  | { _tag: 'SetPadSideType'; sideType: 'Left' | 'Right' | 'Both' }
  | { _tag: 'SetPadWidth'; sideType: 'left' | 'right'; width: number }
  | { _tag: 'SetPadThemeMode'; themeMode: PadThemeMode }
  | { _tag: 'SetActivePresetTab'; tab: 'light' | 'dark' }
  | { _tag: 'UpdateBgType'; theme: 'light' | 'dark'; bgType: PadBgType }
  | { _tag: 'UpdateBgColor'; theme: 'light' | 'dark'; bgColor: string }
  | { _tag: 'UpdateBgPattern'; theme: 'light' | 'dark'; bgPattern: string }
  | { _tag: 'AddPadSetting' }
  | { _tag: 'DeletePadSetting'; index: number }
  | { _tag: 'UpdateMatchPattern'; index: number; matchPattern: string }
  | { _tag: 'MoveMatchUp'; index: number }
  | { _tag: 'MoveMatchDown'; index: number }
  | { _tag: 'ToggleShowRuler' }
  | { _tag: 'ToggleMatchesCollapsed' }
  | { _tag: 'NoOp' }
