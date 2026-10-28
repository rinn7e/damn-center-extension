/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-only
 */
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  CURRENT_SCHEMA_VERSION,
  defaultGlobalSetting,
} from '../src/common/type/global-setting'
import { type Hostname } from '../src/common/type/hostname'
import { type Monitor } from '../src/common/type/monitor'
import {
  type PaddingSetting,
  type PathSetting,
} from '../src/common/type/pad-setting'
import { rulesFor } from '../src/common/type/site-setting'
import {
  checkStoredSchema,
  loadGlobalSetting,
  loadSiteSetting,
  migrateStorage,
  migrateStoredData,
} from '../src/storage/storage'
import { runImport, validateBackupData } from '../src/update'

// Real exports made with released versions, by their own Export Config
// button (see doc/storage-migration.md). Each change of the storage format
// adds the export of the release before it, and these tests check that the
// current code still loads, migrates and imports every one of them.

type Store = Record<string, unknown>

const readFixture = (name: string): string =>
  readFileSync(new URL(`./fixture/${name}`, import.meta.url), 'utf8')

const monitor: Monitor = { width: 3440, height: 1440 }

const pathSettings = (list: unknown): PathSetting[] =>
  (list as PaddingSetting[]).filter(
    (item): item is PathSetting => item._tag === 'PathSetting',
  )

// A fake chrome.storage.local holding `initial`
const fakeStorage = (initial: Store) => {
  const state = { data: structuredClone(initial) }
  vi.stubGlobal('chrome', {
    runtime: {},
    storage: {
      local: {
        get: (keys: string[] | null, callback: (items: Store) => void) =>
          callback(
            structuredClone(
              keys === null
                ? state.data
                : Object.fromEntries(
                    keys
                      .filter((key) => key in state.data)
                      .map((key) => [key, state.data[key]]),
                  ),
            ),
          ),
        set: (items: Store, callback: () => void) => {
          state.data = { ...state.data, ...structuredClone(items) }
          callback()
        },
        remove: (keys: string[], callback: () => void) => {
          keys.forEach((key) => delete state.data[key])
          callback()
        },
      },
    },
  })
  return state
}

describe('an export made with 2.0.0 (schema 1)', () => {
  const text = readFixture('backup-2.0.0.json')
  const backup = JSON.parse(text) as Store
  const sites = ['en.wikipedia.org', 'news.ycombinator.com']

  beforeEach(() => {
    vi.stubGlobal('alert', vi.fn())
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('holds two sites with rules and changed global settings', () => {
    // Guards the fixture itself, so the tests below check something
    expect(Object.keys(backup).sort()).toEqual(
      ['global_settings', ...sites].sort(),
    )
    expect(backup.global_settings).toEqual(
      expect.objectContaining({ schema_version: 1, fontSize: 20 }),
    )
    sites.forEach((site) =>
      expect(pathSettings(backup[site]).length).toBeGreaterThan(1),
    )
  })

  it('is accepted as a backup', () => {
    expect(validateBackupData(backup)).toBe(true)
  })

  it('loads as stored, before the popup migrates it', async () => {
    fakeStorage(backup)

    const global = await loadGlobalSetting()()
    expect(global).toEqual({
      _tag: 'Right',
      right: { ...defaultGlobalSetting, ...(backup.global_settings as Store) },
    })
    for (const site of sites) {
      const loaded = await loadSiteSetting(site as Hostname, monitor)()
      if (loaded._tag === 'Left') throw loaded.left
      expect(rulesFor(loaded.right, monitor)).toEqual(
        pathSettings(backup[site]),
      )
    }
    const hackerNews = await loadSiteSetting(
      'news.ycombinator.com' as Hostname,
      monitor,
    )()
    expect(hackerNews).toEqual(
      expect.objectContaining({
        right: expect.objectContaining({ enabled: false }),
      }),
    )
  })

  it('migrates to the current schema without losing anything', () => {
    const result = migrateStoredData(backup, monitor)
    if (result === null) throw new Error('expected a migration')
    const writes = result.set

    expect(result.remove).toEqual([])
    expect(writes.global_settings).toEqual({
      ...(backup.global_settings as Store),
      schema_version: CURRENT_SCHEMA_VERSION,
    })
    for (const site of sites) {
      const domain = (backup[site] as PaddingSetting[]).find(
        (item) => item._tag === 'DomainSetting',
      )
      expect(writes[site]).toEqual({
        _tag: 'SiteSetting',
        enabled: domain?.enabled,
        updatedAt: domain?.updatedAt,
        monitors: [{ monitor, rules: pathSettings(backup[site]) }],
      })
    }
    // Nothing else is written: no backups
    expect(Object.keys(writes).sort()).toEqual(
      ['global_settings', ...sites].sort(),
    )
    const migrated = { ...backup, ...writes }
    expect(validateBackupData(migrated)).toBe(true)
    expect(migrateStoredData(migrated, monitor)).toBeNull()
  })

  it('imports over current settings, and the popup then migrates it on OK', async () => {
    const storage = fakeStorage({
      global_settings: defaultGlobalSetting,
      'example.com': {
        _tag: 'SiteSetting',
        enabled: true,
        monitors: [],
      },
    })

    expect(await runImport(text)).toBe(true)
    expect(storage.data).toEqual(backup)

    // What the popup does when it opens again after the import: it asks,
    // then migrates once the user clicks OK
    expect(await checkStoredSchema(monitor)()).toEqual({
      _tag: 'Right',
      right: { _tag: 'Older', version: 1 },
    })
    expect(storage.data).toEqual(backup)
    expect((await migrateStorage(monitor)())._tag).toBe('Right')
    expect(storage.data).toEqual({
      ...backup,
      ...migrateStoredData(backup, monitor)?.set,
    })
    const loaded = await loadSiteSetting('en.wikipedia.org' as Hostname, {
      width: 1920,
      height: 1080,
    })()
    // Migrated rules belong to the monitor of the popup, not to every screen
    expect(loaded).toEqual(
      expect.objectContaining({
        right: expect.objectContaining({
          monitors: [
            { monitor, rules: pathSettings(backup['en.wikipedia.org']) },
          ],
        }),
      }),
    )
  })
})
