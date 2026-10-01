/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-only
 */
import * as t from 'io-ts'

import { DEFAULT_FONT_SIZE } from '../env'

export type GlobalSetting = {
  // Tracks storage structure schema version. Useful for future storage migrations.
  // See: [storage-migration.md](/doc/storage-migration.md) for strategy details.
  schema_version: number
  enabled: boolean
  showRuler: boolean
  disableWhenNotMaximized: boolean
  fontSize?: number
}

export const GlobalSettingCodec = t.intersection([
  t.type({
    schema_version: t.number,
    enabled: t.boolean,
    showRuler: t.boolean,
    disableWhenNotMaximized: t.boolean,
  }),
  t.partial({
    fontSize: t.number,
  }),
])

export const defaultGlobalSetting: GlobalSetting = {
  schema_version: 1,
  enabled: true,
  showRuler: false,
  disableWhenNotMaximized: false,
  fontSize: DEFAULT_FONT_SIZE,
}

/**
 * True when a stored global setting changed in a way that matters to web
 * pages. The popup font size only affects the popup, so a change to it alone
 * doesn't need every open tab to re-read its settings.
 */
export const globalSettingChangeAffectsPages = (
  oldValue: unknown,
  newValue: unknown,
): boolean => {
  const withoutFontSize = (value: unknown) => {
    if (typeof value !== 'object' || value === null) return value
    const { fontSize: _fontSize, ...rest } = value as Record<string, unknown>
    return rest
  }
  return (
    JSON.stringify(withoutFontSize(oldValue)) !==
    JSON.stringify(withoutFontSize(newValue))
  )
}
