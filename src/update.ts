/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-only
 */
import * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'
import { Cmd, Task } from 'tea-cup-fp'

import { DEFAULT_FONT_SIZE, UI_THEME_ID } from './common/env'
import {
  type GlobalSetting,
  GlobalSettingCodec,
  defaultGlobalSetting,
  isNewerSchema,
} from './common/type/global-setting'
import { type Hostname } from './common/type/hostname'
import {
  type Monitor,
  MonitorCodec,
  getCurrentMonitor,
  isSameMonitor,
} from './common/type/monitor'
import {
  type DomainSetting,
  type PadSide,
  type PathSetting,
  createDefaultPathSetting,
  defaultPathSetting,
} from './common/type/pad-setting'
import {
  type SiteSetting,
  defaultSiteSetting,
  isStoredSiteSetting,
  rulesFor,
  setRulesFor,
} from './common/type/site-setting'
import { injectTheme, themes } from './common/type/theme'
import {
  checkStoredSchema,
  getHostname,
  loadGlobalSetting,
  loadSiteSetting,
  matchUrlPattern,
  migrateStorage,
  saveGlobalSetting,
  saveSiteSetting,
} from './storage/storage'
import { type Migration, type Model, type Msg } from './type'

export const getActivePadSettingIndex = (
  url: string,
  list: PathSetting[],
): number => {
  const enabledIndex = list.findIndex(
    (s) => s.enabled && matchUrlPattern(url, s.matchPattern),
  )
  if (enabledIndex !== -1) {
    return enabledIndex
  } else {
    const matchingIndex = list.findIndex((s) =>
      matchUrlPattern(url, s.matchPattern),
    )
    if (matchingIndex !== -1) {
      return matchingIndex
    } else {
      return 0
    }
  }
}

export type UrlSegments = {
  origin: string
  paths: string[]
}

export const parseUrlSegments = (url: string): UrlSegments | null => {
  try {
    if (!url) {
      return null
    } else {
      const parsed = new URL(url)
      const paths = parsed.pathname.split('/').filter(Boolean)
      return { origin: parsed.origin, paths }
    }
  } catch {
    return null
  }
}

export const buildGlobPatternFromSegments = (
  segments: UrlSegments | null,
): string => {
  if (!segments) {
    return '**'
  } else {
    const { origin, paths } = segments
    if (paths.length > 0) {
      if (paths.length > 1) {
        return `${origin}/${paths[0]}/**`
      } else {
        return `${origin}/${paths[0]}{,/**}`
      }
    } else {
      return `${origin}/**`
    }
  }
}

const getDefaultPatternForUrl = (url: string): string => {
  const segments = parseUrlSegments(url)
  return buildGlobPatternFromSegments(segments)
}

export const determineIsDarkPure = (
  themeMode: string,
  systemPrefersDark: boolean,
): boolean => {
  if (themeMode === 'dark') {
    return true
  } else if (themeMode === 'light') {
    return false
  } else {
    return systemPrefersDark
  }
}

/**
 * Resolves the new PadSide structure when switching between Left, Right, or Both side configurations.
 */
export const resolveNewSidePure = (
  currentSide: PadSide,
  sideType: 'Left' | 'Right' | 'Both',
): PadSide => {
  if (sideType === 'Left') {
    const currentWidth =
      currentSide._tag === 'Left' || currentSide._tag === 'Right'
        ? currentSide.width
        : currentSide.leftWidth
    return { _tag: 'Left', width: currentWidth }
  } else if (sideType === 'Right') {
    const currentWidth =
      currentSide._tag === 'Left' || currentSide._tag === 'Right'
        ? currentSide.width
        : currentSide.rightWidth
    return { _tag: 'Right', width: currentWidth }
  } else {
    const leftW =
      currentSide._tag === 'Left'
        ? currentSide.width
        : currentSide._tag === 'Both'
          ? currentSide.leftWidth
          : 80
    const rightW =
      currentSide._tag === 'Right'
        ? currentSide.width
        : currentSide._tag === 'Both'
          ? currentSide.rightWidth
          : 80
    return { _tag: 'Both', leftWidth: leftW, rightWidth: rightW }
  }
}

/**
 * Resolves the new PadSide structure when adjusting left or right width inputs.
 */
export const resolveNewWidthPure = (
  currentSide: PadSide,
  sideType: 'left' | 'right',
  width: number,
): PadSide => {
  if (sideType === 'left') {
    if (currentSide._tag === 'Left') {
      return { _tag: 'Left', width }
    } else if (currentSide._tag === 'Both') {
      return {
        _tag: 'Both',
        leftWidth: width,
        rightWidth: currentSide.rightWidth,
      }
    } else {
      return currentSide
    }
  } else if (sideType === 'right') {
    if (currentSide._tag === 'Right') {
      return { _tag: 'Right', width }
    } else if (currentSide._tag === 'Both') {
      return {
        _tag: 'Both',
        leftWidth: currentSide.leftWidth,
        rightWidth: width,
      }
    } else {
      return currentSide
    }
  } else {
    return currentSide
  }
}

const determineIsDark = (themeMode: string): boolean => {
  const systemPrefersDark =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  return determineIsDarkPure(themeMode, systemPrefersDark)
}

export const updatePadSettingInList = (
  list: PathSetting[],
  index: number,
  updater: (settings: PathSetting) => PathSetting,
): PathSetting[] => {
  const target = list[index]
  if (!target) {
    return list
  } else {
    const updatedList = [...list]
    updatedList[index] = {
      ...updater(target),
      updatedAt: Date.now(),
    }
    return updatedList
  }
}

/** The rules in use on the model's monitor, the ones the popup edits. */
export const activeRules = (model: Model): PathSetting[] =>
  rulesFor(model.site, model.monitor)

/** The rules of the monitor the popup shows. */
export const viewedRules = (model: Model): PathSetting[] =>
  rulesFor(model.site, model.viewedMonitor)

/** True while the popup shows another monitor than the tab's, read only. */
export const isViewingOtherMonitor = (model: Model): boolean =>
  !isSameMonitor(model.viewedMonitor, model.monitor)

// The only messages handled while stored settings wait for their migration:
// the prompt itself, its backup download, and the popup getting ready
const allowedBeforeMigration: Msg['_tag'][] = [
  'Init',
  'RunMigration',
  'MigrationDone',
  'MigrationFailed',
  'ExportConfig',
  'InjectThemeDone',
  'SetFontSizeDone',
  'NoOp',
]

// Messages that change the rules of the tab's monitor. They only make sense
// while the popup shows that monitor, since they refer to its list.
const isRuleEdit = (msg: Msg): boolean => {
  switch (msg._tag) {
    case 'ToggleEnabled':
    case 'SetPadSideType':
    case 'SetPadWidth':
    case 'SetPadThemeMode':
    case 'UpdateBgType':
    case 'UpdateBgColor':
    case 'UpdateBgPattern':
    case 'AddPadSetting':
    case 'DeletePadSetting':
    case 'UpdateMatchPattern':
    case 'MoveMatchUp':
    case 'MoveMatchDown':
      return true
    default:
      return false
  }
}

/**
 * Adds `rule` to `list`, replacing the rule with the same URL pattern if
 * there is one; otherwise it goes last, so the rules already there keep
 * their priority.
 */
export const copyRuleInto = (
  list: PathSetting[],
  rule: PathSetting,
): PathSetting[] =>
  list.some((item) => item.matchPattern === rule.matchPattern)
    ? list.map((item) =>
        item.matchPattern === rule.matchPattern ? rule : item,
      )
    : [...list, rule]

/** Adds the rules of `from` whose URL pattern `list` doesn't have yet. */
export const copyMissingRulesInto = (
  list: PathSetting[],
  from: PathSetting[],
): PathSetting[] => [
  ...list,
  ...from.filter(
    (rule) => !list.some((item) => item.matchPattern === rule.matchPattern),
  ),
]

/** Replaces the rules in use on the model's monitor. */
const withActiveRules = (model: Model, rules: PathSetting[]): Model => ({
  ...model,
  site: setRulesFor(model.site, model.monitor, rules),
})

const updateActiveSetting = (
  model: Model,
  updater: (active: PathSetting) => PathSetting,
): [Model, Cmd<Msg>] => {
  const updatedList = updatePadSettingInList(
    activeRules(model),
    model.selectedIndex,
    updater,
  )
  const updatedActive = updatedList[model.selectedIndex]
  if (!updatedActive) {
    return [model, Cmd.none()]
  } else {
    const updatedModel = withActiveRules(model, updatedList)
    return [
      updatedModel,
      Cmd.batch([saveSettingsCmd(updatedModel), injectThemeCmd(updatedActive)]),
    ]
  }
}

export const swapArrayElements = <T>(
  list: T[],
  idx1: number,
  idx2: number,
): T[] => {
  if (idx1 < 0 || idx1 >= list.length || idx2 < 0 || idx2 >= list.length) {
    return list
  } else {
    const updatedList = [...list]
    const temp = updatedList[idx1]
    updatedList[idx1] = updatedList[idx2]
    updatedList[idx2] = temp
    return updatedList
  }
}

// The user confirmed the migration prompt, or tries again after a failure
const handleRunMigration = (model: Model): [Model, Cmd<Msg>] => {
  if (model.migration._tag === 'Needed' || model.migration._tag === 'Failed') {
    return [
      {
        ...model,
        migration: {
          _tag: 'Running',
          fromVersion: model.migration.fromVersion,
        },
      },
      runMigrationCmd(model.monitor),
    ]
  } else {
    return [model, Cmd.none()]
  }
}

const handleInit = (
  msg: Extract<Msg, { _tag: 'Init' }>,
  model: Model | null,
): [Model, Cmd<Msg>] => {
  const padSettingList = rulesFor(msg.site, msg.monitor)
  const selectedIndex = getActivePadSettingIndex(msg.currentUrl, padSettingList)
  const activeSettings = padSettingList[selectedIndex] || {
    ...defaultPathSetting,
    enabled: false,
  }
  const hasUrlMatch = padSettingList.some((item) =>
    matchUrlPattern(msg.currentUrl, item.matchPattern),
  )
  const defaultCollapsed = hasUrlMatch ? true : false

  return [
    {
      migration: msg.migration,
      hostname: msg.hostname,
      currentUrl: msg.currentUrl,
      globalSetting: msg.globalSetting,
      site: msg.site,
      monitor: msg.monitor,
      viewedMonitor: msg.monitor,
      selectedIndex,
      activePresetTab: model ? model.activePresetTab : 'light',
      matchesCollapsed: model ? model.matchesCollapsed : defaultCollapsed,
      isCopyMonitorListOpen: false,
      isInjectThemeDone: false,
      isSetFontSizeDone: false,
    },
    Cmd.batch([
      injectThemeCmd(activeSettings),
      updateRootFontSizeCmd(msg.globalSetting.fontSize || DEFAULT_FONT_SIZE),
    ]),
  ]
}

// Saves a new list of rules for the model's monitor, selects the rule that
// matches the page and applies its theme to the popup
const replaceActiveRules = (
  model: Model,
  updatedList: PathSetting[],
): [Model, Cmd<Msg>] => {
  const updatedIndex = getActivePadSettingIndex(model.currentUrl, updatedList)
  const activeSettings = updatedList[updatedIndex] || defaultPathSetting
  const updatedModel = {
    ...withActiveRules(model, updatedList),
    selectedIndex: updatedIndex,
  }
  return [
    updatedModel,
    Cmd.batch([saveSettingsCmd(updatedModel), injectThemeCmd(activeSettings)]),
  ]
}

const handleToggleEnabled = (
  msg: Extract<Msg, { _tag: 'ToggleEnabled' }>,
  model: Model,
): [Model, Cmd<Msg>] => {
  const target = activeRules(model)[msg.index]
  if (!target) {
    return [model, Cmd.none()]
  } else {
    const updatedTarget = {
      ...target,
      enabled: !target.enabled,
      updatedAt: Date.now(),
    }
    const updatedList = [...activeRules(model)]
    updatedList[msg.index] = updatedTarget
    return replaceActiveRules(model, updatedList)
  }
}

const handleAddPadSetting = (model: Model): [Model, Cmd<Msg>] => {
  const defaultPattern = getDefaultPatternForUrl(model.currentUrl)
  const newSetting = createDefaultPathSetting(defaultPattern)
  const updatedList = [newSetting, ...activeRules(model)]
  const updatedIndex = getActivePadSettingIndex(model.currentUrl, updatedList)
  const updatedGlobal = { ...model.globalSetting, showRuler: true }
  const updatedModel = {
    ...withActiveRules(model, updatedList),
    selectedIndex: updatedIndex,
    globalSetting: updatedGlobal,
    matchesCollapsed: false,
  }
  return [
    updatedModel,
    Cmd.batch([
      saveGlobalSettingCmd(updatedGlobal),
      saveSettingsCmd(updatedModel),
      injectThemeCmd(updatedList[updatedIndex] || defaultPathSetting),
    ]),
  ]
}

const handleDeletePadSetting = (
  msg: Extract<Msg, { _tag: 'DeletePadSetting' }>,
  model: Model,
): [Model, Cmd<Msg>] => {
  const updatedList = activeRules(model).filter((_, idx) => idx !== msg.index)
  const updatedIndex = getActivePadSettingIndex(model.currentUrl, updatedList)
  const activeSettings = updatedList[updatedIndex] || {
    ...defaultPathSetting,
    enabled: false,
  }
  const updatedModel = {
    ...withActiveRules(model, updatedList),
    selectedIndex: updatedIndex,
  }
  return [
    updatedModel,
    Cmd.batch([saveSettingsCmd(updatedModel), injectThemeCmd(activeSettings)]),
  ]
}

const handleUpdateMatchPattern = (
  msg: Extract<Msg, { _tag: 'UpdateMatchPattern' }>,
  model: Model,
): [Model, Cmd<Msg>] => {
  const target = activeRules(model)[msg.index]
  if (!target) {
    return [model, Cmd.none()]
  } else {
    const updatedTarget = {
      ...target,
      matchPattern: msg.matchPattern,
      updatedAt: Date.now(),
    }
    const updatedList = [...activeRules(model)]
    updatedList[msg.index] = updatedTarget
    return replaceActiveRules(model, updatedList)
  }
}

const handleMoveMatchUp = (
  msg: Extract<Msg, { _tag: 'MoveMatchUp' }>,
  model: Model,
): [Model, Cmd<Msg>] => {
  const idx = msg.index
  const list = activeRules(model)
  if (idx <= 0 || idx >= list.length) {
    return [model, Cmd.none()]
  } else {
    return replaceActiveRules(model, swapArrayElements(list, idx, idx - 1))
  }
}

const handleMoveMatchDown = (
  msg: Extract<Msg, { _tag: 'MoveMatchDown' }>,
  model: Model,
): [Model, Cmd<Msg>] => {
  const idx = msg.index
  const list = activeRules(model)
  if (idx < 0 || idx >= list.length - 1) {
    return [model, Cmd.none()]
  } else {
    return replaceActiveRules(model, swapArrayElements(list, idx, idx + 1))
  }
}

// Saves a changed global setting and applies it to the active tab
const updateGlobalSetting = (
  model: Model,
  updatedGlobal: GlobalSetting,
  extraCmds: Cmd<Msg>[] = [],
): [Model, Cmd<Msg>] => {
  const activeSettings =
    viewedRules(model)[model.selectedIndex] || defaultPathSetting
  const updatedModel = { ...model, globalSetting: updatedGlobal }
  return [
    updatedModel,
    Cmd.batch([
      saveGlobalSettingCmd(updatedGlobal),
      saveSettingsCmd(updatedModel),
      injectThemeCmd(activeSettings),
      ...extraCmds,
    ]),
  ]
}

const handleToggleGlobalEnabled = (model: Model): [Model, Cmd<Msg>] =>
  updateGlobalSetting(model, {
    ...model.globalSetting,
    enabled: !model.globalSetting.enabled,
  })

const handleToggleDomainEnabled = (model: Model): [Model, Cmd<Msg>] => {
  const updatedModel = {
    ...model,
    site: {
      ...model.site,
      enabled: !model.site.enabled,
      updatedAt: Date.now(),
    },
  }
  const activeSettings =
    viewedRules(model)[model.selectedIndex] || defaultPathSetting
  return [
    updatedModel,
    Cmd.batch([saveSettingsCmd(updatedModel), injectThemeCmd(activeSettings)]),
  ]
}

// Shows the rules of a monitor, selecting the one that matches the page
const handleViewMonitor = (
  msg: Extract<Msg, { _tag: 'ViewMonitor' }>,
  model: Model,
): [Model, Cmd<Msg>] => {
  const list = rulesFor(model.site, msg.monitor)
  const selectedIndex = getActivePadSettingIndex(model.currentUrl, list)
  return [
    {
      ...model,
      viewedMonitor: msg.monitor,
      selectedIndex,
      isCopyMonitorListOpen: false,
      matchesCollapsed: false,
    },
    // The popup takes the theme of the rule it shows
    injectThemeCmd(list[selectedIndex] || defaultPathSetting),
  ]
}

// Copies one rule of the viewed monitor to the tab's monitor, and keeps
// showing the viewed monitor so more can be copied
const handleCopyRuleToCurrentMonitor = (
  msg: Extract<Msg, { _tag: 'CopyRuleToCurrentMonitor' }>,
  model: Model,
): [Model, Cmd<Msg>] => {
  const rule = viewedRules(model)[msg.index]
  if (!rule || !isViewingOtherMonitor(model)) {
    return [model, Cmd.none()]
  } else {
    const updatedModel = withActiveRules(
      model,
      copyRuleInto(activeRules(model), rule),
    )
    return [updatedModel, saveSettingsCmd(updatedModel)]
  }
}

// Copies all the rules of the viewed monitor to the tab's monitor, then shows
// the tab's monitor with the result
const handleCopyAllRules = (
  msg: Extract<Msg, { _tag: 'CopyAllRules' }>,
  model: Model,
): [Model, Cmd<Msg>] => {
  if (!isViewingOtherMonitor(model)) {
    return [model, Cmd.none()]
  } else {
    const updatedList =
      msg.mode === 'Replace'
        ? viewedRules(model)
        : copyMissingRulesInto(activeRules(model), viewedRules(model))
    return replaceActiveRules(
      { ...model, viewedMonitor: model.monitor },
      updatedList,
    )
  }
}

const handleCopyRulesFromMonitor = (
  msg: Extract<Msg, { _tag: 'CopyRulesFromMonitor' }>,
  model: Model,
): [Model, Cmd<Msg>] => {
  const rules = rulesFor(model.site, msg.monitor)
  // Only a monitor without rules offers the list, so nothing is replaced
  if (activeRules(model).length > 0 || rules.length === 0) {
    return [model, Cmd.none()]
  } else {
    return replaceActiveRules(
      {
        ...model,
        viewedMonitor: model.monitor,
        isCopyMonitorListOpen: false,
      },
      rules,
    )
  }
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
    } else {
      return [null, Cmd.none()]
    }
  } else if (
    model.migration._tag !== 'UpToDate' &&
    !allowedBeforeMigration.includes(msg._tag)
  ) {
    // Nothing is edited until the stored settings are migrated
    return [model, Cmd.none()]
  } else if (isViewingOtherMonitor(model) && isRuleEdit(msg)) {
    // Another monitor is shown read only
    return [model, Cmd.none()]
  } else {
    switch (msg._tag) {
      case 'Init':
        return handleInit(msg, model)

      case 'RunMigration':
        return handleRunMigration(model)

      // Reads everything again, now in the format of this build
      case 'MigrationDone':
        return [model, loadInitialDataCmd()]

      case 'MigrationFailed':
        return [
          {
            ...model,
            migration: {
              _tag: 'Failed',
              fromVersion:
                model.migration._tag === 'Running'
                  ? model.migration.fromVersion
                  : null,
              error: msg.error,
            },
          },
          Cmd.none(),
        ]

      case 'ToggleGlobalEnabled':
        return handleToggleGlobalEnabled(model)

      case 'ToggleDomainEnabled':
        return handleToggleDomainEnabled(model)

      case 'ToggleCopyMonitorList':
        return [
          { ...model, isCopyMonitorListOpen: !model.isCopyMonitorListOpen },
          Cmd.none(),
        ]

      case 'ViewMonitor':
        return handleViewMonitor(msg, model)

      case 'CopyRuleToCurrentMonitor':
        return handleCopyRuleToCurrentMonitor(msg, model)

      case 'CopyAllRules':
        return handleCopyAllRules(msg, model)

      case 'CopyRulesFromMonitor':
        return handleCopyRulesFromMonitor(msg, model)

      case 'ToggleEnabled':
        return handleToggleEnabled(msg, model)

      case 'SetPadSideType':
        return updateActiveSetting(model, (active) => ({
          ...active,
          side: resolveNewSidePure(active.side, msg.sideType),
        }))

      case 'SetPadWidth':
        return updateActiveSetting(model, (active) => ({
          ...active,
          side: resolveNewWidthPure(active.side, msg.sideType, msg.width),
        }))

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

      case 'ToggleShowRuler':
        return updateGlobalSetting(model, {
          ...model.globalSetting,
          showRuler: !model.globalSetting.showRuler,
        })

      case 'ToggleDisableWhenNotMaximized':
        return updateGlobalSetting(model, {
          ...model.globalSetting,
          disableWhenNotMaximized: !model.globalSetting.disableWhenNotMaximized,
        })

      case 'ToggleMatchesCollapsed':
        return [
          { ...model, matchesCollapsed: !model.matchesCollapsed },
          Cmd.none(),
        ]

      case 'ExportConfig':
        return [model, triggerExportCmd()]

      case 'ImportConfig':
        return [model, triggerImportCmd(msg.jsonText)]

      case 'SetFontSize': {
        const clampedSize = Math.min(32, Math.max(12, msg.fontSize))
        return updateGlobalSetting(
          model,
          { ...model.globalSetting, fontSize: clampedSize },
          [updateRootFontSizeCmd(clampedSize)],
        )
      }

      case 'InjectThemeDone':
        return [{ ...model, isInjectThemeDone: true }, Cmd.none()]

      case 'SetFontSizeDone':
        return [{ ...model, isSetFontSizeDone: true }, Cmd.none()]

      case 'NoOp':
        return [model, Cmd.none()]
    }
  }
}

// Side effects task runners
// -------------------------------------------------------------

export const validateBackupData = (data: unknown): boolean => {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return false
  } else {
    const keys = Object.keys(data)
    if (keys.length === 0) {
      return false
    } else {
      let isValid = true
      for (const key of keys) {
        const val = (data as Record<string, unknown>)[key]
        if (key === 'global_settings') {
          const decoded = GlobalSettingCodec.decode(val)
          if (decoded._tag === 'Left') {
            isValid = false
          }
        } else {
          // Backups made before schema version 2 hold the old site lists
          if (!isStoredSiteSetting(val)) {
            isValid = false
          }
        }
      }
      return isValid
    }
  }
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
        } else {
          chrome.storage.local.get(null, (allData) => {
            // A file of the stored settings is the way back after a failed
            // migration, so a failed read must not save an empty one
            if (chrome.runtime?.lastError || !allData) {
              alert(
                `Could not read your settings to download them: ${chrome.runtime?.lastError?.message ?? 'Storage read failed'}`,
              )
              resolve()
              return
            }
            try {
              const jsonStr = JSON.stringify(allData, null, 2)
              const blob = new Blob([jsonStr], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'damn-center-backup.json'
              a.click()
              // Revoke later: revoking right after click() can cancel the
              // download in Firefox
              setTimeout(() => URL.revokeObjectURL(url), 60_000)
            } catch (e) {
              console.error('[Damn Center] Export error:', e)
            }
            resolve()
          })
        }
      })
    }),
    (): Msg => ({ _tag: 'NoOp' }),
  )
}

// Stored keys that an imported backup doesn't contain, removed after the
// backup is written so the result matches the file exactly
export const keysMissingFromBackup = (
  storedKeys: string[],
  backup: Record<string, unknown>,
): string[] => storedKeys.filter((key) => !(key in backup))

const storageCall = (call: (callback: () => void) => void): Promise<void> =>
  new Promise((resolve, reject) =>
    call(() => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
      } else {
        resolve()
      }
    }),
  )

/**
 * Replaces the stored settings with a backup file's contents, after asking the
 * user. Returns true when the import succeeded.
 */
export const runImport = async (jsonText: string): Promise<boolean> => {
  if (
    typeof chrome === 'undefined' ||
    !chrome.storage ||
    !chrome.storage.local
  ) {
    alert('Storage API is not available.')
    return false
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    alert('This file is not valid JSON.')
    return false
  }
  // Checked first: a newer format may also fail the checks below. Importing
  // it would store data this version can neither read nor safely save over
  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    isNewerSchema((parsed as Record<string, unknown>)['global_settings'])
  ) {
    alert(
      'This backup was made with a newer version of Damn Center. Update the extension to import it.',
    )
    return false
  }
  if (!validateBackupData(parsed)) {
    alert('This file is not a Damn Center backup.')
    return false
  }
  const backup = parsed as Record<string, unknown>

  if (
    !confirm(
      'Importing replaces all your current matches and settings with the ones in this file. Continue?',
    )
  ) {
    return false
  }

  try {
    // Write the backup first, then remove what it doesn't contain, so a
    // failed write never leaves the user with empty settings
    await storageCall((done) => chrome.storage.local.set(backup, done))
    const stored = await new Promise<Record<string, unknown>>((resolve) =>
      chrome.storage.local.get(null, resolve),
    )
    const staleKeys = keysMissingFromBackup(Object.keys(stored), backup)
    if (staleKeys.length > 0) {
      await storageCall((done) => chrome.storage.local.remove(staleKeys, done))
    }
    alert('Configuration imported successfully!')
    return true
  } catch (e) {
    console.error('[Damn Center] Import failed:', e)
    alert(
      `Import failed while saving: ${e instanceof Error ? e.message : String(e)}`,
    )
    return false
  }
}

const triggerImportCmd = (jsonText: string): Cmd<Msg> => {
  return Task.attempt(
    Task.fromPromise(async () => {
      if (await runImport(jsonText)) {
        window.location.reload()
      }
    }),
    (): Msg => ({ _tag: 'NoOp' }),
  )
}

// How long the popup waits for the page to say which monitor it is on
const TAB_MONITOR_TIMEOUT_MS = 300

// The monitor the tab is on, as its page reports it. Pages without the
// content script (e.g. browser pages) don't answer, and a busy page may not
// answer in time; then the popup's own screen is used, which is the tab's
// monitor too in a normal window.
const queryTabMonitor = (tabId: number | undefined): Promise<Monitor> =>
  new Promise((resolve) => {
    if (tabId === undefined || !chrome.tabs.sendMessage) {
      resolve(getCurrentMonitor())
    } else {
      // Whichever comes first wins; resolving twice does nothing
      setTimeout(() => resolve(getCurrentMonitor()), TAB_MONITOR_TIMEOUT_MS)
      try {
        chrome.tabs.sendMessage(
          tabId,
          { type: 'GET_MONITOR' },
          (response: unknown) => {
            // Reading lastError marks it as handled
            const noAnswer = chrome.runtime.lastError !== undefined
            resolve(
              !noAnswer && MonitorCodec.is(response)
                ? response
                : getCurrentMonitor(),
            )
          },
        )
      } catch {
        resolve(getCurrentMonitor())
      }
    }
  })

export const queryActiveTabAndSettings = (): Promise<{
  hostname: Hostname
  currentUrl: string
  globalSetting: GlobalSetting
  site: SiteSetting
  monitor: Monitor
  migration: Migration
}> => {
  return new Promise((resolve) => {
    // Sample page for the `pnpm dev` preview only, where there are no tabs
    const defaultUrl =
      'https://some-extremely-long-subdomain.and-even-longer-domain-name.co.uk/'
    const defaultHost = getHostname(defaultUrl)

    if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.tabs.query) {
      resolve({
        hostname: defaultHost,
        currentUrl: defaultUrl,
        globalSetting: defaultGlobalSetting,
        site: {
          ...defaultSiteSetting,
          monitors: [
            { monitor: getCurrentMonitor(), rules: [defaultPathSetting] },
          ],
        },
        monitor: getCurrentMonitor(),
        migration: { _tag: 'UpToDate' },
      })
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0]
        // Browsers don't give the popup the URL of restricted pages (e.g.
        // chrome://settings); '' maps to the shared 'system-settings' key, so
        // edits there don't land under the dev preview's sample site
        const url = activeTab?.url ?? ''
        const host = getHostname(url)
        // Check that stored data is in the format of this build before
        // anything is edited: old data must be migrated first, which the
        // user confirms in a prompt over the popup. Old rules move to the
        // monitor of the tab, so it needs to be known first.
        queryTabMonitor(activeTab?.id)
          .then(async (monitor) => {
            const checked = await checkStoredSchema(monitor)()
            const migration: Migration =
              checked._tag === 'Left'
                ? {
                    _tag: 'Failed',
                    fromVersion: null,
                    error: checked.left.message,
                  }
                : checked.right._tag === 'Older'
                  ? { _tag: 'Needed', fromVersion: checked.right.version }
                  : checked.right._tag === 'Newer'
                    ? { _tag: 'Newer', storedVersion: checked.right.version }
                    : { _tag: 'UpToDate' }
            return Promise.all([
              loadGlobalSetting()(),
              loadSiteSetting(host, monitor)(),
              Promise.resolve(monitor),
              Promise.resolve(migration),
            ])
          })
          .then(([globalEither, siteEither, monitor, migration]) => {
            const globalSetting =
              globalEither._tag === 'Right'
                ? globalEither.right
                : defaultGlobalSetting
            const site =
              siteEither._tag === 'Right'
                ? siteEither.right
                : defaultSiteSetting
            resolve({
              hostname: host,
              currentUrl: url,
              globalSetting,
              site,
              monitor,
              migration,
            })
          })
      })
    }
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
          // A site without saved rules shows the empty state; rules are only
          // added with + New Match
          site: res.value.site,
          monitor: res.value.monitor,
          migration: res.value.migration,
        }
      } else {
        return {
          _tag: 'Init',
          hostname: 'unknown-domain' as Hostname,
          currentUrl: '',
          globalSetting: defaultGlobalSetting,
          site: defaultSiteSetting,
          monitor: getCurrentMonitor(),
          // Nothing was read, so nothing may be edited: the stored
          // settings may still wait for their migration
          migration: {
            _tag: 'Failed',
            fromVersion: null,
            error: res.err instanceof Error ? res.err.message : String(res.err),
          },
        }
      }
    },
  )
}

// Runs the migration the user confirmed in the prompt
const runMigrationCmd = (monitor: Monitor): Cmd<Msg> =>
  Task.attempt(
    Task.fromPromise(async () => {
      const result = await migrateStorage(monitor)()
      if (result._tag === 'Left') throw result.left
    }),
    (res): Msg =>
      res.tag === 'Ok'
        ? { _tag: 'MigrationDone' }
        : {
            _tag: 'MigrationFailed',
            error: res.err instanceof Error ? res.err.message : String(res.err),
          },
  )

const persistSettingsAndMessageTab = (
  host: Hostname,
  currentUrl: string,
  site: SiteSetting,
  settingsList: PathSetting[],
  globalSetting: GlobalSetting,
): Promise<void> => {
  const domainSetting: DomainSetting = {
    _tag: 'DomainSetting',
    enabled: site.enabled,
  }
  return new Promise((resolve) => {
    pipe(
      saveSiteSetting(host, site),
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
                  ...defaultPathSetting,
                  enabled: false,
                }
                const settingsToInject =
                  globalSetting.enabled && domainSetting.enabled
                    ? activeSettings
                    : { ...activeSettings, enabled: false }
                try {
                  chrome.tabs.sendMessage(
                    activeTab.id,
                    {
                      type: 'SETTINGS_UPDATED',
                      settings: settingsToInject,
                      globalSetting: globalSetting,
                      domainSetting: domainSetting,
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

/**
 * Saves the settings of the model's site, and applies the rules in use on
 * its monitor to the active tab.
 */
export const saveSettingsCmd = (model: Model): Cmd<Msg> => {
  return Task.attempt(
    Task.fromPromise(() =>
      persistSettingsAndMessageTab(
        model.hostname,
        model.currentUrl,
        model.site,
        activeRules(model),
        model.globalSetting,
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

const runInjectTheme = (settings: PathSetting) => {
  const activeTheme = themes[UI_THEME_ID] || themes.neon
  const isDark = determineIsDark(settings.themeMode)
  injectTheme(activeTheme, isDark)
}

export const injectThemeCmd = (settings: PathSetting): Cmd<Msg> => {
  return Task.attempt(
    Task.fromPromise(() => {
      runInjectTheme(settings)
      return Promise.resolve()
    }),
    (): Msg => ({ _tag: 'InjectThemeDone' }),
  )
}

export const updateRootFontSizeCmd = (fontSize: number): Cmd<Msg> => {
  return Task.attempt(
    Task.fromPromise(() => {
      document.documentElement.style.fontSize = `${fontSize}px`
      return Promise.resolve()
    }),
    (): Msg => ({ _tag: 'SetFontSizeDone' }),
  )
}
