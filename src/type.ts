/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-only
 */
import type { GlobalSetting } from './common/type/global-setting'
import type { Hostname } from './common/type/hostname'
import type {
  DomainSetting,
  PadBgType,
  PadThemeMode,
  PathSetting,
} from './common/type/pad-setting'

export interface Model {
  hostname: Hostname
  currentUrl: string
  globalSetting: GlobalSetting
  domainSetting: DomainSetting
  padSettingList: PathSetting[]
  selectedIndex: number
  activePresetTab: 'light' | 'dark'
  matchesCollapsed: boolean
  isInjectThemeDone: boolean
  isSetFontSizeDone: boolean
}

export type Msg =
  | {
      _tag: 'Init'
      hostname: Hostname
      currentUrl: string
      globalSetting: GlobalSetting
      domainSetting: DomainSetting
      padSettingList: PathSetting[]
    }
  | { _tag: 'ToggleGlobalEnabled' }
  | { _tag: 'ToggleDomainEnabled' }
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
