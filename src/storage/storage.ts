/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-only
 */
import * as TE from 'fp-ts/lib/TaskEither'
import * as t from 'io-ts'
import picomatch from 'picomatch'

import {
  type GlobalSetting,
  GlobalSettingCodec,
  defaultGlobalSetting,
} from '../common/type/global-setting'
import { type Hostname } from '../common/type/hostname'
import { type PadSettings, PadSettingsCodec } from '../common/type/pad-setting'

/**
 * Extracts the clean hostname from a URL string.
 */
export const getHostname = (urlStr: string): Hostname => {
  try {
    if (
      !urlStr ||
      urlStr.startsWith('chrome://') ||
      urlStr.startsWith('chrome-extension://')
    ) {
      return 'system-settings' as Hostname
    } else {
      const url = new URL(urlStr)
      return url.hostname as Hostname
    }
  } catch {
    return 'unknown-domain' as Hostname
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
 * Load settings list for a specific domain.
 */
export const loadPadSettings = (
  hostname: Hostname,
): TE.TaskEither<Error, PadSettings[]> => {
  return TE.tryCatch(
    async () => {
      return new Promise<PadSettings[]>((resolve) => {
        if (
          typeof chrome === 'undefined' ||
          !chrome.storage ||
          !chrome.storage.local
        ) {
          resolve([])
        } else {
          chrome.storage.local.get([hostname], (res) => {
            const raw = res[hostname]
            if (!raw) {
              resolve([])
            } else {
              const decodedList = t.array(PadSettingsCodec).decode(raw)
              if (decodedList._tag === 'Right') {
                resolve(decodedList.right)
              } else {
                console.warn(
                  `Failed to decode settings for ${hostname}, returning empty list`,
                )
                resolve([])
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
 * Save settings list for a specific domain.
 */
export const savePadSettings = (
  hostname: Hostname,
  settingsList: PadSettings[],
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
          chrome.storage.local.set({ [hostname]: settingsList }, () => {
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
 * Load global extension settings.
 */
export const loadGlobalSetting = (): TE.TaskEither<Error, GlobalSetting> => {
  return TE.tryCatch(
    async () => {
      return new Promise<GlobalSetting>((resolve) => {
        if (
          typeof chrome === 'undefined' ||
          !chrome.storage ||
          !chrome.storage.local
        ) {
          resolve(defaultGlobalSetting)
        } else {
          chrome.storage.local.get(['global_settings'], (res) => {
            const raw = res['global_settings']
            if (!raw) {
              resolve(defaultGlobalSetting)
            } else {
              const decoded = GlobalSettingCodec.decode(raw)
              if (decoded._tag === 'Right') {
                resolve(decoded.right)
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
