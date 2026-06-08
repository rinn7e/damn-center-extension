/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import {
  getActivePadThemePure,
  resolveBgStyles,
  resolvePadWidths,
} from '../common/style-helper'
import {
  type GlobalSetting,
  defaultGlobalSetting,
} from '../common/type/global-setting'
import { type PadSettings } from '../common/type/pad-setting'
import {
  getHostname,
  loadGlobalSetting,
  loadPadSettings,
  matchUrlPattern,
} from '../storage/storage'

let currentSettings: PadSettings | null = null
let currentGlobalSetting: GlobalSetting | null = null

let styleElement: HTMLStyleElement | null = null
let leftPadPlaceholderElement: HTMLDivElement | null = null
let leftPadElement: HTMLDivElement | null = null
let rightPadPlaceholderElement: HTMLDivElement | null = null
let rightPadElement: HTMLDivElement | null = null
let rulerElement: HTMLDivElement | null = null

const systemThemeMedia = window.matchMedia('(prefers-color-scheme: dark)')

/**
 * Gets the background theme settings for the current mode.
 */
const getActivePadTheme = (settings: PadSettings) => {
  return getActivePadThemePure(
    settings.themeMode,
    settings.light,
    settings.dark,
    systemThemeMedia.matches,
  )
}

/**
 * Updates DOM styles based on settings.
 */
const updateStyles = (settings: PadSettings, globalSetting: GlobalSetting) => {
  currentSettings = settings
  currentGlobalSetting = globalSetting

  // Handle Centered Ruler
  if (settings.enabled && globalSetting.showRuler) {
    if (!rulerElement) {
      rulerElement = document.createElement('div')
      rulerElement.id = 'symmetry-pad-ruler'
      rulerElement.style.cssText =
        'position:fixed !important; top:0 !important; bottom:0 !important; left:50% !important; width:1px !important; background-color:rgba(239, 68, 68, 0.6) !important; z-index:2147483647 !important; pointer-events:none !important;'
      document.documentElement.appendChild(rulerElement)
    } else {
      rulerElement.style.display = 'block'
    }
  } else {
    if (rulerElement) {
      rulerElement.style.display = 'none'
    }
  }

  if (!styleElement) {
    styleElement = document.createElement('style')
    styleElement.id = 'symmetry-pad-style'
    document.documentElement.appendChild(styleElement)
  }

  const { leftWidth, rightWidth } = resolvePadWidths(settings.side)

  if (!settings.enabled || (leftWidth <= 0 && rightWidth <= 0)) {
    styleElement.textContent = ''
    if (leftPadPlaceholderElement)
      leftPadPlaceholderElement.style.display = 'none'
    if (leftPadElement) leftPadElement.style.display = 'none'
    if (rightPadPlaceholderElement)
      rightPadPlaceholderElement.style.display = 'none'
    if (rightPadElement) rightPadElement.style.display = 'none'
    return
  }

  const activePadTheme = getActivePadTheme(settings)

  // Unified layout shifting CSS using flexbox + order property:
  const css = `
    html {
      display: flex !important;
      flex-direction: row !important;
      width: 100vw !important;
      height: 100vh !important;
      overflow: hidden !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    body {
      position: relative !important;
      flex-grow: 1 !important;
      max-width: calc(100vw - ${leftWidth + rightWidth}px) !important;
      height: 100vh !important;
      overflow-y: auto !important;
      margin: 0 !important;
      order: 2 !important;
    }
    #symmetry-pad-left-placeholder {
      width: ${leftWidth}px !important;
      flex-shrink: 0 !important;
      height: 100vh !important;
      display: ${leftWidth > 0 ? 'block' : 'none'} !important;
      pointer-events: none !important;
      background: transparent !important;
      order: 1 !important;
    }
    #symmetry-pad-left {
      position: fixed !important;
      left: 0 !important;
      top: 0 !important;
      width: ${leftWidth}px !important;
      height: 100vh !important;
      display: ${leftWidth > 0 ? 'block' : 'none'} !important;
      pointer-events: none !important;
      z-index: 0 !important;
    }
    #symmetry-pad-right-placeholder {
      width: ${rightWidth}px !important;
      flex-shrink: 0 !important;
      height: 100vh !important;
      display: ${rightWidth > 0 ? 'block' : 'none'} !important;
      pointer-events: none !important;
      background: transparent !important;
      order: 3 !important;
    }
    #symmetry-pad-right {
      position: fixed !important;
      right: 0 !important;
      top: 0 !important;
      width: ${rightWidth}px !important;
      height: 100vh !important;
      display: ${rightWidth > 0 ? 'block' : 'none'} !important;
      pointer-events: none !important;
      z-index: 0 !important;
    }
  `

  styleElement.textContent = css

  const ensurePadDivs = () => {
    if (!leftPadPlaceholderElement) {
      leftPadPlaceholderElement = document.createElement('div')
      leftPadPlaceholderElement.id = 'symmetry-pad-left-placeholder'
      leftPadPlaceholderElement.style.cssText =
        'flex-shrink:0; height:100vh; pointer-events:none !important; background:transparent !important; transition: width 0.15s ease-out;'
      document.documentElement.appendChild(leftPadPlaceholderElement)
    }
    if (!leftPadElement) {
      leftPadElement = document.createElement('div')
      leftPadElement.id = 'symmetry-pad-left'
      leftPadElement.style.cssText =
        'position:fixed; left:0; top:0; height:100vh; z-index:0; pointer-events:none !important; transition: width 0.15s ease-out, background 0.15s ease-out;'
      document.documentElement.appendChild(leftPadElement)
    }
    if (!rightPadPlaceholderElement) {
      rightPadPlaceholderElement = document.createElement('div')
      rightPadPlaceholderElement.id = 'symmetry-pad-right-placeholder'
      rightPadPlaceholderElement.style.cssText =
        'flex-shrink:0; height:100vh; pointer-events:none !important; background:transparent !important; transition: width 0.15s ease-out;'
      document.documentElement.appendChild(rightPadPlaceholderElement)
    }
    if (!rightPadElement) {
      rightPadElement = document.createElement('div')
      rightPadElement.id = 'symmetry-pad-right'
      rightPadElement.style.cssText =
        'position:fixed; right:0; top:0; height:100vh; z-index:0; pointer-events:none !important; transition: width 0.15s ease-out, background 0.15s ease-out;'
      document.documentElement.appendChild(rightPadElement)
    }
  }

  ensurePadDivs()

  const applyBg = (
    el: HTMLDivElement,
    bgType: 'color' | 'pattern' | 'transparent',
    color: string,
    patternId: string,
  ) => {
    el.style.backgroundColor = ''
    el.style.backgroundImage = ''
    el.style.backgroundSize = ''

    const styles = resolveBgStyles(bgType, color, patternId)
    Object.assign(el.style, styles)
  }

  if (leftWidth > 0) {
    leftPadPlaceholderElement!.style.width = `${leftWidth}px`
    leftPadPlaceholderElement!.style.display = 'block'
    leftPadElement!.style.width = `${leftWidth}px`
    leftPadElement!.style.display = 'block'
    applyBg(
      leftPadElement!,
      activePadTheme.bgType,
      activePadTheme.bgColor,
      activePadTheme.bgPattern,
    )
  } else {
    if (leftPadPlaceholderElement)
      leftPadPlaceholderElement.style.display = 'none'
    if (leftPadElement) leftPadElement.style.display = 'none'
  }

  if (rightWidth > 0) {
    rightPadPlaceholderElement!.style.width = `${rightWidth}px`
    rightPadPlaceholderElement!.style.display = 'block'
    rightPadElement!.style.width = `${rightWidth}px`
    rightPadElement!.style.display = 'block'
    applyBg(
      rightPadElement!,
      activePadTheme.bgType,
      activePadTheme.bgColor,
      activePadTheme.bgPattern,
    )
  } else {
    if (rightPadPlaceholderElement)
      rightPadPlaceholderElement.style.display = 'none'
    if (rightPadElement) rightPadElement.style.display = 'none'
  }
}

/**
 * Initializes settings on current page.
 */
const init = () => {
  const hostname = getHostname(window.location.href)
  console.log('[Damn Center] Initializing content script for host:', hostname)

  Promise.all([loadGlobalSetting()(), loadPadSettings(hostname)()]).then(
    ([globalEither, padEither]) => {
      const globalSetting =
        globalEither._tag === 'Right'
          ? globalEither.right
          : defaultGlobalSetting
      const settingsList = padEither._tag === 'Right' ? padEither.right : []

      if (!globalSetting.enabled) {
        updateStyles(
          {
            enabled: false,
            side: { _tag: 'Left', width: 0 },
            themeMode: 'system',
            light: { bgType: 'transparent', bgColor: '', bgPattern: '' },
            dark: { bgType: 'transparent', bgColor: '', bgPattern: '' },
            matchPattern: '',
          },
          globalSetting,
        )
        return
      }

      const url = window.location.href
      const matched = settingsList.find(
        (s) => s.enabled && matchUrlPattern(url, s.matchPattern),
      )
      if (matched) {
        updateStyles(matched, globalSetting)
      } else {
        updateStyles(
          {
            enabled: false,
            side: { _tag: 'Left', width: 0 },
            themeMode: 'system',
            light: { bgType: 'transparent', bgColor: '', bgPattern: '' },
            dark: { bgType: 'transparent', bgColor: '', bgPattern: '' },
            matchPattern: '',
          },
          globalSetting,
        )
      }
    },
  )
}

let lastUrl = window.location.href

const checkUrlChange = () => {
  const url = window.location.href
  if (url !== lastUrl) {
    lastUrl = url
    console.log(
      '[Damn Center] URL change detected, re-evaluating matching rules:',
      url,
    )
    init()
  }
}

// Re-evaluate styles if system scheme changes
systemThemeMedia.addEventListener('change', () => {
  if (
    currentSettings &&
    currentGlobalSetting &&
    currentSettings.themeMode === 'system'
  ) {
    updateStyles(currentSettings, currentGlobalSetting)
  }
})

// Listen for popstate and hashchange events
window.addEventListener('popstate', checkUrlChange)
window.addEventListener('hashchange', checkUrlChange)

// Periodic check for client-side routing transitions
setInterval(checkUrlChange, 500)

// Listen for updates from the popup
if (
  typeof chrome !== 'undefined' &&
  chrome.runtime &&
  chrome.runtime.onMessage
) {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'SETTINGS_UPDATED') {
      console.log(
        '[Damn Center] Settings updated from popup:',
        message.settings,
      )
      updateStyles(
        message.settings,
        message.globalSetting || defaultGlobalSetting,
      )
    }
  })
}

// Run immediately or wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
