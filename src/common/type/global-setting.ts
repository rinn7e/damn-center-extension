/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import * as t from 'io-ts'

export type GlobalSetting = {
  // Tracks storage structure schema version. Useful for future storage migrations.
  // See: [publish_checklist.md](/doc/publish_checklist.md) for strategy details.
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
