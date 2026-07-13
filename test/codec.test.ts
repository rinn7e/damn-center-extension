/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-only
 */
import { describe, expect, it } from 'vitest'

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
