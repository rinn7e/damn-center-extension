/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-only
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { defaultGlobalSetting } from '../src/common/type/global-setting'
import { createDefaultPathSetting } from '../src/common/type/pad-setting'
import { runImport } from '../src/update'

type Store = Record<string, unknown>

// A fake chrome.storage.local that records the order of writes and can be
// told to fail the next set()
const fakeStorage = (initial: Store) => {
  const state = { data: { ...initial }, calls: [] as string[], failSet: '' }
  const runtime: { lastError?: { message: string } } = {}
  const finish = (callback: () => void, error?: string) => {
    runtime.lastError = error ? { message: error } : undefined
    callback()
    runtime.lastError = undefined
  }
  vi.stubGlobal('chrome', {
    runtime,
    storage: {
      local: {
        get: (_keys: null, callback: (items: Store) => void) =>
          callback({ ...state.data }),
        set: (items: Store, callback: () => void) => {
          state.calls.push('set')
          if (state.failSet) {
            finish(callback, state.failSet)
          } else {
            state.data = { ...state.data, ...items }
            finish(callback)
          }
        },
        remove: (keys: string[], callback: () => void) => {
          state.calls.push(`remove:${keys.join(',')}`)
          keys.forEach((key) => delete state.data[key])
          finish(callback)
        },
        clear: (callback: () => void) => {
          state.calls.push('clear')
          state.data = {}
          finish(callback)
        },
      },
    },
  })
  return state
}

const currentSettings: Store = {
  global_settings: defaultGlobalSetting,
  'example.com': [createDefaultPathSetting('https://example.com/**')],
  'old-site.org': [createDefaultPathSetting('https://old-site.org/**')],
}

const backup: Store = {
  global_settings: { ...defaultGlobalSetting, showRuler: true },
  'example.com': [createDefaultPathSetting('https://example.com/docs/**')],
}

describe('runImport', () => {
  const alert = vi.fn()
  const confirm = vi.fn(() => true)

  beforeEach(() => {
    alert.mockReset()
    confirm.mockReset().mockReturnValue(true)
    vi.stubGlobal('alert', alert)
    vi.stubGlobal('confirm', confirm)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('replaces the stored settings with the backup', async () => {
    const storage = fakeStorage(currentSettings)

    expect(await runImport(JSON.stringify(backup))).toBe(true)

    expect(storage.data).toEqual(backup)
    expect(alert).toHaveBeenCalledWith('Configuration imported successfully!')
  })

  it('writes the backup before removing anything, and never clears', async () => {
    const storage = fakeStorage(currentSettings)

    await runImport(JSON.stringify(backup))

    expect(storage.calls).toEqual(['set', 'remove:old-site.org'])
  })

  it('keeps the current settings when saving fails', async () => {
    const storage = fakeStorage(currentSettings)
    storage.failSet = 'QUOTA_BYTES quota exceeded'

    expect(await runImport(JSON.stringify(backup))).toBe(false)

    expect(storage.data).toEqual(currentSettings)
    expect(alert).toHaveBeenCalledWith(
      'Import failed while saving: QUOTA_BYTES quota exceeded',
    )
  })

  it('changes nothing when the user cancels', async () => {
    const storage = fakeStorage(currentSettings)
    confirm.mockReturnValue(false)

    expect(await runImport(JSON.stringify(backup))).toBe(false)

    expect(storage.calls).toEqual([])
    expect(storage.data).toEqual(currentSettings)
  })

  it('rejects a file that is not JSON without asking', async () => {
    const storage = fakeStorage(currentSettings)

    expect(await runImport('not json')).toBe(false)

    expect(alert).toHaveBeenCalledWith('This file is not valid JSON.')
    expect(confirm).not.toHaveBeenCalled()
    expect(storage.calls).toEqual([])
  })

  it('rejects JSON that is not a Damn Center backup', async () => {
    const storage = fakeStorage(currentSettings)

    expect(await runImport(JSON.stringify({ 'example.com': 'nope' }))).toBe(
      false,
    )

    expect(alert).toHaveBeenCalledWith('This file is not a Damn Center backup.')
    expect(storage.calls).toEqual([])
  })
})
