/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-only
 */
import * as t from 'io-ts'

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

export type ShiftingStrategy = { _tag: 'Flexbox' } | { _tag: 'Placeholder' }

export const ShiftingStrategyCodec = t.union([
  t.type({ _tag: t.literal('Flexbox') }),
  t.type({ _tag: t.literal('Placeholder') }),
])

export type DomainSetting = {
  _tag: 'DomainSetting'
  enabled: boolean
  updatedAt?: number
}

export const DomainSettingCodec = t.intersection([
  t.type({
    _tag: t.literal('DomainSetting'),
    enabled: t.boolean,
  }),
  t.partial({
    updatedAt: t.number,
  }),
])

export const defaultDomainSetting: DomainSetting = {
  _tag: 'DomainSetting',
  enabled: true,
}

export type PathSetting = {
  _tag: 'PathSetting'
  enabled: boolean
  side: PadSide
  themeMode: PadThemeMode
  light: PadTheme
  dark: PadTheme
  matchPattern: string
  shiftingStrategy: ShiftingStrategy
  updatedAt?: number
}

export const PathSettingCodec = t.intersection([
  t.type({
    _tag: t.literal('PathSetting'),
    enabled: t.boolean,
    side: PadSideCodec,
    themeMode: PadThemeModeCodec,
    light: PadThemeCodec,
    dark: PadThemeCodec,
    matchPattern: t.string,
    shiftingStrategy: ShiftingStrategyCodec,
  }),
  t.partial({
    updatedAt: t.number,
  }),
])

export const createDefaultPathSetting = (
  matchPattern: string,
): PathSetting => ({
  _tag: 'PathSetting',
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
  shiftingStrategy: { _tag: 'Flexbox' },
  updatedAt: Date.now(),
})

export const defaultPathSetting: PathSetting = createDefaultPathSetting('**')

export type PaddingSetting = DomainSetting | PathSetting

export const PaddingSettingCodec = new t.Type<PaddingSetting, unknown, unknown>(
  'PaddingSetting',
  (input): input is PaddingSetting =>
    DomainSettingCodec.is(input) || PathSettingCodec.is(input),
  (input, context) => {
    if (typeof input !== 'object' || input === null) {
      return t.failure(input, context)
    }
    const raw = input as any
    if (raw._tag === 'DomainSetting') {
      return DomainSettingCodec.validate(raw, context)
    } else {
      const withTag =
        raw._tag === 'PathSetting' ? raw : { ...raw, _tag: 'PathSetting' }
      return PathSettingCodec.validate(withTag, context)
    }
  },
  (output) => output,
)
