/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import {
  getActivePadThemePure,
  resolveBgStyles,
  resolvePadWidths,
} from '../common/style-util'
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

const runApplyFlexboxShifting = (
  styleElement: HTMLStyleElement,
  leftWidth: number,
  rightWidth: number,
) => {
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
}

const runApplyPlaceholderShifting = (
  styleElement: HTMLStyleElement,
  _leftWidth: number,
  _rightWidth: number,
) => {
  styleElement.textContent = ''
}

/**
 * Handles ruler creation and toggling (3 lines dividing screen into 4 equal parts).
 */
const runUpdateRuler = (
  settings: PadSettings,
  globalSetting: GlobalSetting,
  isEffectivelyEnabled: boolean,
) => {
  if (isEffectivelyEnabled && globalSetting.showRuler) {
    if (!rulerElement) {
      rulerElement = document.createElement('div')
      rulerElement.id = 'symmetry-pad-ruler'
      rulerElement.style.cssText =
        'position:fixed !important; top:0 !important; bottom:0 !important; left:0 !important; right:0 !important; z-index:2147483647 !important; pointer-events:none !important;'

      const positions = ['25%', '50%', '75%']
      positions.forEach((pos) => {
        const line = document.createElement('div')
        line.style.cssText = `position:absolute !important; top:0 !important; bottom:0 !important; left:${pos} !important; width:1px !important; background-color:rgba(239, 68, 68, 0.6) !important; pointer-events:none !important;'`
        rulerElement!.appendChild(line)
      })
      document.documentElement.appendChild(rulerElement)
    } else {
      rulerElement.style.display = 'block'
    }
  } else {
    if (rulerElement) {
      rulerElement.style.display = 'none'
    }
  }
}

/**
 * Calculates whether the browser window is currently not maximized.
 * Utilizes a zoom-aware heuristic with a small tolerance.
 */
/**
 * Calculates physical screen available dimensions for Chrome.
 */
const getScreenPhysicalChrome = (_zoom: number) => {
  return {
    screenPhysicalWidth: screen.availWidth,
    screenPhysicalHeight: screen.availHeight,
  }
}

/**
 * Calculates physical screen available dimensions for Firefox.
 */
const getScreenPhysicalFirefox = (zoom: number) => {
  return {
    screenPhysicalWidth: screen.availWidth * zoom,
    screenPhysicalHeight: screen.availHeight * zoom,
  }
}

const calculateIsNotMaximized = (): boolean => {
  const zoom = window.devicePixelRatio || 1
  const isFirefox = navigator.userAgent.includes('Firefox')

  const { screenPhysicalWidth, screenPhysicalHeight } = isFirefox
    ? getScreenPhysicalFirefox(zoom)
    : getScreenPhysicalChrome(zoom)

  // Linux Chrome has a known bug under Wayland where window.outerWidth/Height
  // always return full screen dimensions. We use viewport inner dimensions instead,
  // which are always accurate and represent the actual space available to the page.
  const isMaximized =
    window.innerWidth * zoom >= screenPhysicalWidth - 50 &&
    window.innerHeight * zoom >= screenPhysicalHeight - 250

  return !isMaximized
}

/**
 * Determines whether the extension's padding and ruler should be active
 * based on individual page settings, global settings, and window maximization state.
 */
const calculateIsEffectivelyEnabled = (
  settings: PadSettings,
  globalSetting: GlobalSetting,
): boolean => {
  const isNotMaximized = calculateIsNotMaximized()

  return (
    settings.enabled &&
    globalSetting.enabled &&
    !(globalSetting.disableWhenNotMaximized && isNotMaximized)
  )
}

const runUpdateStyles = (
  settings: PadSettings,
  globalSetting: GlobalSetting,
) => {
  currentSettings = settings
  currentGlobalSetting = globalSetting

  const isEffectivelyEnabled = calculateIsEffectivelyEnabled(
    settings,
    globalSetting,
  )

  runUpdateRuler(settings, globalSetting, isEffectivelyEnabled)

  if (!styleElement) {
    styleElement = document.createElement('style')
    styleElement.id = 'symmetry-pad-style'
    document.documentElement.appendChild(styleElement)
  }

  const { leftWidth, rightWidth } = resolvePadWidths(settings.side)

  if (!isEffectivelyEnabled || (leftWidth <= 0 && rightWidth <= 0)) {
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

  if (settings.shiftingStrategy._tag === 'Placeholder') {
    runApplyPlaceholderShifting(styleElement, leftWidth, rightWidth)
  } else {
    runApplyFlexboxShifting(styleElement, leftWidth, rightWidth)
  }

  const runEnsurePadDivs = () => {
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

  runEnsurePadDivs()

  const runApplyBg = (
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

  const isPlaceholder = settings.shiftingStrategy._tag === 'Placeholder'

  if (leftWidth > 0) {
    leftPadPlaceholderElement!.style.width = `${leftWidth}px`
    leftPadPlaceholderElement!.style.display = isPlaceholder ? 'none' : 'block'
    leftPadElement!.style.width = `${leftWidth}px`
    leftPadElement!.style.display = isPlaceholder ? 'none' : 'block'
    runApplyBg(
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
    rightPadPlaceholderElement!.style.display = isPlaceholder ? 'none' : 'block'
    rightPadElement!.style.width = `${rightWidth}px`
    rightPadElement!.style.display = isPlaceholder ? 'none' : 'block'
    runApplyBg(
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
const runInit = () => {
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
        runUpdateStyles(
          {
            enabled: false,
            side: { _tag: 'Left', width: 0 },
            themeMode: 'system',
            light: { bgType: 'transparent', bgColor: '', bgPattern: '' },
            dark: { bgType: 'transparent', bgColor: '', bgPattern: '' },
            matchPattern: '',
            shiftingStrategy: { _tag: 'Flexbox' },
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
        runUpdateStyles(matched, globalSetting)
      } else {
        runUpdateStyles(
          {
            enabled: false,
            side: { _tag: 'Left', width: 0 },
            themeMode: 'system',
            light: { bgType: 'transparent', bgColor: '', bgPattern: '' },
            dark: { bgType: 'transparent', bgColor: '', bgPattern: '' },
            matchPattern: '',
            shiftingStrategy: { _tag: 'Flexbox' },
          },
          globalSetting,
        )
      }
    },
  )
}

let lastUrl = window.location.href

const runCheckUrlChange = () => {
  const url = window.location.href
  if (url !== lastUrl) {
    lastUrl = url
    console.log(
      '[Damn Center] URL change detected, re-evaluating matching rules:',
      url,
    )
    runInit()
  }
}

// Re-evaluate styles if system theme changes
systemThemeMedia.addEventListener('change', () => {
  if (
    currentSettings &&
    currentGlobalSetting &&
    currentSettings.themeMode === 'system'
  ) {
    runUpdateStyles(currentSettings, currentGlobalSetting)
  }
})

// Listen for popstate and hashchange events
window.addEventListener('popstate', runCheckUrlChange)
window.addEventListener('hashchange', runCheckUrlChange)

// Periodic check for client-side routing transitions
setInterval(runCheckUrlChange, 500)

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
      runUpdateStyles(
        message.settings,
        message.globalSetting || defaultGlobalSetting,
      )
    }
  })
}

// Run immediately or wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runInit)
} else {
  runInit()
}

// Re-evaluate styles if the window is resized (to detect maximization shifts)
window.addEventListener('resize', () => {
  if (currentSettings && currentGlobalSetting) {
    runUpdateStyles(currentSettings, currentGlobalSetting)
  }
})
