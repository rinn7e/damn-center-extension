/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import picomatch from 'picomatch'
import React from 'react'
import { type Dispatcher } from 'tea-cup-fp'

import './asset/index.css'
import { UI_THEME_ID } from './common/env'
import { darkColors, lightColors, patterns } from './common/type/preset'
import { themes } from './common/type/theme'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  MonitorIcon,
  MoonIcon,
  PowerIcon,
  RulerIcon,
  SunIcon,
} from './component/icon'
import { matchUrlPattern } from './storage/storage'
import {
  type GlobalSetting,
  type Model,
  type Msg,
  type PadSettings,
  type PadTheme,
  type PadThemeMode,
  defaultPadSettings,
} from './type'

const transparentBgStyle = {
  backgroundImage:
    'linear-gradient(45deg, #cbd5e1 25%, transparent 25%), linear-gradient(-45deg, #cbd5e1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #cbd5e1 75%), linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)',
  backgroundSize: '8px 8px',
  backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
}

const toggleSwitchView = (
  isEnabled: boolean,
  onToggle: () => void,
  size: 'small' | 'big' = 'small',
  title?: string,
) => {
  const isBig = size === 'big'
  return (
    <button
      type='button'
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      className={`relative shrink-0 cursor-pointer border transition-colors duration-200 ease-in-out focus:outline-none ${
        isBig ? 'h-[20px] w-[36px]' : 'h-[16px] w-[28px]'
      } ${
        isEnabled
          ? 'bg-theme-primary border-transparent'
          : 'bg-theme-bg-input border-theme-border-input'
      }`}
      title={title}
    >
      <span
        className={`pointer-events-none absolute top-[1px] left-[1px] bg-white shadow-sm transition-transform duration-200 ease-in-out ${
          isBig ? 'h-[16px] w-[16px]' : 'h-[12px] w-[12px]'
        } ${
          isEnabled
            ? isBig
              ? 'translate-x-[16px]'
              : 'translate-x-[12px]'
            : 'translate-x-[0px]'
        }`}
      />
    </button>
  )
}

const headerView = (
  globalSetting: GlobalSetting,
  dispatch: Dispatcher<Msg>,
) => {
  const isEnabled = globalSetting.enabled
  return (
    <div className='border-theme-border-card w-full shrink-0 border-b'>
      <div className='flex items-center justify-between px-[16px] pt-[14px] pb-[12px]'>
        <h1 className='text-theme-primary flex items-baseline gap-[6px] text-base leading-none font-semibold tracking-tight'>
          <span>Damn Center - the page !</span>
          <span className='text-theme-text-dim pb-[2px] text-xs leading-none font-normal'>
            v1.0
          </span>
        </h1>
        <div className='flex items-center gap-[6px]'>
          {toggleSwitchView(
            isEnabled,
            () => dispatch({ _tag: 'ToggleGlobalEnabled' }),
            'big',
            isEnabled ? 'Disable Extension' : 'Enable Extension',
          )}
        </div>
      </div>
    </div>
  )
}

const patternStyleSelectorView = (
  theme: 'light' | 'dark',
  padTheme: PadTheme,
  dispatch: Dispatcher<Msg>,
) => {
  const colorPresets = theme === 'light' ? lightColors : darkColors
  return (
    <div className='flex flex-col gap-[12px]'>
      <div className='flex flex-col gap-[8px]'>
        <div className='flex items-center justify-between'>
          <label className='text-theme-text-dim text-[14px] font-semibold tracking-wider uppercase'>
            Base Color
          </label>
          <div className='bg-theme-bg-input border-theme-border-input flex items-center gap-[6px] border px-[6px] py-[2px]'>
            <input
              type='color'
              value={
                padTheme.bgColor === 'transparent'
                  ? '#ffffff'
                  : padTheme.bgColor
              }
              onChange={(e) =>
                dispatch({
                  _tag: 'UpdateBgColor',
                  theme,
                  bgColor: e.target.value,
                })
              }
              className='block h-[16px] w-[16px] cursor-pointer appearance-none border-0 bg-transparent p-0'
            />
            <span className='text-theme-text-muted relative top-[1px] font-mono text-[14px] leading-none uppercase'>
              {padTheme.bgColor}
            </span>
          </div>
        </div>
        <div className='grid grid-cols-6 gap-[8px]'>
          {colorPresets.map((preset) => {
            const isSelected =
              padTheme.bgColor.toLowerCase() === preset.value.toLowerCase()
            return (
              <button
                type='button'
                key={preset.value}
                title={preset.name}
                onClick={() =>
                  dispatch({
                    _tag: 'UpdateBgColor',
                    theme,
                    bgColor: preset.value,
                  })
                }
                className='border-theme-border-input flex aspect-square w-full cursor-pointer items-center justify-center border transition-all'
                style={
                  preset.value === 'transparent'
                    ? {
                        ...transparentBgStyle,
                        borderColor: isSelected
                          ? (themes[UI_THEME_ID]?.primaryColor ?? '#10b981')
                          : undefined,
                      }
                    : {
                        backgroundColor: preset.value,
                        borderColor: isSelected
                          ? (themes[UI_THEME_ID]?.primaryColor ?? '#10b981')
                          : undefined,
                      }
                }
              >
                {isSelected && (
                  <div className='bg-theme-primary h-[6px] w-[6px]' />
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className='flex flex-col gap-[8px]'>
        <label className='text-theme-text-dim text-[14px] font-semibold tracking-wider uppercase'>
          Pattern Style
        </label>
        <div className='grid grid-cols-3 gap-[8px]'>
          {patterns.map((pat) => {
            const previewStyle = pat.style(padTheme.bgColor)
            return (
              <button
                type='button'
                key={pat.id}
                onClick={() =>
                  dispatch({
                    _tag: 'UpdateBgPattern',
                    theme,
                    bgPattern: pat.id,
                  })
                }
                className={`relative flex h-[64px] cursor-pointer flex-col justify-end overflow-hidden border text-left transition-all ${
                  padTheme.bgPattern === pat.id
                    ? 'border-theme-primary ring-theme-primary/25 ring-[1px]'
                    : 'border-theme-border-input hover:border-theme-border-card'
                }`}
              >
                {padTheme.bgColor === 'transparent' && (
                  <div
                    className='absolute inset-0'
                    style={transparentBgStyle}
                  />
                )}
                <div className='absolute inset-0' style={previewStyle} />
                {padTheme.bgPattern === pat.id && (
                  <div className='bg-theme-primary absolute top-[18px] left-1/2 z-10 h-[6px] w-[6px] -translate-x-1/2' />
                )}
                <div className='bg-theme-bg-input border-theme-border-input relative z-10 w-full border-t px-[6px] py-[4px] transition-all'>
                  <div className='text-theme-text-main w-full truncate text-[14px] leading-none font-normal tracking-tight'>
                    {pat.name}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const padThemeStylingView = (
  theme: 'light' | 'dark',
  padTheme: PadTheme,
  dispatch: Dispatcher<Msg>,
) => {
  return (
    <div className='animate-slide-down flex flex-col gap-[14px]'>
      {patternStyleSelectorView(theme, padTheme, dispatch)}
    </div>
  )
}

const getGlobError = (pattern: string): string | null => {
  if (!pattern.trim()) return null
  try {
    picomatch(pattern.trim())
    return null
  } catch (e) {
    return e instanceof Error ? e.message : String(e)
  }
}

const matchRowView = (
  item: PadSettings,
  idx: number,
  listLength: number,
  selectedIndex: number,
  currentUrl: string,
  dispatch: Dispatcher<Msg>,
) => {
  const isMatching = matchUrlPattern(currentUrl, item.matchPattern)
  const isActiveMatch = selectedIndex === idx
  const globError = getGlobError(item.matchPattern)
  return (
    <div
      key={idx}
      className={`flex flex-col gap-[6px] border p-[6px] transition-all ${
        isMatching && isActiveMatch
          ? 'border-theme-primary bg-theme-bg-input'
          : 'border-theme-border-input'
      }`}
    >
      {/* Line 1: Match Input (Full Width) */}
      <input
        type='text'
        value={item.matchPattern}
        onChange={(e) => {
          dispatch({
            _tag: 'UpdateMatchPattern',
            index: idx,
            matchPattern: e.target.value,
          })
        }}
        onClick={(e) => e.stopPropagation()}
        placeholder='Match URL (e.g. ** or https://example.com/api/**)'
        className='bg-theme-bg-card border-theme-border-input text-theme-text-main focus:border-theme-primary w-full border px-[6px] py-[4px] font-mono text-[12px] focus:outline-none'
      />

      {globError && (
        <div className='px-[2px] font-mono text-[11px] leading-tight break-all text-red-500'>
          {globError}
        </div>
      )}

      {/* Line 2: Buttons & Toggle Switch */}
      <div className='flex items-center justify-between gap-[8px]'>
        <div className='flex items-center gap-[6px]'>
          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation()
              dispatch({ _tag: 'DeletePadSetting', index: idx })
            }}
            className='flex h-[22px] shrink-0 cursor-pointer items-center justify-center border border-red-500/20 px-[8px] text-[12px] font-semibold text-red-500 transition-all hover:border-red-500/40 hover:text-red-600'
          >
            Delete
          </button>
          <button
            type='button'
            disabled={idx === 0}
            onClick={(e) => {
              e.stopPropagation()
              dispatch({ _tag: 'MoveMatchUp', index: idx })
            }}
            className='border-theme-border-input hover:bg-theme-bg-input text-theme-text-main flex h-[22px] shrink-0 cursor-pointer items-center justify-center border px-[8px] text-[12px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40'
            title='Move Up'
          >
            <ChevronUpIcon />
          </button>
          <button
            type='button'
            disabled={idx === listLength - 1}
            onClick={(e) => {
              e.stopPropagation()
              dispatch({ _tag: 'MoveMatchDown', index: idx })
            }}
            className='border-theme-border-input hover:bg-theme-bg-input text-theme-text-main flex h-[22px] shrink-0 cursor-pointer items-center justify-center border px-[8px] text-[12px] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40'
            title='Move Down'
          >
            <ChevronDownIcon />
          </button>
        </div>

        {/* Enable/Disable switch for this match */}
        <div className='flex items-center gap-[6px]'>
          <span className='text-theme-text-dim text-[11px] font-semibold tracking-wider uppercase'>
            Enabled
          </span>
          {toggleSwitchView(
            item.enabled,
            () => dispatch({ _tag: 'ToggleEnabled', index: idx }),
            'small',
            item.enabled ? 'Disable Match' : 'Enable Match',
          )}
        </div>
      </div>
      {isMatching && isActiveMatch && (
        <div className='mt-[2px] flex items-center gap-[4px] px-[2px]'>
          <div
            className={`h-[6px] w-[6px] shrink-0 ${item.enabled ? 'bg-theme-primary animate-pulse' : 'bg-theme-text-dim'}`}
          />
          <span
            className={`text-[11px] font-semibold tracking-wide uppercase ${item.enabled ? 'text-theme-primary' : 'text-theme-text-dim'}`}
          >
            {item.enabled
              ? 'Matches current URL'
              : 'Matches current URL (Disabled)'}
          </span>
        </div>
      )}
    </div>
  )
}

const matchesCardView = (
  padSettingList: PadSettings[],
  selectedIndex: number,
  currentUrl: string,
  matchesCollapsed: boolean,
  dispatch: Dispatcher<Msg>,
) => {
  return (
    <div className='flex flex-col gap-[12px]'>
      <div className='flex items-center justify-between'>
        <span className='text-theme-text-main text-[14px] font-semibold'>
          Matches
        </span>
        <div className='flex items-center gap-[8px]'>
          <button
            type='button'
            onClick={() => dispatch({ _tag: 'AddPadSetting' })}
            className='text-theme-primary hover:text-theme-primary/80 cursor-pointer text-[13px] font-semibold transition-all'
          >
            + New Match
          </button>
          <button
            type='button'
            onClick={() => dispatch({ _tag: 'ToggleMatchesCollapsed' })}
            className='text-theme-text-dim hover:text-theme-text-main flex cursor-pointer items-center justify-center p-[2px] transition-all'
            title={matchesCollapsed ? 'Expand Matches' : 'Collapse Matches'}
          >
            {matchesCollapsed ? (
              <ChevronDownIcon className='h-[14px] w-[14px]' />
            ) : (
              <ChevronUpIcon className='h-[14px] w-[14px]' />
            )}
          </button>
        </div>
      </div>

      {!matchesCollapsed && (
        <>
          {padSettingList.length === 0 ? (
            <div className='text-theme-text-dim pb-[8px] text-[13px]'>
              No matches added yet. Click "+ New Match" to configure custom page
              padding.
            </div>
          ) : (
            <div className='flex flex-col gap-[8px]'>
              {padSettingList.map((item, idx) =>
                matchRowView(
                  item,
                  idx,
                  padSettingList.length,
                  selectedIndex,
                  currentUrl,
                  dispatch,
                ),
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

const widthSliderView = (
  label: string,
  width: number,
  onChange: (val: number) => void,
) => {
  return (
    <div className='flex flex-col gap-[8px]'>
      <div className='flex items-center justify-between'>
        <label className='text-theme-text-muted text-[14px] font-semibold'>
          {label}
        </label>
        <div className='flex items-center gap-[4px]'>
          <input
            type='number'
            min='0'
            max='9999'
            value={width}
            onChange={(e) =>
              onChange(
                Math.max(0, Math.min(9999, parseInt(e.target.value) || 0)),
              )
            }
            className='bg-theme-bg-input border-theme-border-input text-theme-primary focus:border-theme-primary w-[48px] border px-[4px] py-[2px] text-center font-mono text-[14px] focus:outline-none'
          />
          <span className='text-theme-text-dim font-mono text-[14px]'>px</span>
        </div>
      </div>
      <input
        type='range'
        min='0'
        max='800'
        value={Math.min(800, width)}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className='accent-theme-primary bg-theme-bg-input h-[4px] w-full cursor-pointer appearance-none'
      />
    </div>
  )
}

const paddingWidthView = (settings: PadSettings, dispatch: Dispatcher<Msg>) => {
  if (settings.side._tag === 'Left') {
    return widthSliderView('Padding Width', settings.side.width, (val) =>
      dispatch({ _tag: 'SetPadWidth', sideType: 'left', width: val }),
    )
  } else if (settings.side._tag === 'Right') {
    return widthSliderView('Padding Width', settings.side.width, (val) =>
      dispatch({ _tag: 'SetPadWidth', sideType: 'right', width: val }),
    )
  } else {
    return (
      <div className='flex flex-col gap-[14px]'>
        {widthSliderView('Left Padding Width', settings.side.leftWidth, (val) =>
          dispatch({ _tag: 'SetPadWidth', sideType: 'left', width: val }),
        )}
        {widthSliderView(
          'Right Padding Width',
          settings.side.rightWidth,
          (val) =>
            dispatch({ _tag: 'SetPadWidth', sideType: 'right', width: val }),
        )}
      </div>
    )
  }
}

const paddingSideView = (settings: PadSettings, dispatch: Dispatcher<Msg>) => {
  const activeSideType = settings.side._tag
  const tabs: ('Left' | 'Right' | 'Both')[] = ['Left', 'Right', 'Both']
  return (
    <div className='flex flex-col gap-[4px]'>
      <label className='text-theme-text-dim text-[14px] font-semibold tracking-wider uppercase'>
        Side
      </label>
      <div className='bg-theme-bg-input border-theme-border-input flex border p-[2px]'>
        {tabs.map((tab) => (
          <button
            key={tab}
            type='button'
            onClick={() => dispatch({ _tag: 'SetPadSideType', sideType: tab })}
            className={`w-[0px] flex-1 cursor-pointer py-[4px] text-center text-[14px] font-semibold capitalize transition-all ${
              activeSideType === tab
                ? 'bg-theme-bg-card text-theme-primary'
                : 'text-theme-text-dim hover:text-theme-text-muted'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  )
}

const themeTriggerModeView = (
  settings: PadSettings,
  dispatch: Dispatcher<Msg>,
) => {
  return (
    <div className='flex flex-col gap-[4px]'>
      <label className='text-theme-text-dim text-[14px] font-semibold tracking-wider uppercase'>
        Theme Trigger Mode
      </label>
      <div className='bg-theme-bg-input border-theme-border-input flex border p-[2px]'>
        {(['light', 'dark', 'system'] as PadThemeMode[]).map((mode) => (
          <button
            key={mode}
            type='button'
            onClick={() =>
              dispatch({ _tag: 'SetPadThemeMode', themeMode: mode })
            }
            className={`flex w-[0px] flex-1 cursor-pointer items-center justify-center gap-[4px] py-[4px] text-[14px] font-semibold capitalize transition-all ${
              settings.themeMode === mode
                ? 'bg-theme-bg-card text-theme-primary'
                : 'text-theme-text-dim hover:text-theme-text-muted'
            }`}
          >
            {mode === 'light' && (
              <>
                <SunIcon />
                <span>Light</span>
              </>
            )}
            {mode === 'dark' && (
              <>
                <MoonIcon />
                <span>Dark</span>
              </>
            )}
            {mode === 'system' && (
              <>
                <MonitorIcon />
                <span>System</span>
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

const styleHeaderTabView = (
  activePresetTab: 'light' | 'dark',
  dispatch: Dispatcher<Msg>,
) => {
  return (
    <div className='border-theme-border-input flex items-center justify-between border-b pb-[8px]'>
      <span className='text-theme-text-main text-[14px] font-semibold'>
        Configure Styles
      </span>
      <div className='bg-theme-bg-input border-theme-border-input flex border p-[2px]'>
        <button
          type='button'
          onClick={() => dispatch({ _tag: 'SetActivePresetTab', tab: 'light' })}
          className={`cursor-pointer px-[8px] py-[2px] text-[14px] font-semibold transition-all ${
            activePresetTab === 'light'
              ? 'bg-theme-bg-card text-theme-primary'
              : 'text-theme-text-dim hover:text-theme-text-muted'
          }`}
        >
          Light Mode
        </button>
        <button
          type='button'
          onClick={() => dispatch({ _tag: 'SetActivePresetTab', tab: 'dark' })}
          className={`cursor-pointer px-[8px] py-[2px] text-[14px] font-semibold transition-all ${
            activePresetTab === 'dark'
              ? 'bg-theme-bg-card text-theme-primary'
              : 'text-theme-text-dim hover:text-theme-text-muted'
          }`}
        >
          Dark Mode
        </button>
      </div>
    </div>
  )
}

const customCheckboxView = (checked: boolean) => {
  return (
    <div
      className={`flex h-[12px] w-[12px] shrink-0 items-center justify-center rounded-[2px] border transition-all ${
        checked
          ? 'border-red-500 bg-red-500 text-white'
          : 'bg-theme-bg-input border-red-500/40 hover:border-red-500'
      }`}
    >
      {checked && (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          viewBox='0 0 24 24'
          fill='none'
          stroke='white'
          strokeWidth='4'
          strokeLinecap='round'
          strokeLinejoin='round'
          className='h-[8px] w-[8px]'
        >
          <path d='M20 6 9 17l-5-5' />
        </svg>
      )}
    </div>
  )
}

const styleEditorView = (
  settings: PadSettings,
  globalSetting: GlobalSetting,
  activePresetTab: 'light' | 'dark',
  dispatch: Dispatcher<Msg>,
) => {
  return (
    <div className='animate-slide-down flex flex-col gap-[16px]'>
      <div className='border-theme-border-card mx-[-16px] border-t' />
      <div className='flex items-center justify-between'>
        <span className='text-theme-text-main text-[14px] font-semibold'>
          Settings
        </span>
        <button
          type='button'
          onClick={() => dispatch({ _tag: 'ToggleShowRuler' })}
          className='flex cursor-pointer items-center gap-[6px] text-[12px] font-medium text-red-500 transition-all select-none hover:text-red-600'
          title={globalSetting.showRuler ? 'Hide Ruler' : 'Show Ruler'}
        >
          <RulerIcon className='h-[14px] w-[14px] shrink-0' />
          <span>Ruler</span>
          {customCheckboxView(globalSetting.showRuler)}
        </button>
      </div>

      {/* Padding Width */}
      {paddingWidthView(settings, dispatch)}

      {/* Padding Side */}
      {paddingSideView(settings, dispatch)}

      {/* Theme Trigger Mode selection */}
      {themeTriggerModeView(settings, dispatch)}

      {/* Background Styling Box */}
      <div className='border-theme-border-card bg-theme-bg-card flex flex-col gap-[12px] border p-[12px]'>
        {styleHeaderTabView(activePresetTab, dispatch)}

        {/* Render styling inputs for the selected sub-tab */}
        {padThemeStylingView(
          activePresetTab,
          settings[activePresetTab],
          dispatch,
        )}
      </div>
    </div>
  )
}

interface AppProps {
  model: Model
  dispatch: Dispatcher<Msg>
}

export const App: React.FC<AppProps> = ({ model, dispatch }) => {
  const { padSettingList, selectedIndex, activePresetTab, globalSetting } =
    model
  const settings = padSettingList[selectedIndex] || defaultPadSettings
  const hasAnyEnabled = padSettingList.some((item) => item.enabled)
  const matchesAnyPattern = padSettingList.some((item) =>
    matchUrlPattern(model.currentUrl, item.matchPattern),
  )

  return (
    <div className='bg-theme-secondary text-theme-text-main flex h-[550px] flex-col select-none'>
      {/* Header Wrapper */}
      {headerView(globalSetting, dispatch)}

      {/* Scrollable Body */}
      <div className='app-body-scroll min-h-0 flex-1 px-[16px] pt-[10px] pb-[16px]'>
        <div className='flex flex-col gap-[12px] pt-[2px]'>
          {globalSetting.enabled ? (
            <>
              {/* Matches Card */}
              {matchesCardView(
                padSettingList,
                selectedIndex,
                model.currentUrl,
                model.matchesCollapsed,
                dispatch,
              )}

              {settings &&
                matchesAnyPattern &&
                hasAnyEnabled &&
                styleEditorView(
                  settings,
                  globalSetting,
                  activePresetTab,
                  dispatch,
                )}
            </>
          ) : (
            <div className='flex flex-col items-center justify-center px-[16px] py-[64px] text-center'>
              <div className='text-theme-text-dim mb-[12px]'>
                <PowerIcon className='h-[32px] w-[32px]' />
              </div>
              <h3 className='text-theme-text-main text-[14px] font-semibold'>
                Extension is Disabled
              </h3>
              <p className='text-theme-text-dim mt-[6px] max-w-[240px] text-[12px] leading-relaxed'>
                Turn on the switch in the top right to enable Damn Center and
                configure page padding!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
