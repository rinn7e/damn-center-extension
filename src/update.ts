/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import * as TE from 'fp-ts/lib/TaskEither'
import { pipe } from 'fp-ts/lib/function'
import * as t from 'io-ts'
import { Cmd, Task } from 'tea-cup-fp'

import { UI_THEME_ID } from './common/env'
import { injectTheme, themes } from './common/type/theme'
import {
  getHostname,
  loadGlobalSetting,
  loadPadSettings,
  matchUrlPattern,
  saveGlobalSetting,
  savePadSettings,
} from './storage/storage'
import {
  type GlobalSetting,
  GlobalSettingCodec,
  type Hostname,
  type Model,
  type Msg,
  type PadSettings,
  PadSettingsCodec,
  createDefaultPadSettings,
  defaultGlobalSetting,
  defaultPadSettings,
} from './type'

export const getActivePadSettingIndex = (
  url: string,
  list: PadSettings[],
): number => {
  const enabledIndex = list.findIndex(
    (s) => s.enabled && matchUrlPattern(url, s.matchPattern),
  )
  if (enabledIndex !== -1) return enabledIndex

  const matchingIndex = list.findIndex((s) =>
    matchUrlPattern(url, s.matchPattern),
  )
  if (matchingIndex !== -1) return matchingIndex

  return 0
}

const getDefaultPatternForUrl = (url: string): string => {
  let defaultPattern = '**'
  try {
    if (url) {
      const parsed = new URL(url)
      const paths = parsed.pathname.split('/').filter(Boolean)
      if (paths.length > 0) {
        if (paths.length > 1) {
          defaultPattern = `${parsed.origin}/${paths[0]}/**`
        } else {
          defaultPattern = `${parsed.origin}/${paths[0]}**`
        }
      } else {
        defaultPattern = `${parsed.origin}/**`
      }
    }
  } catch {
    // Fallback to default pattern '**' if URL parsing fails
  }
  return defaultPattern
}

const determineIsDark = (themeMode: string): boolean => {
  if (themeMode === 'dark') {
    return true
  }
  if (themeMode === 'light') {
    return false
  }
  return typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false
}

const updateActiveSetting = (
  model: Model,
  updater: (active: PadSettings) => PadSettings,
): [Model, Cmd<Msg>] => {
  const active = model.padSettingList[model.selectedIndex]
  if (!active) return [model, Cmd.none()]
  const updatedActive = updater(active)
  const updatedList = [...model.padSettingList]
  updatedList[model.selectedIndex] = updatedActive
  return [
    { ...model, padSettingList: updatedList },
    Cmd.batch([
      saveSettingsCmd(
        model.hostname,
        model.currentUrl,
        updatedList,
        model.globalSetting,
      ),
      injectThemeCmd(updatedActive),
    ]),
  ]
}

const handleInit = (
  msg: Extract<Msg, { _tag: 'Init' }>,
  model: Model | null,
): [Model, Cmd<Msg>] => {
  const selectedIndex = getActivePadSettingIndex(
    msg.currentUrl,
    msg.padSettingList,
  )
  const activeSettings = msg.padSettingList[selectedIndex] || {
    ...defaultPadSettings,
    enabled: false,
  }
  const hasUrlMatch = msg.padSettingList.some((item) =>
    matchUrlPattern(msg.currentUrl, item.matchPattern),
  )
  const defaultCollapsed = hasUrlMatch ? true : false

  return [
    {
      hostname: msg.hostname,
      currentUrl: msg.currentUrl,
      globalSetting: msg.globalSetting,
      padSettingList: msg.padSettingList,
      selectedIndex,
      activePresetTab: model ? model.activePresetTab : 'light',
      matchesCollapsed: model ? model.matchesCollapsed : defaultCollapsed,
    },
    injectThemeCmd(activeSettings),
  ]
}

const handleToggleEnabled = (
  msg: Extract<Msg, { _tag: 'ToggleEnabled' }>,
  model: Model,
): [Model, Cmd<Msg>] => {
  const target = model.padSettingList[msg.index]
  if (!target) return [model, Cmd.none()]
  const updatedTarget = { ...target, enabled: !target.enabled }
  const updatedList = [...model.padSettingList]
  updatedList[msg.index] = updatedTarget
  const updatedIndex = getActivePadSettingIndex(model.currentUrl, updatedList)
  const activeSettings = updatedList[updatedIndex] || defaultPadSettings
  return [
    { ...model, padSettingList: updatedList, selectedIndex: updatedIndex },
    Cmd.batch([
      saveSettingsCmd(
        model.hostname,
        model.currentUrl,
        updatedList,
        model.globalSetting,
      ),
      injectThemeCmd(activeSettings),
    ]),
  ]
}

const handleAddPadSetting = (model: Model): [Model, Cmd<Msg>] => {
  const defaultPattern = getDefaultPatternForUrl(model.currentUrl)
  const newSetting = createDefaultPadSettings(defaultPattern)
  const updatedList = [newSetting, ...model.padSettingList]
  const updatedIndex = getActivePadSettingIndex(model.currentUrl, updatedList)
  const updatedGlobal = { ...model.globalSetting, showRuler: true }
  return [
    {
      ...model,
      padSettingList: updatedList,
      selectedIndex: updatedIndex,
      globalSetting: updatedGlobal,
      matchesCollapsed: false,
    },
    Cmd.batch([
      saveGlobalSettingCmd(updatedGlobal),
      saveSettingsCmd(
        model.hostname,
        model.currentUrl,
        updatedList,
        updatedGlobal,
      ),
      injectThemeCmd(updatedList[updatedIndex] || defaultPadSettings),
    ]),
  ]
}

const handleDeletePadSetting = (
  msg: Extract<Msg, { _tag: 'DeletePadSetting' }>,
  model: Model,
): [Model, Cmd<Msg>] => {
  const updatedList = model.padSettingList.filter((_, idx) => idx !== msg.index)
  const updatedIndex = getActivePadSettingIndex(model.currentUrl, updatedList)
  const activeSettings = updatedList[updatedIndex] || {
    ...defaultPadSettings,
    enabled: false,
  }
  return [
    {
      ...model,
      padSettingList: updatedList,
      selectedIndex: updatedIndex,
    },
    Cmd.batch([
      saveSettingsCmd(
        model.hostname,
        model.currentUrl,
        updatedList,
        model.globalSetting,
      ),
      injectThemeCmd(activeSettings),
    ]),
  ]
}

const handleUpdateMatchPattern = (
  msg: Extract<Msg, { _tag: 'UpdateMatchPattern' }>,
  model: Model,
): [Model, Cmd<Msg>] => {
  const target = model.padSettingList[msg.index]
  if (!target) return [model, Cmd.none()]
  const updatedTarget = { ...target, matchPattern: msg.matchPattern }
  const updatedList = [...model.padSettingList]
  updatedList[msg.index] = updatedTarget
  const updatedIndex = getActivePadSettingIndex(model.currentUrl, updatedList)
  const activeSettings = updatedList[updatedIndex] || defaultPadSettings
  return [
    { ...model, padSettingList: updatedList, selectedIndex: updatedIndex },
    Cmd.batch([
      saveSettingsCmd(
        model.hostname,
        model.currentUrl,
        updatedList,
        model.globalSetting,
      ),
      injectThemeCmd(activeSettings),
    ]),
  ]
}

const handleMoveMatchUp = (
  msg: Extract<Msg, { _tag: 'MoveMatchUp' }>,
  model: Model,
): [Model, Cmd<Msg>] => {
  const idx = msg.index
  if (idx <= 0 || idx >= model.padSettingList.length) return [model, Cmd.none()]
  const updatedList = [...model.padSettingList]
  const temp = updatedList[idx]
  updatedList[idx] = updatedList[idx - 1]
  updatedList[idx - 1] = temp
  const updatedIndex = getActivePadSettingIndex(model.currentUrl, updatedList)
  const activeSettings = updatedList[updatedIndex] || defaultPadSettings
  return [
    { ...model, padSettingList: updatedList, selectedIndex: updatedIndex },
    Cmd.batch([
      saveSettingsCmd(
        model.hostname,
        model.currentUrl,
        updatedList,
        model.globalSetting,
      ),
      injectThemeCmd(activeSettings),
    ]),
  ]
}

const handleMoveMatchDown = (
  msg: Extract<Msg, { _tag: 'MoveMatchDown' }>,
  model: Model,
): [Model, Cmd<Msg>] => {
  const idx = msg.index
  if (idx < 0 || idx >= model.padSettingList.length - 1)
    return [model, Cmd.none()]
  const updatedList = [...model.padSettingList]
  const temp = updatedList[idx]
  updatedList[idx] = updatedList[idx + 1]
  updatedList[idx + 1] = temp
  const updatedIndex = getActivePadSettingIndex(model.currentUrl, updatedList)
  const activeSettings = updatedList[updatedIndex] || defaultPadSettings
  return [
    { ...model, padSettingList: updatedList, selectedIndex: updatedIndex },
    Cmd.batch([
      saveSettingsCmd(
        model.hostname,
        model.currentUrl,
        updatedList,
        model.globalSetting,
      ),
      injectThemeCmd(activeSettings),
    ]),
  ]
}

const handleToggleGlobalEnabled = (model: Model): [Model, Cmd<Msg>] => {
  const updatedGlobal = {
    ...model.globalSetting,
    enabled: !model.globalSetting.enabled,
  }
  const activeSettings =
    model.padSettingList[model.selectedIndex] || defaultPadSettings
  return [
    { ...model, globalSetting: updatedGlobal },
    Cmd.batch([
      saveGlobalSettingCmd(updatedGlobal),
      saveSettingsCmd(
        model.hostname,
        model.currentUrl,
        model.padSettingList,
        updatedGlobal,
      ),
      injectThemeCmd(activeSettings),
    ]),
  ]
}

export const init = (): [Model | null, Cmd<Msg>] => {
  return [null, loadInitialDataCmd()]
}

export const update = (
  msg: Msg,
  model: Model | null,
): [Model | null, Cmd<Msg>] => {
  if (model === null) {
    if (msg._tag === 'Init') {
      return handleInit(msg, null)
    }
    return [null, Cmd.none()]
  }

  switch (msg._tag) {
    case 'Init':
      return handleInit(msg, model)

    case 'ToggleGlobalEnabled':
      return handleToggleGlobalEnabled(model)

    case 'ToggleEnabled':
      return handleToggleEnabled(msg, model)

    case 'SetPadSideType':
      return updateActiveSetting(model, (active) => {
        let updatedSide = active.side
        if (msg.sideType === 'Left') {
          const currentWidth =
            active.side._tag === 'Left' || active.side._tag === 'Right'
              ? active.side.width
              : active.side.leftWidth
          updatedSide = { _tag: 'Left', width: currentWidth }
        } else if (msg.sideType === 'Right') {
          const currentWidth =
            active.side._tag === 'Left' || active.side._tag === 'Right'
              ? active.side.width
              : active.side.rightWidth
          updatedSide = { _tag: 'Right', width: currentWidth }
        } else if (msg.sideType === 'Both') {
          const leftW =
            active.side._tag === 'Left'
              ? active.side.width
              : active.side._tag === 'Both'
                ? active.side.leftWidth
                : 80
          const rightW =
            active.side._tag === 'Right'
              ? active.side.width
              : active.side._tag === 'Both'
                ? active.side.rightWidth
                : 80
          updatedSide = { _tag: 'Both', leftWidth: leftW, rightWidth: rightW }
        }
        return { ...active, side: updatedSide }
      })

    case 'SetPadWidth':
      return updateActiveSetting(model, (active) => {
        let updatedSide = active.side
        if (msg.sideType === 'left') {
          if (active.side._tag === 'Left') {
            updatedSide = { _tag: 'Left', width: msg.width }
          } else if (active.side._tag === 'Both') {
            updatedSide = {
              _tag: 'Both',
              leftWidth: msg.width,
              rightWidth: active.side.rightWidth,
            }
          }
        } else if (msg.sideType === 'right') {
          if (active.side._tag === 'Right') {
            updatedSide = { _tag: 'Right', width: msg.width }
          } else if (active.side._tag === 'Both') {
            updatedSide = {
              _tag: 'Both',
              leftWidth: active.side.leftWidth,
              rightWidth: msg.width,
            }
          }
        }
        return { ...active, side: updatedSide }
      })

    case 'SetPadThemeMode':
      return updateActiveSetting(model, (active) => ({
        ...active,
        themeMode: msg.themeMode,
      }))

    case 'SetActivePresetTab':
      return [{ ...model, activePresetTab: msg.tab }, Cmd.none()]

    case 'UpdateBgType':
      return updateActiveSetting(model, (active) => ({
        ...active,
        [msg.theme]: {
          ...active[msg.theme],
          bgType: msg.bgType,
        },
      }))

    case 'UpdateBgColor':
      return updateActiveSetting(model, (active) => ({
        ...active,
        [msg.theme]: {
          ...active[msg.theme],
          bgColor: msg.bgColor,
        },
      }))

    case 'UpdateBgPattern':
      return updateActiveSetting(model, (active) => ({
        ...active,
        [msg.theme]: {
          ...active[msg.theme],
          bgPattern: msg.bgPattern,
        },
      }))

    case 'AddPadSetting':
      return handleAddPadSetting(model)

    case 'DeletePadSetting':
      return handleDeletePadSetting(msg, model)

    case 'UpdateMatchPattern':
      return handleUpdateMatchPattern(msg, model)

    case 'MoveMatchUp':
      return handleMoveMatchUp(msg, model)

    case 'MoveMatchDown':
      return handleMoveMatchDown(msg, model)

    case 'ToggleShowRuler': {
      const updatedGlobal = {
        ...model.globalSetting,
        showRuler: !model.globalSetting.showRuler,
      }
      const activeSettings =
        model.padSettingList[model.selectedIndex] || defaultPadSettings
      return [
        { ...model, globalSetting: updatedGlobal },
        Cmd.batch([
          saveGlobalSettingCmd(updatedGlobal),
          saveSettingsCmd(
            model.hostname,
            model.currentUrl,
            model.padSettingList,
            updatedGlobal,
          ),
          injectThemeCmd(activeSettings),
        ]),
      ]
    }

    case 'ToggleMatchesCollapsed':
      return [
        { ...model, matchesCollapsed: !model.matchesCollapsed },
        Cmd.none(),
      ]

    case 'ExportConfig':
      return [model, triggerExportCmd()]

    case 'ImportConfig':
      return [model, triggerImportCmd(msg.jsonText)]

    case 'NoOp':
      return [model, Cmd.none()]
  }
}

// Side effects task runners
// -------------------------------------------------------------

const validateBackupData = (data: unknown): boolean => {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return false
  }
  const keys = Object.keys(data)
  if (keys.length === 0) return false
  for (const key of keys) {
    const val = (data as Record<string, unknown>)[key]
    if (key === 'global_settings') {
      const decoded = GlobalSettingCodec.decode(val)
      if (decoded._tag === 'Left') return false
    } else {
      const decoded = t.array(PadSettingsCodec).decode(val)
      if (decoded._tag === 'Left') return false
    }
  }
  return true
}

const triggerExportCmd = (): Cmd<Msg> => {
  return Task.attempt(
    Task.fromPromise(() => {
      return new Promise<void>((resolve) => {
        if (
          typeof chrome === 'undefined' ||
          !chrome.storage ||
          !chrome.storage.local
        ) {
          console.warn('[Damn Center] storage.local not available for export')
          resolve()
          return
        }
        chrome.storage.local.get(null, (allData) => {
          try {
            const jsonStr = JSON.stringify(allData, null, 2)
            const blob = new Blob([jsonStr], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'damn-center-backup.json'
            a.click()
            URL.revokeObjectURL(url)
          } catch (e) {
            console.error('[Damn Center] Export error:', e)
          }
          resolve()
        })
      })
    }),
    (): Msg => ({ _tag: 'NoOp' }),
  )
}

const triggerImportCmd = (jsonText: string): Cmd<Msg> => {
  return Task.attempt(
    Task.fromPromise(async () => {
      if (
        typeof chrome === 'undefined' ||
        !chrome.storage ||
        !chrome.storage.local
      ) {
        alert('Storage API is not available.')
        return
      }

      try {
        const parsed = JSON.parse(jsonText)
        if (!validateBackupData(parsed)) {
          alert('Invalid backup file format.')
          return
        }

        await new Promise<void>((resolve, reject) => {
          chrome.storage.local.clear(() => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message))
            } else {
              resolve()
            }
          })
        })

        await new Promise<void>((resolve, reject) => {
          chrome.storage.local.set(parsed, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message))
            } else {
              resolve()
            }
          })
        })

        alert('Configuration imported successfully!')
        window.location.reload()
      } catch (e) {
        console.error('[Damn Center] Import failed:', e)
        alert('Failed to parse backup file.')
      }
    }),
    (): Msg => ({ _tag: 'NoOp' }),
  )
}

const queryActiveTabAndSettings = (): Promise<{
  hostname: Hostname
  currentUrl: string
  globalSetting: GlobalSetting
  padSettingList: PadSettings[]
}> => {
  return new Promise((resolve) => {
    const defaultUrl =
      'https://some-extremely-long-subdomain.and-even-longer-domain-name.co.uk/'
    const defaultHost = getHostname(defaultUrl)

    if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.tabs.query) {
      resolve({
        hostname: defaultHost,
        currentUrl: defaultUrl,
        globalSetting: defaultGlobalSetting,
        padSettingList: [defaultPadSettings],
      })
      return
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0]
      const url = (activeTab && activeTab.url) || defaultUrl
      const host = getHostname(url)
      Promise.all([loadGlobalSetting()(), loadPadSettings(host)()]).then(
        ([globalEither, padEither]) => {
          const globalSetting =
            globalEither._tag === 'Right'
              ? globalEither.right
              : defaultGlobalSetting
          const padSettingList =
            padEither._tag === 'Right'
              ? padEither.right
              : [createDefaultPadSettings('https://' + host + '/**')]
          resolve({
            hostname: host,
            currentUrl: url,
            globalSetting,
            padSettingList,
          })
        },
      )
    })
  })
}

export const loadInitialDataCmd = (): Cmd<Msg> => {
  return Task.attempt(
    Task.fromPromise(queryActiveTabAndSettings),
    (res): Msg => {
      if (res.tag === 'Ok') {
        return {
          _tag: 'Init',
          hostname: res.value.hostname,
          currentUrl: res.value.currentUrl,
          globalSetting: res.value.globalSetting,
          padSettingList: res.value.padSettingList,
        }
      }
      return {
        _tag: 'Init',
        hostname: 'unknown-domain' as Hostname,
        currentUrl: '',
        globalSetting: defaultGlobalSetting,
        padSettingList: [defaultPadSettings],
      }
    },
  )
}

const persistSettingsAndMessageTab = (
  host: Hostname,
  currentUrl: string,
  settingsList: PadSettings[],
  globalSetting: GlobalSetting,
): Promise<void> => {
  return new Promise((resolve) => {
    pipe(
      savePadSettings(host, settingsList),
      TE.fold(
        (err) => {
          console.error('[Damn Center] Failed to save settings list:', err)
          resolve()
          return TE.left(err)
        },
        () => {
          if (
            typeof chrome !== 'undefined' &&
            chrome.tabs &&
            chrome.tabs.query
          ) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              const activeTab = tabs[0]
              if (activeTab && activeTab.id) {
                const activeUrl = activeTab.url || currentUrl
                const matched = settingsList.find(
                  (s) =>
                    s.enabled && matchUrlPattern(activeUrl, s.matchPattern),
                )
                const activeSettings = matched || {
                  ...defaultPadSettings,
                  enabled: false,
                }
                const settingsToInject = globalSetting.enabled
                  ? activeSettings
                  : { ...activeSettings, enabled: false }
                try {
                  chrome.tabs.sendMessage(
                    activeTab.id,
                    {
                      type: 'SETTINGS_UPDATED',
                      settings: settingsToInject,
                      globalSetting: globalSetting,
                    },
                    () => {
                      const err = chrome.runtime.lastError
                      if (err) {
                        console.log(
                          '[Damn Center] Content script listener not active on tab:',
                          err.message,
                        )
                      }
                      resolve()
                    },
                  )
                } catch (e) {
                  console.log('[Damn Center] Message error caught:', e)
                  resolve()
                }
              } else {
                resolve()
              }
            })
          } else {
            resolve()
          }
          return TE.right(undefined)
        },
      ),
    )()
  })
}

export const saveSettingsCmd = (
  host: Hostname,
  currentUrl: string,
  settingsList: PadSettings[],
  globalSetting: GlobalSetting,
): Cmd<Msg> => {
  return Task.attempt(
    Task.fromPromise(() =>
      persistSettingsAndMessageTab(
        host,
        currentUrl,
        settingsList,
        globalSetting,
      ),
    ),
    (): Msg => ({ _tag: 'NoOp' }),
  )
}

export const saveGlobalSettingCmd = (
  globalSetting: GlobalSetting,
): Cmd<Msg> => {
  return Task.attempt(
    Task.fromPromise(async () => {
      const res = await saveGlobalSetting(globalSetting)()
      if (res._tag === 'Left') {
        console.error('[Damn Center] Failed to save global setting:', res.left)
      }
    }),
    (): Msg => ({ _tag: 'NoOp' }),
  )
}

const runInjectTheme = (settings: PadSettings) => {
  const activeTheme = themes[UI_THEME_ID] || themes.neon
  const isDark = determineIsDark(settings.themeMode)
  injectTheme(activeTheme, isDark)
}

export const injectThemeCmd = (settings: PadSettings): Cmd<Msg> => {
  return Task.attempt(
    Task.fromPromise(() => {
      runInjectTheme(settings)
      return Promise.resolve()
    }),
    (): Msg => ({ _tag: 'NoOp' }),
  )
}
