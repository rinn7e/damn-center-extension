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

// Version 2 stores each site as a SiteSetting instead of a list
export const CURRENT_SCHEMA_VERSION = 2

/**
 * The schema version of stored data, read from its raw `global_settings`
 * value. Version 1 may have saved no global settings at all. Only the number
 * is read, so data from a newer schema still counts as newer when the rest of
 * its global settings no longer decodes with `GlobalSettingCodec`.
 */
export const storedSchemaVersion = (rawGlobal: unknown): number => {
  if (typeof rawGlobal !== 'object' || rawGlobal === null) {
    return 1
  } else {
    const version = (rawGlobal as Record<string, unknown>)['schema_version']
    return typeof version === 'number' ? version : 1
  }
}

/**
 * True when stored data was written by a newer version of the extension,
 * whose format this one does not know. Such data is read but never written
 * back, so going back to an older version does not destroy it.
 */
export const isNewerSchema = (rawGlobal: unknown): boolean =>
  storedSchemaVersion(rawGlobal) > CURRENT_SCHEMA_VERSION

export const defaultGlobalSetting: GlobalSetting = {
  schema_version: CURRENT_SCHEMA_VERSION,
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
