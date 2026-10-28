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
 * Save the settings of a specific domain.
 */
export const saveSiteSetting = (
  hostname: Hostname,
  siteSetting: SiteSetting,
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
          chrome.storage.local.set({ [hostname]: siteSetting }, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message))
            } else {
              resolve()
            }
          })
        }
      })
    },
    (reason) => reason as Error,
  )
}

/**
 * The writes that bring stored data up to the current schema version, or
 * null when it is already there. Version 1 stored one list of rules per site
 * for every screen; it becomes the rules of `monitor`, the monitor the popup
 * is opened on, and the old list is kept under `backup_v1_<key>` in case the
 * conversion lost something. Values that don't decode are left as they are
 * (reading them still falls back to no rules).
 */
export const migrateStoredData = (
  stored: Record<string, unknown>,
  monitor: Monitor,
): Record<string, unknown> | null => {
  const rawGlobal = stored['global_settings']
  const decodedGlobal = GlobalSettingCodec.decode(rawGlobal)
  const fromVersion =
    decodedGlobal._tag === 'Right' ? decodedGlobal.right.schema_version : 1
  if (fromVersion >= CURRENT_SCHEMA_VERSION) {
    return null
  } else {
    const writes: Record<string, unknown> = {
      global_settings: {
        ...defaultGlobalSetting,
        ...(decodedGlobal._tag === 'Right' ? decodedGlobal.right : {}),
        schema_version: CURRENT_SCHEMA_VERSION,
      },
    }
    for (const [key, value] of Object.entries(stored)) {
      if (
        key !== 'global_settings' &&
        !key.startsWith('backup_v') &&
        Array.isArray(value)
      ) {
        const decoded = decodeStoredSiteSetting(value, monitor)
        if (decoded._tag === 'Right') {
          writes[key] = decoded.right
          writes[`backup_v1_${key}`] = value
        }
      }
    }
    return writes
  }
}

/**
 * Brings stored data up to the current schema version. The popup runs it
 * when it opens, with the monitor of the active tab; pages read either
 * version, so they never need to wait.
 */
export const migrateStorage = (
  monitor: Monitor,
): TE.TaskEither<Error, void> => {
  return TE.tryCatch(
    async () => {
      return new Promise<void>((resolve, reject) => {
        if (
          typeof chrome === 'undefined' ||
          !chrome.storage ||
          !chrome.storage.local
        ) {
          resolve()
        } else {
          chrome.storage.local.get(null, (stored) => {
            if (chrome.runtime?.lastError || !stored) {
              reject(
                new Error(
                  chrome.runtime?.lastError?.message ?? 'Storage read failed',
                ),
              )
              return
            }
            const writes = migrateStoredData(stored, monitor)
            if (writes === null) {
              resolve()
            } else {
              chrome.storage.local.set(writes, () => {
                if (chrome.runtime.lastError) {
                  reject(new Error(chrome.runtime.lastError.message))
                } else {
                  resolve()
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
          chrome.storage.local.set(
            { ['global_settings']: globalSetting },
            () => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message))
              } else {
                resolve()
              }
            },
          )
        }
      })
    },
    (reason) => reason as Error,
  )
}
