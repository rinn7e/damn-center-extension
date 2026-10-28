/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-only
 */
import { describe, expect, it } from 'vitest'

import {
  defaultGlobalSetting,
  isNewerSchema,
  storedSchemaVersion,
} from '../src/common/type/global-setting'
import {
  PaddingSettingCodec,
  defaultPathSetting,
} from '../src/common/type/pad-setting'

describe('PaddingSettingCodec', () => {
  it('correctly decodes a DomainSetting', () => {
    const raw = {
      _tag: 'DomainSetting',
      enabled: false,
      updatedAt: 123456789,
    }
    const result = PaddingSettingCodec.decode(raw)
    expect(result._tag).toBe('Right')
    if (result._tag === 'Right') {
      expect(result.right).toEqual(raw)
    }
  })

  it('correctly decodes a PathSetting with tag', () => {
    const raw = {
      ...defaultPathSetting,
      _tag: 'PathSetting',
      matchPattern: 'https://github.com/**',
    }
    const result = PaddingSettingCodec.decode(raw)
    expect(result._tag).toBe('Right')
    if (result._tag === 'Right') {
      expect(result.right).toEqual(raw)
    }
  })

  it('correctly decodes a legacy PadSettings (without tag) and defaults tag to PathSetting', () => {
    const rawLegacy = {
      enabled: true,
      side: { _tag: 'Left', width: 120 },
      themeMode: 'dark',
      light: {
        bgType: 'color',
        bgColor: '#ffffff',
        bgPattern: '',
      },
      dark: {
        bgType: 'color',
        bgColor: '#000000',
        bgPattern: '',
      },
      matchPattern: 'https://google.com/**',
      shiftingStrategy: { _tag: 'Flexbox' },
      updatedAt: 987654321,
    }

    const result = PaddingSettingCodec.decode(rawLegacy)
    expect(result._tag).toBe('Right')
    if (result._tag === 'Right') {
      expect(result.right).toEqual({
        ...rawLegacy,
        _tag: 'PathSetting',
      })
    }
  })

  it('fails decoding on invalid values', () => {
    const invalid = {
      enabled: 'not-a-boolean',
    }
    const result = PaddingSettingCodec.decode(invalid)
    expect(result._tag).toBe('Left')
  })
})

describe('storedSchemaVersion', () => {
  it('reads the version of the stored global settings', () => {
    expect(storedSchemaVersion(defaultGlobalSetting)).toBe(2)
    expect(storedSchemaVersion({ schema_version: 3, theme: 'auto' })).toBe(3)
  })

  it('counts data without a version as version 1', () => {
    expect(storedSchemaVersion(undefined)).toBe(1)
    expect(storedSchemaVersion({ enabled: true })).toBe(1)
    expect(storedSchemaVersion('2')).toBe(1)
  })

  it('tells data of a newer schema apart', () => {
    expect(isNewerSchema({ schema_version: 3 })).toBe(true)
    expect(isNewerSchema(defaultGlobalSetting)).toBe(false)
    expect(isNewerSchema(undefined)).toBe(false)
  })
})
