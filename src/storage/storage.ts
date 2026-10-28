/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-only
 */
import * as TE from 'fp-ts/TaskEither'
import picomatch from 'picomatch'

import {
  CURRENT_SCHEMA_VERSION,
  type GlobalSetting,
  GlobalSettingCodec,
  defaultGlobalSetting,
  storedSchemaVersion,
} from '../common/type/global-setting'
import { type Hostname } from '../common/type/hostname'
import { type Monitor } from '../common/type/monitor'
import {
  type SiteSetting,
  decodeStoredSiteSetting,
  defaultSiteSetting,
} from '../common/type/site-setting'

/**
 * Extracts the clean hostname from a URL string.
 */
export const getHostname = (urlStr: string): Hostname => {
  if (!urlStr) {
    return 'system-settings' as Hostname
  } else {
    let url: URL
    try {
      url = new URL(urlStr)
    } catch {
      return 'unknown-domain' as Hostname
    }
    // Only web pages get their own settings. Browser and extension pages
    // (chrome://, about:, file://, moz-extension://, …) share one key, so edits
    // made there don't land under empty or per-install keys
    return (
      url.protocol === 'http:' || url.protocol === 'https:'
        ? url.hostname
        : 'system-settings'
    ) as Hostname
  }
}

/**
 * Helper to match a URL against a picomatch glob pattern.
 */
export const matchUrlPattern = (urlStr: string, pattern: string): boolean => {
  try {
    if (!pattern) {
      return false
    } else {
      const isMatch = picomatch(pattern.trim(), { nocase: true })
      return isMatch(urlStr.trim())
    }
  } catch {
    // If glob pattern is invalid (e.g. while typing), fallback to substring inclusion
    return urlStr.toLowerCase().includes(pattern.toLowerCase())
  }
}

/**
 * Compiles a glob pattern using picomatch to verify it is valid, returning the error message if invalid.
 */
export const getGlobError = (pattern: string): string | null => {
  if (!pattern.trim()) {
    return null
  } else {
    try {
      picomatch(pattern.trim())
      return null
    } catch (e) {
      return e instanceof Error ? e.message : String(e)
    }
  }
}

/**
 * Load the settings of a specific domain. A value saved by schema version 1
 * is read as the rules of `monitor`, the monitor of the caller.
 */
export const loadSiteSetting = (
  hostname: Hostname,
  monitor: Monitor,
): TE.TaskEither<Error, SiteSetting> => {
  return TE.tryCatch(
    async () => {
      return new Promise<SiteSetting>((resolve, reject) => {
        if (
          typeof chrome === 'undefined' ||
          !chrome.storage ||
          !chrome.storage.local
        ) {
          resolve(defaultSiteSetting)
        } else {
          chrome.storage.local.get([hostname], (res) => {
            // A failed read (e.g. after the extension was updated under an
            // open page) must fail the task rather than leave it pending
            if (chrome.runtime?.lastError || !res) {
              reject(
                new Error(
                  chrome.runtime?.lastError?.message ?? 'Storage read failed',
                ),
              )
              return
            }
            const raw = res[hostname]
            if (!raw) {
              resolve(defaultSiteSetting)
            } else {
              const decoded = decodeStoredSiteSetting(raw, monitor)
              if (decoded._tag === 'Right') {
                resolve(decoded.right)
              } else {
                console.warn(
                  `Failed to decode settings for ${hostname}, using no rules`,
                )
                resolve(defaultSiteSetting)
              }
            }
          })
        }
      })
    },
    (reason) => reason as Error,
  )
}

/**
 * Writes `items` to storage, only when the stored data is in the format of
 * this build, or nothing is stored yet. Otherwise nothing is written and the
 * task fails: an older version of the extension never overwrites what a
 * newer one saved, and nothing in the new format lands among settings that
 * still wait for their migration (which would mark them as migrated).
 */
const saveIfCurrentSchema = (
  items: Record<string, unknown>,
): TE.TaskEither<Error, void> => {
  return TE.tryCatch(
    async () => {
      return new Promise<void>((resolve, reject) => {
        if (
          typeof chrome === 'undefined' ||
          !chrome.storage ||
          !chrome.storage.local
        ) {
          reject(new Error('chrome.storage.local is not available'))
        } else {
          const write = (toWrite: Record<string, unknown>) =>
            chrome.storage.local.set(toWrite, () => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message))
              } else {
                resolve()
              }
            })
          const refuse = (version: number) =>
            reject(
              new Error(
                `Stored settings use schema version ${version}, not ${CURRENT_SCHEMA_VERSION}; not saving over them`,
              ),
            )
          // Most saves only need the global settings to know the format
          chrome.storage.local.get(['global_settings'], (res) => {
            if (chrome.runtime?.lastError || !res) {
              reject(
                new Error(
                  chrome.runtime?.lastError?.message ?? 'Storage read failed',
                ),
              )
            } else if (res['global_settings'] !== undefined) {
              const version = storedSchemaVersion(res['global_settings'])
              if (version === CURRENT_SCHEMA_VERSION) {
                write(items)
              } else {
                refuse(version)
              }
            } else {
              // Without global settings, any other value means version 1
              // data; empty storage gets the current version with this write
              chrome.storage.local.get(null, (all) => {
                if (chrome.runtime?.lastError || !all) {
                  reject(
                    new Error(
                      chrome.runtime?.lastError?.message ??
                        'Storage read failed',
                    ),
                  )
                } else if (Object.keys(all).length > 0) {
                  refuse(1)
                } else {
                  write({ global_settings: defaultGlobalSetting, ...items })
                }
              })
            }
          })
        }
      })
    },
    (reason) => reason as Error,
  )
}

/**
 * Save the settings of a specific domain.
 */
export const saveSiteSetting = (
  hostname: Hostname,
  siteSetting: SiteSetting,
): TE.TaskEither<Error, void> =>
  saveIfCurrentSchema({ [hostname]: siteSetting })

// Everything in chrome.storage.local, by key
export type StoredData = Record<string, unknown>

/**
 * One step of the stored format, from schema version `to - 1` to `to`. It
 * gets every stored value, as the step before left them, and returns them
 * all in its own format: a key it leaves out is removed. `global_settings`
 * comes in as stored; the runner sets its schema_version. A step that has
 * shipped in a release is never changed: add a new one instead (see
 * doc/storage-migration.md).
 */
export type MigrationStep = {
  to: number
  migrate: (stored: StoredData, monitor: Monitor) => StoredData
}

// Version 1 stored one list of rules per site for every screen; it becomes
// the rules of `monitor`, the monitor the popup is opened on. Values that
// don't decode are left as they are (reading them still falls back to no
// rules).
const migrateSchema1To2 = (stored: StoredData, monitor: Monitor): StoredData =>
  Object.fromEntries(
    Object.entries(stored).map(([key, value]) => {
      if (key === 'global_settings' || !Array.isArray(value)) {
        return [key, value]
      } else {
        const decoded = decodeStoredSiteSetting(value, monitor)
        return [key, decoded._tag === 'Right' ? decoded.right : value]
      }
    }),
  )

// Every step, in order. The last one goes to CURRENT_SCHEMA_VERSION.
export const MIGRATION_STEPS: MigrationStep[] = [
  { to: 2, migrate: migrateSchema1To2 },
]

// What a migration changes in storage: the values to set, then the keys to
// remove
export type StorageWrites = { set: StoredData; remove: string[] }

// The same JSON value, whatever the order of the keys of its objects
const sameJson = (a: unknown, b: unknown): boolean => {
  const sorted = (value: unknown): unknown =>
    Array.isArray(value)
      ? value.map(sorted)
      : typeof value === 'object' && value !== null
        ? Object.fromEntries(
            Object.entries(value)
              .sort(([x], [y]) => (x < y ? -1 : 1))
              .map(([key, item]) => [key, sorted(item)]),
          )
        : value
  return JSON.stringify(sorted(a)) === JSON.stringify(sorted(b))
}

/**
 * The writes that bring stored data up to the last schema version of
 * `steps`, or null when it is already there or newer. The steps after the
 * stored version run in order, all in memory, so data that missed several
 * releases is written once, and only the values the steps changed or removed
 * are written. Data from a newer schema is left alone, even when its global
 * settings don't decode here.
 */
export const migrateStoredData = (
  stored: StoredData,
  monitor: Monitor,
  steps: MigrationStep[] = MIGRATION_STEPS,
): StorageWrites | null => {
  const fromVersion = storedSchemaVersion(stored['global_settings'])
  const toVersion = steps[steps.length - 1]?.to ?? 1
  if (fromVersion >= toVersion) {
    return null
  } else {
    const migrated = steps
      .filter((step) => step.to > fromVersion)
      .reduce((data, step) => step.migrate(data, monitor), stored)
    // Global settings that exist must come out of the steps in the current
    // format: resetting them to the defaults would lose the user's choices
    // and still count as a successful migration. Missing ones (version 1 did
    // not always save them) get the defaults.
    const rawGlobal = migrated['global_settings']
    const decodedGlobal = GlobalSettingCodec.decode({
      ...(typeof rawGlobal === 'object' && rawGlobal !== null ? rawGlobal : {}),
      schema_version: toVersion,
    })
    if (rawGlobal !== undefined && decodedGlobal._tag === 'Left') {
      throw new Error(
        `The global settings do not match format ${toVersion} after the migration`,
      )
    }
    const set: StoredData = {
      global_settings: {
        ...defaultGlobalSetting,
        ...(decodedGlobal._tag === 'Right' ? decodedGlobal.right : {}),
        schema_version: toVersion,
      },
    }
    for (const [key, value] of Object.entries(migrated)) {
      if (key !== 'global_settings' && !sameJson(value, stored[key])) {
        set[key] = value
      }
    }
    const remove = Object.keys(stored).filter((key) => !(key in migrated))
    return { set, remove }
  }
}

const readAllStorage = (): Promise<StoredData> =>
  new Promise((resolve, reject) =>
    chrome.storage.local.get(null, (stored) => {
      if (chrome.runtime?.lastError || !stored) {
        reject(
          new Error(
            chrome.runtime?.lastError?.message ?? 'Storage read failed',
          ),
        )
      } else {
        resolve(stored)
      }
    }),
  )

// The new values and schema_version are written in one call, so the
// migration either happens or writes nothing. Keys a step dropped are
// removed afterwards; if that fails, the settings are migrated all the same
// and the keys stay as unused leftovers, so it only logs.
const applyWrites = (writes: StorageWrites): Promise<void> =>
  new Promise((resolve, reject) =>
    chrome.storage.local.set(writes.set, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
      } else if (writes.remove.length === 0) {
        resolve()
      } else {
        chrome.storage.local.remove(writes.remove, () => {
          if (chrome.runtime.lastError) {
            console.warn(
              '[Damn Center] Could not remove old keys:',
              chrome.runtime.lastError.message,
            )
          }
          resolve()
        })
      }
    }),
  )

const hasStorage = (): boolean =>
  typeof chrome !== 'undefined' && !!chrome.storage && !!chrome.storage.local

// How the format of stored data compares with the one this build expects
export type StoredSchema =
  | { _tag: 'Current' }
  | { _tag: 'Older'; version: number }
  | { _tag: 'Newer'; version: number }

/**
 * Compares the schema version of stored data with the one this build
 * expects, when the popup opens. Older data is migrated once the user
 * confirms it (the popup runs `migrateStorage` then); newer data was saved
 * by a newer version of the extension and is never written over. A fresh
 * install (nothing stored) gets the current schema_version right away.
 * Pages read every older version, so they never wait for this.
 */
export const checkStoredSchema = (
  monitor: Monitor,
): TE.TaskEither<Error, StoredSchema> =>
  TE.tryCatch(
    async (): Promise<StoredSchema> => {
      if (!hasStorage()) {
        return { _tag: 'Current' }
      } else {
        const stored = await readAllStorage()
        const version = storedSchemaVersion(stored['global_settings'])
        if (version > CURRENT_SCHEMA_VERSION) {
          return { _tag: 'Newer', version }
        } else if (version === CURRENT_SCHEMA_VERSION) {
          return { _tag: 'Current' }
        } else if (Object.keys(stored).length > 0) {
          return { _tag: 'Older', version }
        } else {
          const writes = migrateStoredData(stored, monitor)
          if (writes !== null) await applyWrites(writes)
          return { _tag: 'Current' }
        }
      }
    },
    (reason) => (reason instanceof Error ? reason : new Error(String(reason))),
  )

/**
 * Brings stored data up to the current schema version, once the user
 * confirmed it in the popup, with the monitor of the active tab. Fails with
 * the reason (a step that throws, or a storage error), and then nothing has
 * been written.
 */
export const migrateStorage = (monitor: Monitor): TE.TaskEither<Error, void> =>
  TE.tryCatch(
    async () => {
      if (hasStorage()) {
        const writes = migrateStoredData(await readAllStorage(), monitor)
        if (writes !== null) {
          await applyWrites(writes)
        }
      }
    },
    (reason) => (reason instanceof Error ? reason : new Error(String(reason))),
  )

/**
 * Load global extension settings.
 */
export const loadGlobalSetting = (): TE.TaskEither<Error, GlobalSetting> => {
  return TE.tryCatch(
    async () => {
      return new Promise<GlobalSetting>((resolve, reject) => {
        if (
          typeof chrome === 'undefined' ||
          !chrome.storage ||
          !chrome.storage.local
        ) {
          resolve(defaultGlobalSetting)
        } else {
          chrome.storage.local.get(['global_settings'], (res) => {
            // A failed read (e.g. after the extension was updated under an
            // open page) must fail the task rather than leave it pending
            if (chrome.runtime?.lastError || !res) {
              reject(
                new Error(
                  chrome.runtime?.lastError?.message ?? 'Storage read failed',
                ),
              )
              return
            }
            const raw = res['global_settings']
            if (!raw) {
              resolve(defaultGlobalSetting)
            } else {
              const decoded = GlobalSettingCodec.decode(raw)
              if (decoded._tag === 'Right') {
                resolve({
                  ...defaultGlobalSetting,
                  ...decoded.right,
                })
              } else {
                resolve(defaultGlobalSetting)
              }
            }
          })
        }
      })
    },
    (reason) => reason as Error,
  )
}

/**
 * Save global extension settings.
 */
export const saveGlobalSetting = (
  globalSetting: GlobalSetting,
): TE.TaskEither<Error, void> =>
  saveIfCurrentSchema({ ['global_settings']: globalSetting })
