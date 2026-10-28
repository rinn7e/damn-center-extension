/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-only
 */
import React from 'react'
import { type Dispatcher } from 'tea-cup-fp'

import './asset/index.css'
import { formatDateTime } from './common/date-util'
import {
  BUILD_DATE,
  DEFAULT_FONT_SIZE,
  SHOW_BUILD_DATE,
  UI_THEME_ID,
} from './common/env'
import {
  CURRENT_SCHEMA_VERSION,
  type GlobalSetting,
} from './common/type/global-setting'
import {
  type Monitor,
  formatMonitor,
  isSameMonitor,
} from './common/type/monitor'
import {
  type PadTheme,
  type PadThemeMode,
  type PathSetting,
  defaultPathSetting,
} from './common/type/pad-setting'
import { darkColors, lightColors, patterns } from './common/type/preset'
import {
  type MonitorRules,
  otherMonitorRules,
} from './common/type/site-setting'
import { themes } from './common/type/theme'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  HeartIcon,
  MonitorIcon,
  MoonIcon,
  PowerIcon,
  RulerIcon,
  SunIcon,
} from './component/icon'
import { getGlobError, matchUrlPattern } from './storage/storage'
import { type Migration, type Model, type Msg } from './type'
import { activeRules, isViewingOtherMonitor, viewedRules } from './update'

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

// The title bar. Without a global setting (the migration prompt, where
// nothing can be edited) it leaves out the on/off switch.
const headerView = (
  globalSetting: GlobalSetting | null,
  dispatch: Dispatcher<Msg>,
) => {
  const version =
    typeof chrome !== 'undefined' &&
    chrome.runtime &&
    chrome.runtime.getManifest
      ? `v${chrome.runtime.getManifest().version}`
      : 'version unknown'
  const buildTimeStr =
    SHOW_BUILD_DATE && BUILD_DATE
      ? `build: ${formatDateTime(new Date(BUILD_DATE))}`
      : ''
  return (
    <div className='border-theme-border-card w-full shrink-0 border-b'>
      <div className='flex items-center justify-between px-[16px] pt-[14px] pb-[12px]'>
        <div className='flex flex-col gap-[4px]'>
          <h1 className='text-theme-primary flex items-baseline gap-[6px] text-base leading-none font-semibold tracking-tight'>
            <span>Damn Center - the page !</span>
            <span className='text-theme-text-dim pb-[2px] text-[0.8125rem] leading-none font-normal'>
              {version}
            </span>
          </h1>
          {buildTimeStr && (
            <span className='text-theme-text-dim text-[0.8125rem] leading-none font-normal'>
              {buildTimeStr}
            </span>
          )}
        </div>
        {globalSetting && (
          <div className='flex items-center gap-[6px]'>
            {toggleSwitchView(
              globalSetting.enabled,
              () => dispatch({ _tag: 'ToggleGlobalEnabled' }),
              'big',
              globalSetting.enabled ? 'Disable Extension' : 'Enable Extension',
            )}
          </div>
        )}
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
          <label className='text-theme-text-dim text-[0.875rem] font-semibold tracking-wider uppercase'>
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
            <span className='text-theme-text-muted relative top-[1px] font-mono text-[0.875rem] leading-none uppercase'>
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
        <label className='text-theme-text-dim text-[0.875rem] font-semibold tracking-wider uppercase'>
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
                  <div className='text-theme-text-main w-full truncate text-[0.875rem] leading-none font-normal tracking-tight'>
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

const matchRowView = (
  item: PathSetting,
  idx: number,
  listLength: number,
  selectedIndex: number,
  currentUrl: string,
  // True for the rules of another monitor, which can only be copied
  readOnly: boolean,
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
        readOnly={readOnly}
        onChange={(e) => {
          dispatch({
            _tag: 'UpdateMatchPattern',
            index: idx,
            matchPattern: e.target.value,
          })
        }}
        onClick={(e) => e.stopPropagation()}
        placeholder='Match URL (e.g. ** or https://example.com/api/**)'
        className='bg-theme-bg-card border-theme-border-input text-theme-text-main focus:border-theme-primary w-full border px-[6px] py-[4px] font-mono text-[0.8125rem] focus:outline-none'
      />

      {globError && (
        <div className='px-[2px] font-mono text-[0.8125rem] leading-tight break-all text-red-500'>
          {globError}
        </div>
      )}

      {/* Line 2: Buttons & Toggle Switch */}
      {readOnly ? (
        <div className='flex items-center justify-between gap-[8px]'>
          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation()
              dispatch({ _tag: 'CopyRuleToCurrentMonitor', index: idx })
            }}
            className='border-theme-primary/40 text-theme-primary hover:border-theme-primary flex h-[22px] shrink-0 cursor-pointer items-center justify-center border px-[8px] text-[0.8125rem] font-semibold transition-all'
            title='Copy this match to the monitor this tab is on, replacing a match with the same URL pattern'
          >
            Copy to this monitor
          </button>
          <span className='text-theme-text-dim text-[0.8125rem] font-semibold tracking-wider uppercase'>
            {item.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      ) : (
        <div className='flex items-center justify-between gap-[8px]'>
          <div className='flex items-center gap-[6px]'>
            <button
              type='button'
              onClick={(e) => {
                e.stopPropagation()
                dispatch({ _tag: 'DeletePadSetting', index: idx })
              }}
              className='flex h-[22px] shrink-0 cursor-pointer items-center justify-center border border-red-500/20 px-[8px] text-[0.8125rem] font-semibold text-red-500 transition-all hover:border-red-500/40 hover:text-red-600'
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
              className='border-theme-border-input hover:bg-theme-bg-input text-theme-text-main flex h-[22px] shrink-0 cursor-pointer items-center justify-center border px-[8px] text-[0.8125rem] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40'
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
              className='border-theme-border-input hover:bg-theme-bg-input text-theme-text-main flex h-[22px] shrink-0 cursor-pointer items-center justify-center border px-[8px] text-[0.8125rem] font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40'
              title='Move Down'
            >
              <ChevronDownIcon />
            </button>
          </div>

          {/* Enable/Disable switch for this match */}
          <div className='flex items-center gap-[6px]'>
            <span className='text-theme-text-dim text-[0.8125rem] font-semibold tracking-wider uppercase'>
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
      )}
      {isMatching && isActiveMatch && (
        <div className='flex items-center gap-[4px] px-[2px]'>
          <div
            className={`h-[6px] w-[6px] shrink-0 ${item.enabled ? 'bg-theme-primary animate-pulse' : 'bg-theme-text-dim'}`}
          />
          <span
            className={`text-[0.8125rem] font-semibold tracking-wide uppercase ${item.enabled ? 'text-theme-primary' : 'text-theme-text-dim'}`}
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

// Lets a monitor without rules copy all the rules of another monitor
const copyMonitorRulesView = (
  otherMonitors: MonitorRules[],
  isOpen: boolean,
  dispatch: Dispatcher<Msg>,
) => {
  return (
    <div className='flex flex-col gap-[8px] pb-[8px]'>
      <button
        type='button'
        onClick={() => dispatch({ _tag: 'ToggleCopyMonitorList' })}
        className='text-theme-primary hover:text-theme-primary/80 cursor-pointer self-start text-[0.8125rem] font-semibold transition-all'
      >
        Copy from another monitor
      </button>
      {isOpen && (
        <div className='flex flex-col gap-[6px]'>
          {otherMonitors.map((entry) => (
            <button
              key={formatMonitor(entry.monitor)}
              type='button'
              onClick={() =>
                dispatch({
                  _tag: 'CopyRulesFromMonitor',
                  monitor: entry.monitor,
                })
              }
              title='Copy these matches to this monitor'
              className='bg-theme-bg-input border-theme-border-input hover:border-theme-primary text-theme-text-main flex cursor-pointer items-center justify-between border px-[10px] py-[6px] text-[0.8125rem] transition-all'
            >
              <span className='flex items-center gap-[6px] font-mono'>
                <MonitorIcon className='h-[14px] w-[14px]' />
                {formatMonitor(entry.monitor)}
              </span>
              <span className='text-theme-text-dim'>
                {matchCountText(entry.rules.length)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const matchCountText = (count: number) =>
  count === 1 ? '1 match' : `${count} matches`

// The monitor next to "Matches": a picker when other monitors have rules
const monitorPickerView = (
  monitor: Monitor,
  viewedMonitor: Monitor,
  otherMonitors: MonitorRules[],
  dispatch: Dispatcher<Msg>,
) => {
  const choices = [monitor, ...otherMonitors.map((entry) => entry.monitor)]
  return (
    // Never shrinks: plain text would run under the site switch next to it;
    // the row wraps instead
    <span
      className='text-theme-text-dim flex shrink-0 items-center gap-[4px] font-mono text-[0.75rem]'
      title='Matches apply on monitors of this screen size'
    >
      <MonitorIcon className='h-[12px] w-[12px] shrink-0' />
      {otherMonitors.length === 0 ? (
        formatMonitor(monitor)
      ) : (
        <select
          value={formatMonitor(viewedMonitor)}
          onChange={(e) => {
            const chosen = choices.find(
              (choice) => formatMonitor(choice) === e.target.value,
            )
            if (chosen) dispatch({ _tag: 'ViewMonitor', monitor: chosen })
          }}
          className='bg-theme-bg-input border-theme-border-input text-theme-text-main min-w-0 cursor-pointer border px-[2px] font-mono text-[0.75rem] focus:outline-none'
        >
          <option value={formatMonitor(monitor)}>
            {formatMonitor(monitor)} (current)
          </option>
          {otherMonitors.map((entry) => (
            <option
              key={formatMonitor(entry.monitor)}
              value={formatMonitor(entry.monitor)}
            >
              {formatMonitor(entry.monitor)} (
              {matchCountText(entry.rules.length)})
            </option>
          ))}
        </select>
      )}
    </span>
  )
}

// Shown while the popup shows another monitor than the tab's
const viewingOtherMonitorView = (
  monitor: Monitor,
  viewedMonitor: Monitor,
  currentCount: number,
  dispatch: Dispatcher<Msg>,
) => {
  const copyButtonClass =
    'border-theme-primary/40 text-theme-primary hover:border-theme-primary flex h-[22px] cursor-pointer items-center justify-center border px-[8px] text-[0.8125rem] font-semibold transition-all'
  return (
    <div className='bg-theme-bg-input border-theme-border-input flex flex-col gap-[8px] border p-[8px]'>
      <div className='text-theme-text-dim text-[0.8125rem]'>
        Viewing the matches of {formatMonitor(viewedMonitor)}, read only. This
        monitor ({formatMonitor(monitor)}) has {matchCountText(currentCount)}.
      </div>
      <div className='flex flex-wrap items-center gap-[6px]'>
        {/* Without matches on this monitor, replacing and adding the missing
            ones do the same, so one button does */}
        {currentCount === 0 ? (
          <button
            type='button'
            onClick={() => dispatch({ _tag: 'CopyAllRules', mode: 'Replace' })}
            className={copyButtonClass}
            title='Copy these matches to this monitor'
          >
            Copy all
          </button>
        ) : (
          <>
            <button
              type='button'
              onClick={() =>
                dispatch({ _tag: 'CopyAllRules', mode: 'Replace' })
              }
              className={copyButtonClass}
              title='Replace the matches of this monitor with these'
            >
              Copy all (replace)
            </button>
            <button
              type='button'
              onClick={() =>
                dispatch({ _tag: 'CopyAllRules', mode: 'AddMissing' })
              }
              className={copyButtonClass}
              title='Add the matches whose URL pattern this monitor does not have yet'
            >
              Copy missing
            </button>
          </>
        )}
        <button
          type='button'
          onClick={() => dispatch({ _tag: 'ViewMonitor', monitor })}
          className='text-theme-text-dim hover:text-theme-text-main cursor-pointer px-[4px] text-[0.8125rem] font-semibold transition-all'
        >
          Back to this monitor
        </button>
      </div>
    </div>
  )
}

const ISSUES_URL =
  'https://github.com/rinn7e/damn-center-extension/issues/new/choose'

// Covers the whole popup while the stored settings are not in the format of
// this build, so nothing is edited. Older settings wait for the user to
// confirm their migration; newer ones (saved by a newer version of the
// extension, e.g. after an older build was installed by hand) ask the user
// to update. Fails show the reason, with the
// settings to download (nothing was written, so they are the old ones) and
// where to report it.
const migrationPromptView = (
  migration: Exclude<Migration, { _tag: 'UpToDate' }>,
  dispatch: Dispatcher<Msg>,
) => {
  const buttonClass =
    'flex min-h-[30px] cursor-pointer items-center justify-center border px-[8px] py-[6px] text-center text-[0.8125rem] leading-tight font-semibold transition-all disabled:cursor-wait disabled:opacity-60'
  const primaryClass = `${buttonClass} border-theme-primary bg-theme-primary text-theme-secondary hover:bg-theme-primary/80`
  const secondaryClass = `${buttonClass} border-theme-primary/40 text-theme-primary hover:border-theme-primary`
  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-labelledby='migration-title'
      className='bg-theme-secondary absolute inset-0 z-50 flex flex-col'
    >
      {headerView(null, dispatch)}
      {/* Scrolls when it does not fit (large font sizes, long errors); safe
          centering keeps the top reachable then */}
      <div className='flex min-h-0 flex-1 flex-col justify-center-safe gap-[16px] overflow-y-auto px-[24px] py-[24px] text-center'>
        {migration._tag === 'Newer' ? (
          <>
            <h2
              id='migration-title'
              className='text-base font-semibold text-red-500'
            >
              Your extension is out of date
            </h2>
            <p className='text-theme-text-dim text-[0.8125rem] leading-relaxed'>
              This version of Damn Center expects format{' '}
              {CURRENT_SCHEMA_VERSION}, but your saved settings are in format{' '}
              {migration.storedVersion}, from a newer version. Update the
              extension to use them. Nothing is changed meanwhile.
            </p>
          </>
        ) : migration._tag === 'Failed' ? (
          <>
            <h2
              id='migration-title'
              className='text-base font-semibold text-red-500'
            >
              {migration.fromVersion === null
                ? 'Settings could not be read'
                : 'Settings update failed'}
            </h2>
            {/* Without a stored format, the settings could not even be read,
                so no update was tried */}
            <p className='text-theme-text-dim text-[0.8125rem] leading-relaxed'>
              {migration.fromVersion === null
                ? 'Your saved settings could not be read, and nothing was changed. Try again, or report the problem with the message below so it can be fixed.'
                : 'Your settings could not be updated to the format of this version, and nothing was changed. Download them to keep a backup, and report the problem with the message below so it can be fixed.'}
            </p>
            {/* Selectable, so it can be copied into a report */}
            <div className='bg-theme-bg-input cursor-text border border-red-500/40 p-[8px] text-left font-mono text-[0.75rem] wrap-break-word text-red-500 select-text'>
              {migration.error}
            </div>
            {/* Three columns of the same width */}
            <div className='grid grid-cols-3 gap-[8px]'>
              <button
                type='button'
                className={primaryClass}
                onClick={() => dispatch({ _tag: 'ExportConfig' })}
              >
                Download settings
              </button>
              <a
                href={ISSUES_URL}
                target='_blank'
                rel='noopener noreferrer'
                className={secondaryClass}
              >
                Report the problem
              </a>
              <button
                type='button'
                className={secondaryClass}
                onClick={() => dispatch({ _tag: 'RunMigration' })}
              >
                Try again
              </button>
            </div>
          </>
        ) : (
          <>
            <h2
              id='migration-title'
              className='text-theme-text-main text-base font-semibold'
            >
              Settings update needed
            </h2>
            <p className='text-theme-text-dim text-[0.8125rem] leading-relaxed'>
              This version of Damn Center stores its data in a new format
              {migration.fromVersion !== null &&
                ` (format ${migration.fromVersion} -> format ${CURRENT_SCHEMA_VERSION})`}
              . Click OK to update your settings. Your pages keep their padding
              meanwhile.
            </p>
            <div className='flex justify-center'>
              <button
                type='button'
                className={`${primaryClass} min-w-[120px]`}
                disabled={migration._tag === 'Running'}
                onClick={() => dispatch({ _tag: 'RunMigration' })}
              >
                {migration._tag === 'Running' ? 'Updating...' : 'OK'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const matchesCardView = (
  padSettingList: PathSetting[],
  selectedIndex: number,
  currentUrl: string,
  matchesCollapsed: boolean,
  siteEnabled: boolean,
  monitor: Monitor,
  viewedMonitor: Monitor,
  otherMonitors: MonitorRules[],
  currentCount: number,
  isCopyMonitorListOpen: boolean,
  dispatch: Dispatcher<Msg>,
) => {
  const readOnly = !isSameMonitor(viewedMonitor, monitor)
  return (
    <div className='flex flex-col gap-[12px]'>
      {/* Wraps onto a second line when it does not fit (large font sizes,
          or a monitor list instead of the screen size) */}
      <div className='flex flex-wrap items-center justify-between gap-x-[8px] gap-y-[6px]'>
        <div className='flex min-w-0 flex-wrap items-center gap-[8px]'>
          <span className='text-theme-text-main text-[0.875rem] font-semibold'>
            Matches
          </span>
          {monitorPickerView(monitor, viewedMonitor, otherMonitors, dispatch)}
          {padSettingList.length > 0 && (
            <div className='group relative flex items-center'>
              {toggleSwitchView(
                siteEnabled,
                () => dispatch({ _tag: 'ToggleDomainEnabled' }),
                'small',
                siteEnabled ? 'Disable per Domain' : 'Enable per Domain',
              )}
              {/* Shown next to the switch on hover only, so it takes no room
                  in the row */}
              <span className='text-theme-text-dim bg-theme-secondary pointer-events-none absolute top-1/2 left-full z-10 hidden -translate-y-1/2 pl-[6px] text-[0.625rem] leading-none font-normal whitespace-nowrap select-none group-hover:inline'>
                {siteEnabled
                  ? 'Disable all matches in this domain'
                  : 'Enable all matches in this domain'}
              </span>
            </div>
          )}
        </div>
        <div className='flex shrink-0 items-center gap-[8px]'>
          {!readOnly && (
            <button
              type='button'
              onClick={() => dispatch({ _tag: 'AddPadSetting' })}
              className='text-theme-primary hover:text-theme-primary/80 cursor-pointer text-[0.8125rem] font-semibold whitespace-nowrap transition-all'
            >
              + New Match
            </button>
          )}
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
          {readOnly &&
            viewingOtherMonitorView(
              monitor,
              viewedMonitor,
              currentCount,
              dispatch,
            )}
          {padSettingList.length === 0 ? (
            <div className='flex flex-col gap-[8px]'>
              <div className='text-theme-text-dim pb-[8px] text-[0.8125rem]'>
                No matches for this monitor yet. Click "+ New Match" to
                configure custom page padding.
              </div>
              {otherMonitors.length > 0 &&
                copyMonitorRulesView(
                  otherMonitors,
                  isCopyMonitorListOpen,
                  dispatch,
                )}
            </div>
          ) : (
            <div
              className={`flex flex-col gap-[8px] transition-opacity duration-200 ${
                // Rules of another monitor can still be copied while the
                // site is off
                !siteEnabled
                  ? readOnly
                    ? 'opacity-50'
                    : 'pointer-events-none opacity-50'
                  : ''
              }`}
            >
              {padSettingList.map((item, idx) =>
                matchRowView(
                  item,
                  idx,
                  padSettingList.length,
                  selectedIndex,
                  currentUrl,
                  readOnly,
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
        <label className='text-theme-text-muted text-[0.875rem] font-semibold'>
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
            className='bg-theme-bg-input border-theme-border-input text-theme-primary focus:border-theme-primary w-[48px] border px-[4px] py-[2px] text-center font-mono text-[0.875rem] focus:outline-none'
          />
          <span className='text-theme-text-dim font-mono text-[0.875rem]'>
            px
          </span>
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

const paddingWidthView = (settings: PathSetting, dispatch: Dispatcher<Msg>) => {
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

const paddingSideView = (settings: PathSetting, dispatch: Dispatcher<Msg>) => {
  const activeSideType = settings.side._tag
  const tabs: ('Left' | 'Right' | 'Both')[] = ['Left', 'Right', 'Both']
  return (
    <div className='flex flex-col gap-[4px]'>
      <label className='text-theme-text-dim text-[0.875rem] font-semibold tracking-wider uppercase'>
        Side
      </label>
      <div className='bg-theme-bg-input border-theme-border-input flex border p-[2px]'>
        {tabs.map((tab) => (
          <button
            key={tab}
            type='button'
            onClick={() => dispatch({ _tag: 'SetPadSideType', sideType: tab })}
            className={`w-[0px] flex-1 cursor-pointer py-[4px] text-center text-[0.875rem] font-semibold capitalize transition-all ${
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
  settings: PathSetting,
  dispatch: Dispatcher<Msg>,
) => {
  return (
    <div className='flex flex-col gap-[4px]'>
      <label className='text-theme-text-dim text-[0.875rem] font-semibold tracking-wider uppercase'>
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
            className={`flex w-[0px] flex-1 cursor-pointer items-center justify-center gap-[4px] py-[4px] text-[0.875rem] font-semibold capitalize transition-all ${
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
      <span className='text-theme-text-main text-[0.875rem] font-semibold'>
        Configure Styles
      </span>
      <div className='bg-theme-bg-input border-theme-border-input flex border p-[2px]'>
        <button
          type='button'
          onClick={() => dispatch({ _tag: 'SetActivePresetTab', tab: 'light' })}
          className={`cursor-pointer px-[8px] py-[2px] text-[0.875rem] font-semibold transition-all ${
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
          className={`cursor-pointer px-[8px] py-[2px] text-[0.875rem] font-semibold transition-all ${
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
  settings: PathSetting,
  globalSetting: GlobalSetting,
  activePresetTab: 'light' | 'dark',
  // True for a rule of another monitor: its own settings can't be changed,
  // but the ruler and the light / dark preview still work
  readOnly: boolean,
  dispatch: Dispatcher<Msg>,
) => {
  const ruleFieldsClass = `flex min-w-0 flex-col gap-[16px] ${readOnly ? 'opacity-60' : ''}`
  return (
    <div className='animate-slide-down flex flex-col gap-[16px]'>
      <div className='border-theme-border-card border-t' />
      <div className='flex items-center justify-between'>
        <span className='text-theme-text-main text-[0.875rem] font-semibold'>
          Settings
        </span>
        <button
          type='button'
          onClick={() => dispatch({ _tag: 'ToggleShowRuler' })}
          className='flex cursor-pointer items-center gap-[6px] text-[0.8125rem] font-medium text-red-500 transition-all select-none hover:text-red-600'
          title={globalSetting.showRuler ? 'Hide Ruler' : 'Show Ruler'}
        >
          <RulerIcon className='h-[14px] w-[14px] shrink-0' />
          <span>Ruler</span>
          {customCheckboxView(globalSetting.showRuler)}
        </button>
      </div>

      <fieldset disabled={readOnly} className={ruleFieldsClass}>
        {/* Padding Width */}
        {paddingWidthView(settings, dispatch)}

        {/* Padding Side */}
        {paddingSideView(settings, dispatch)}

        {/* Theme Trigger Mode selection */}
        {themeTriggerModeView(settings, dispatch)}
      </fieldset>

      {/* Background Styling Box */}
      <div className='border-theme-border-card bg-theme-bg-card flex flex-col gap-[12px] border p-[12px]'>
        {styleHeaderTabView(activePresetTab, dispatch)}

        {/* Render styling inputs for the selected sub-tab */}
        <fieldset disabled={readOnly} className={ruleFieldsClass}>
          {padThemeStylingView(
            activePresetTab,
            settings[activePresetTab],
            dispatch,
          )}
        </fieldset>
      </div>
    </div>
  )
}

const footerView = (
  globalSetting: GlobalSetting,
  dispatch: Dispatcher<Msg>,
) => {
  const currentFontSize = globalSetting.fontSize || DEFAULT_FONT_SIZE
  return (
    <div className='pt-[4px]'>
      <div className='border-theme-border-card flex flex-col gap-[12px] border-t pt-[16px]'>
        <div className='flex items-center justify-between'>
          <button
            type='button'
            onClick={() => dispatch({ _tag: 'ToggleDisableWhenNotMaximized' })}
            className='text-theme-text-dim hover:text-theme-text-muted flex cursor-pointer items-center gap-[6px] text-[0.8125rem] font-semibold transition-all select-none'
            title='Disable extension when window is not maximized'
          >
            {customCheckboxView(globalSetting.disableWhenNotMaximized)}
            <span>Disable when not maximized</span>
          </button>
        </div>

        <div className='flex items-center justify-between'>
          <span className='text-theme-text-dim text-[0.8125rem] font-semibold select-none'>
            Font Size
          </span>
          {/* Font Size Controller */}
          <div className='text-theme-text-dim flex items-center gap-[6px] text-[0.8125rem] font-semibold select-none'>
            <button
              type='button'
              onClick={() =>
                dispatch({ _tag: 'SetFontSize', fontSize: currentFontSize - 1 })
              }
              disabled={currentFontSize <= 12}
              className='hover:text-theme-primary px-[4px] transition-all disabled:cursor-not-allowed disabled:opacity-40'
              title='Decrease Font Size'
            >
              -
            </button>
            <span className='w-[38px] text-center font-mono'>
              {currentFontSize}px
            </span>
            <button
              type='button'
              onClick={() =>
                dispatch({ _tag: 'SetFontSize', fontSize: currentFontSize + 1 })
              }
              disabled={currentFontSize >= 32}
              className='hover:text-theme-primary px-[4px] transition-all disabled:cursor-not-allowed disabled:opacity-40'
              title='Increase Font Size'
            >
              +
            </button>
          </div>
        </div>
        <div className='flex items-center justify-between'>
          <a
            href='https://github.com/rinn7e/damn-center-extension'
            target='_blank'
            rel='noopener noreferrer'
            className='text-theme-text-dim hover:text-theme-primary text-[0.8125rem] font-normal underline transition-all'
          >
            Source Code
          </a>
          <div className='flex items-center gap-[12px]'>
            <button
              type='button'
              onClick={() => dispatch({ _tag: 'ExportConfig' })}
              className='text-theme-text-dim hover:text-theme-primary cursor-pointer text-[0.8125rem] font-semibold transition-all'
            >
              Export Config
            </button>
            <div className='bg-theme-border-input h-[10px] w-[1px]' />
            <label
              onClick={(e) => {
                const isPopup =
                  typeof chrome !== 'undefined' &&
                  chrome.extension &&
                  chrome.extension.getViews &&
                  chrome.extension.getViews({ type: 'popup' }).includes(window)
                if (isPopup && chrome.tabs && chrome.tabs.create) {
                  e.preventDefault()
                  chrome.tabs.create({
                    url: chrome.runtime.getURL('index.html?mode=tab'),
                  })
                }
              }}
              className='text-theme-text-dim hover:text-theme-primary cursor-pointer text-[0.8125rem] font-semibold transition-all'
            >
              Import Config
              <input
                type='file'
                accept='.json'
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    const reader = new FileReader()
                    reader.onload = (event) => {
                      const text = event.target?.result as string
                      dispatch({ _tag: 'ImportConfig', jsonText: text })
                    }
                    reader.readAsText(file)
                  }
                  e.target.value = ''
                }}
                className='hidden'
              />
            </label>
          </div>
        </div>
        <div className='text-theme-text-dim border-theme-border-card border-t px-[4px] pt-[8px] text-center text-[0.75rem] leading-relaxed font-normal'>
          If you like this extension, you can buy me a coffee at{' '}
          <a
            href='https://github.com/sponsors/rinn7e'
            target='_blank'
            rel='noopener noreferrer'
            className='text-theme-primary inline-flex items-center gap-[4px] align-middle font-semibold hover:underline'
          >
            <span>GitHub Sponsors</span>
            <HeartIcon />
          </a>
        </div>
      </div>
    </div>
  )
}

interface AppProps {
  model: Model
  dispatch: Dispatcher<Msg>
}

export const App: React.FC<AppProps> = ({ model, dispatch }) => {
  const {
    selectedIndex,
    activePresetTab,
    globalSetting,
    isInjectThemeDone,
    isSetFontSizeDone,
  } = model
  const padSettingList = viewedRules(model)
  const isViewingOther = isViewingOtherMonitor(model)
  const siteEnabled = model.site.enabled

  if (!isInjectThemeDone || !isSetFontSizeDone) {
    return (
      <div className='bg-theme-secondary flex h-[550px] flex-col items-center justify-center select-none'>
        <div
          className='border-theme-border-input border-t-theme-primary h-8 w-8 animate-spin border-4'
          style={{ borderRadius: '50%' }}
        ></div>
      </div>
    )
  }

  const settings = padSettingList[selectedIndex] || defaultPathSetting
  const hasAnyEnabled =
    padSettingList.some((item) => item.enabled) && siteEnabled
  const matchesAnyPattern = padSettingList.some((item) =>
    matchUrlPattern(model.currentUrl, item.matchPattern),
  )

  return (
    <div className='bg-theme-secondary text-theme-text-main relative flex h-[550px] flex-col select-none'>
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
                siteEnabled,
                model.monitor,
                model.viewedMonitor,
                otherMonitorRules(model.site, model.monitor),
                activeRules(model).length,
                model.isCopyMonitorListOpen,
                dispatch,
              )}

              {settings &&
                matchesAnyPattern &&
                hasAnyEnabled &&
                styleEditorView(
                  settings,
                  globalSetting,
                  activePresetTab,
                  // Another monitor's style is shown, but can't be changed
                  isViewingOther,
                  dispatch,
                )}
            </>
          ) : (
            <div className='flex flex-col items-center justify-center gap-[12px] px-[16px] py-[64px] text-center'>
              <div className='text-theme-text-dim'>
                <PowerIcon className='h-[32px] w-[32px]' />
              </div>
              <div className='flex flex-col items-center gap-[6px]'>
                <h3 className='text-theme-text-main text-[0.875rem] font-semibold'>
                  Extension is Disabled
                </h3>
                <p className='text-theme-text-dim max-w-[240px] text-[0.8125rem] leading-relaxed'>
                  Turn on the switch in the top right to enable Damn Center and
                  configure page padding!
                </p>
              </div>
            </div>
          )}
          {footerView(globalSetting, dispatch)}
        </div>
      </div>

      {model.migration._tag !== 'UpToDate' &&
        migrationPromptView(model.migration, dispatch)}
    </div>
  )
}
