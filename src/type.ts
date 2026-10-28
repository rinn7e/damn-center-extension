/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-only
 */
import type { GlobalSetting } from './common/type/global-setting'
import type { Hostname } from './common/type/hostname'
import type { Monitor } from './common/type/monitor'
import type { PadBgType, PadThemeMode } from './common/type/pad-setting'
import type { SiteSetting } from './common/type/site-setting'

// Whether the stored settings are in the schema version of this build. Until
// they are, a screen covers the popup and nothing can be edited: older
// settings wait for the user to confirm their migration (pages keep reading
// the old format meanwhile), newer ones for the extension to be updated.
export type Migration =
  | { _tag: 'UpToDate' }
  | { _tag: 'Needed'; fromVersion: number }
  | { _tag: 'Running'; fromVersion: number | null }
  // fromVersion is null when the stored settings could not even be read
  | { _tag: 'Failed'; fromVersion: number | null; error: string }
  // A newer version of the extension saved the settings: this one cannot
  // read their format, so it asks the user to update and never saves
  | { _tag: 'Newer'; storedVersion: number }

export interface Model {
  migration: Migration
  hostname: Hostname
  currentUrl: string
  globalSetting: GlobalSetting
  // Everything stored for the site; the rules the popup edits are those of
  // `monitor` (activeRules in update.ts)
  site: SiteSetting
  // The monitor the active tab is on; its rules are the ones edited
  monitor: Monitor
  // The monitor whose rules the popup shows. Another monitor than `monitor`
  // is shown read only, with buttons to copy its rules
  viewedMonitor: Monitor
  selectedIndex: number
  activePresetTab: 'light' | 'dark'
  matchesCollapsed: boolean
  // Whether the list of monitors to copy rules from is shown
  isCopyMonitorListOpen: boolean
  isInjectThemeDone: boolean
  isSetFontSizeDone: boolean
}

export type Msg =
  | {
      _tag: 'Init'
      hostname: Hostname
      currentUrl: string
      globalSetting: GlobalSetting
      site: SiteSetting
      monitor: Monitor
      migration: Migration
    }
  // The user confirmed the migration prompt
  | { _tag: 'RunMigration' }
  | { _tag: 'MigrationDone' }
  | { _tag: 'MigrationFailed'; error: string }
  | { _tag: 'ToggleGlobalEnabled' }
  | { _tag: 'ToggleDomainEnabled' }
  | { _tag: 'ToggleCopyMonitorList' }
  | { _tag: 'ViewMonitor'; monitor: Monitor }
  | { _tag: 'CopyRuleToCurrentMonitor'; index: number }
  // Replace: this monitor gets exactly the viewed rules. AddMissing: only the
  // viewed rules whose URL pattern this monitor doesn't have are added
  | { _tag: 'CopyAllRules'; mode: 'Replace' | 'AddMissing' }
  | { _tag: 'ToggleEnabled'; index: number }
  | { _tag: 'SetPadSideType'; sideType: 'Left' | 'Right' | 'Both' }
  | { _tag: 'SetPadWidth'; sideType: 'left' | 'right'; width: number }
  | { _tag: 'SetPadThemeMode'; themeMode: PadThemeMode }
  | { _tag: 'SetActivePresetTab'; tab: 'light' | 'dark' }
  | { _tag: 'UpdateBgType'; theme: 'light' | 'dark'; bgType: PadBgType }
  | { _tag: 'UpdateBgColor'; theme: 'light' | 'dark'; bgColor: string }
  | { _tag: 'UpdateBgPattern'; theme: 'light' | 'dark'; bgPattern: string }
  | { _tag: 'AddPadSetting' }
  | { _tag: 'DeletePadSetting'; index: number }
  | { _tag: 'UpdateMatchPattern'; index: number; matchPattern: string }
  | { _tag: 'MoveMatchUp'; index: number }
  | { _tag: 'MoveMatchDown'; index: number }
  | { _tag: 'ToggleShowRuler' }
  | { _tag: 'ToggleDisableWhenNotMaximized' }
  | { _tag: 'ToggleMatchesCollapsed' }
  | { _tag: 'ExportConfig' }
  | { _tag: 'ImportConfig'; jsonText: string }
  | { _tag: 'SetFontSize'; fontSize: number }
  | { _tag: 'InjectThemeDone' }
  | { _tag: 'SetFontSizeDone' }
  | { _tag: 'NoOp' }
