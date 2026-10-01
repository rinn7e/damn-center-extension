/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-only
 */
import {
  getActivePadThemePure,
  resolveBgStyles,
  resolvePadWidths,
} from '../common/style-util'
import {
  type GlobalSetting,
  defaultGlobalSetting,
  globalSettingChangeAffectsPages,
} from '../common/type/global-setting'
import {
  type DomainSetting,
  type PathSetting,
  defaultDomainSetting,
} from '../common/type/pad-setting'
import {
  getHostname,
  loadGlobalSetting,
  loadPadSettings,
  matchUrlPattern,
} from '../storage/storage'

// Remove elements left by an earlier copy of this script. Firefox injects the
// content script into open tabs again when the add-on is installed, updated or
// re-enabled, but the old copy's elements stay on the page and this copy can't
// control them (doubled padding that won't turn off). 'symmetry-pad-*' is the
// id prefix used before 2.1.0.
//
// While an old copy's padding is applied, the page scrolls inside <body>;
// removing its style resets that, so remember the position first and carry it
// over when this copy applies its own padding. Only when that style actually
// holds padding: 2.0.0 added an empty one to every page, and there the window
// is scrolling, not <body>.
let leftoverScrollTop: number | undefined = document
  .querySelector('#damn-center-style, #symmetry-pad-style')
  ?.textContent?.trim()
  ? document.body?.scrollTop
  : undefined
document
  .querySelectorAll('[id^="damn-center-"], [id^="symmetry-pad-"]')
  .forEach((element) => element.remove())

// Only regular HTML pages get padding. In SVG or XML documents, opened
// directly in a tab, createElement() doesn't return HTML elements
const isHtmlDocument = () => document.documentElement instanceof HTMLHtmlElement

// Re-attaches an element the page removed, e.g. with document.open() or by
// replacing <html> while a framework takes over the page
const runEnsureAttached = (element: HTMLElement) => {
  if (!element.isConnected) {
    document.documentElement.appendChild(element)
  }
}

// Whether the flexbox shift (which moves scrolling from the window to <body>)
// is currently applied
let isShiftApplied = false

// Puts the padding back as soon as the page removes it (document.open(), or a
// framework replacing <html> or its children). Only started once this page has
// padding or a ruler, and it only watches the top two levels of the document,
// so other pages and ordinary DOM updates cost nothing.
let removalObserver: MutationObserver | undefined

const runWatchForRemoval = () => {
  if (removalObserver) {
    return
  }
  removalObserver = new MutationObserver(() => {
    const ours = [
      styleElement,
      leftPadPlaceholderElement,
      leftPadElement,
      rightPadPlaceholderElement,
      rightPadElement,
      rulerElement,
    ]
    // Watch the new <html> too, if the page replaced it
    if (document.documentElement) {
      removalObserver?.observe(document.documentElement, { childList: true })
    }
    if (
      isHtmlDocument() &&
      currentSettings &&
      currentGlobalSetting &&
      ours.some((element) => element && !element.isConnected)
    ) {
      runUpdateStyles(
        currentSettings,
        currentGlobalSetting,
        currentDomainSetting || defaultDomainSetting,
      )
    }
  })
  removalObserver.observe(document, { childList: true })
  removalObserver.observe(document.documentElement, { childList: true })
}

// Cached path matching rule for the active page
let currentSettings: PathSetting | null = null

// Cached global settings
let currentGlobalSetting: GlobalSetting | null = null

// Cached domain-specific toggle setting
let currentDomainSetting: DomainSetting | null = null

// Dynamic CSS style block injected into head
let styleElement: HTMLStyleElement | null = null

// Layout spacing block for left padding
let leftPadPlaceholderElement: HTMLDivElement | null = null

// Visual left pad overlay element
let leftPadElement: HTMLDivElement | null = null

// Layout spacing block for right padding
let rightPadPlaceholderElement: HTMLDivElement | null = null

// Visual right pad overlay element
let rightPadElement: HTMLDivElement | null = null

// Centered layout alignment ruler element
let rulerElement: HTMLDivElement | null = null

// Timer ID for debouncing window resize events (waits for OS snapping animations to settle)
let resizeTimeoutId: number | undefined

// Timer for re-reading settings when the tab becomes visible; separate from
// the resize timer so that restoring a window can't cancel the re-read
let visibilityTimeoutId: number | undefined

const systemThemeMedia = window.matchMedia('(prefers-color-scheme: dark)')

/**
 * Gets the background theme settings for the current mode.
 */
const getActivePadTheme = (settings: PathSetting) => {
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
  activePadTheme: {
    bgType: 'color' | 'pattern' | 'transparent'
    bgColor: string
    bgPattern: string
  },
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
    #damn-center-left-placeholder {
      width: ${leftWidth}px !important;
      flex-shrink: 0 !important;
      height: 100vh !important;
      display: ${leftWidth > 0 ? 'block' : 'none'} !important;
      pointer-events: none !important;
      background: transparent !important;
      order: 1 !important;
    }
    #damn-center-left {
      position: fixed !important;
      left: 0 !important;
      top: 0 !important;
      width: ${leftWidth}px !important;
      height: 100vh !important;
      display: ${leftWidth > 0 ? 'block' : 'none'} !important;
      pointer-events: none !important;
      z-index: 0 !important;
    }
    #damn-center-right-placeholder {
      width: ${rightWidth}px !important;
      flex-shrink: 0 !important;
      height: 100vh !important;
      display: ${rightWidth > 0 ? 'block' : 'none'} !important;
      pointer-events: none !important;
      background: transparent !important;
      order: 3 !important;
    }
    #damn-center-right {
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

  // Construct left and right helper elements if not already present
  const runEnsurePadDivs = () => {
    if (!leftPadPlaceholderElement) {
      leftPadPlaceholderElement = document.createElement('div')
      leftPadPlaceholderElement.id = 'damn-center-left-placeholder'
      leftPadPlaceholderElement.style.cssText =
        'flex-shrink:0; height:100vh; pointer-events:none !important; background:transparent !important; transition: width 0.15s ease-out;'
      document.documentElement.appendChild(leftPadPlaceholderElement)
    }
    if (!leftPadElement) {
      leftPadElement = document.createElement('div')
      leftPadElement.id = 'damn-center-left'
      leftPadElement.style.cssText =
        'position:fixed; left:0; top:0; height:100vh; z-index:0; pointer-events:none !important; transition: width 0.15s ease-out, background 0.15s ease-out;'
      document.documentElement.appendChild(leftPadElement)
    }
    if (!rightPadPlaceholderElement) {
      rightPadPlaceholderElement = document.createElement('div')
      rightPadPlaceholderElement.id = 'damn-center-right-placeholder'
      rightPadPlaceholderElement.style.cssText =
        'flex-shrink:0; height:100vh; pointer-events:none !important; background:transparent !important; transition: width 0.15s ease-out;'
      document.documentElement.appendChild(rightPadPlaceholderElement)
    }
    if (!rightPadElement) {
      rightPadElement = document.createElement('div')
      rightPadElement.id = 'damn-center-right'
      rightPadElement.style.cssText =
        'position:fixed; right:0; top:0; height:100vh; z-index:0; pointer-events:none !important; transition: width 0.15s ease-out, background 0.15s ease-out;'
      document.documentElement.appendChild(rightPadElement)
    }
    ;[
      leftPadPlaceholderElement,
      leftPadElement,
      rightPadPlaceholderElement,
      rightPadElement,
    ].forEach(runEnsureAttached)
  }

  runEnsurePadDivs()

  // Apply background properties (color/SVG pattern) to pad element
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

  // Configure width, visibility, and background styles for left padding
  if (leftWidth > 0) {
    leftPadPlaceholderElement!.style.width = `${leftWidth}px`
    leftPadPlaceholderElement!.style.display = 'block'
    leftPadElement!.style.width = `${leftWidth}px`
    leftPadElement!.style.display = 'block'
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

  // Configure width, visibility, and background styles for right padding
  if (rightWidth > 0) {
    rightPadPlaceholderElement!.style.width = `${rightWidth}px`
    rightPadPlaceholderElement!.style.display = 'block'
    rightPadElement!.style.width = `${rightWidth}px`
    rightPadElement!.style.display = 'block'
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

const runApplyPlaceholderShifting = () => {
  runHideAllPads()
}

const runHideAllPads = () => {
  if (styleElement) {
    styleElement.textContent = ''
  }
  if (leftPadPlaceholderElement) {
    leftPadPlaceholderElement.style.display = 'none'
  }
  if (leftPadElement) {
    leftPadElement.style.display = 'none'
  }
  if (rightPadPlaceholderElement) {
    rightPadPlaceholderElement.style.display = 'none'
  }
  if (rightPadElement) {
    rightPadElement.style.display = 'none'
  }
}

/**
 * Handles ruler creation and toggling (3 lines dividing screen into 4 equal parts).
 */
const runUpdateRuler = (
  globalSetting: GlobalSetting,
  isEffectivelyEnabled: boolean,
) => {
  if (isEffectivelyEnabled && globalSetting.showRuler) {
    if (!rulerElement) {
      rulerElement = document.createElement('div')
      rulerElement.id = 'damn-center-ruler'
      rulerElement.style.cssText =
        'position:fixed !important; top:0 !important; bottom:0 !important; left:0 !important; right:0 !important; z-index:2147483647 !important; pointer-events:none !important;'

      const positions = ['25%', '50%', '75%']
      positions.forEach((pos) => {
        const line = document.createElement('div')
        line.style.cssText = `position:absolute !important; top:0 !important; bottom:0 !important; left:${pos} !important; width:1px !important; background-color:rgba(239, 68, 68, 0.6) !important; pointer-events:none !important;`
        rulerElement!.appendChild(line)
      })
      document.documentElement.appendChild(rulerElement)
    } else {
      runEnsureAttached(rulerElement)
      rulerElement.style.display = 'block'
    }
  } else {
    if (rulerElement) {
      rulerElement.style.display = 'none'
    }
  }
}

/**
 * Calculates physical screen available dimensions for Chrome.
 */
const getScreenPhysicalChrome = () => {
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

/**
 * Checks window maximization state for macOS and Windows platforms.
 *
 * Why this function exists:
 * macOS and Windows allow querying standard browser outer dimensions via window.outerWidth/Height
 * which are consistent and independent of browser zoom. This allows us to perform a simple
 * and reliable comparison against screen.availWidth/Height, bypassing High DPI Retina
 * or fractional screen scaling scale factor differences.
 */
const calculateIsNotMaximizedMacWindows = (): boolean => {
  const isMaximized =
    window.outerWidth >= screen.availWidth - 50 &&
    window.outerHeight >= screen.availHeight - 150
  return !isMaximized
}

/**
 * Checks window maximization state for Linux platforms.
 *
 * Why this function exists:
 * Linux Chromium has a known compositor limitation under Wayland where window.outerWidth/Height
 * always return the full screen dimensions regardless of actual window sizing. To work around this
 * limitation, we must use viewport inner dimensions multiplied by the devicePixelRatio zoom factor
 * to calculate the actual physical layout space.
 */
const calculateIsNotMaximizedLinux = (): boolean => {
  const zoom = window.devicePixelRatio || 1
  const isFirefox = navigator.userAgent.includes('Firefox')

  const { screenPhysicalWidth, screenPhysicalHeight } = isFirefox
    ? getScreenPhysicalFirefox(zoom)
    : getScreenPhysicalChrome()

  const isMaximized =
    window.innerWidth * zoom >= screenPhysicalWidth - 50 &&
    window.innerHeight * zoom >= screenPhysicalHeight - 250

  return !isMaximized
}

/**
 * Calculates whether the browser window is currently not maximized.
 * Utilizes a zoom-aware heuristic with a small tolerance.
 */
const calculateIsNotMaximized = (): boolean => {
  const userAgent = navigator.userAgent
  const isSafari = userAgent.includes('Safari') && !userAgent.includes('Chrome')
  const isMac = userAgent.includes('Macintosh')
  const isWindows = userAgent.includes('Windows')

  if (isSafari || isMac || isWindows) {
    return calculateIsNotMaximizedMacWindows()
  } else {
    return calculateIsNotMaximizedLinux()
  }
}

/**
 * Determines whether the extension's padding and ruler should be active
 * based on individual page settings, global settings, and window maximization state.
 */
const calculateIsEffectivelyEnabled = (
  settings: PathSetting,
  globalSetting: GlobalSetting,
  domainSetting: DomainSetting,
): boolean => {
  const isNotMaximized = calculateIsNotMaximized()
  const isFullscreen = !!document.fullscreenElement

  return (
    globalSetting.enabled &&
    !(globalSetting.disableWhenNotMaximized && isNotMaximized) &&
    domainSetting.enabled &&
    settings.enabled &&
    !isFullscreen
  )
}

const runUpdateStyles = (
  settings: PathSetting,
  globalSetting: GlobalSetting,
  domainSetting: DomainSetting,
) => {
  if (!isHtmlDocument()) {
    return
  }

  // Cache settings locally for event listener callbacks
  currentSettings = settings
  currentGlobalSetting = globalSetting
  currentDomainSetting = domainSetting

  // Evaluate if styling should be active on this page and window size
  const isEffectivelyEnabled = calculateIsEffectivelyEnabled(
    settings,
    globalSetting,
    domainSetting,
  )

  // Update layout ruler line elements
  runUpdateRuler(globalSetting, isEffectivelyEnabled)

  const { leftWidth, rightWidth } = resolvePadWidths(settings.side)

  // Turning the shift on or off moves scrolling between the window and
  // <body>, so carry the scroll position across instead of jumping
  const shouldShift =
    isEffectivelyEnabled &&
    (leftWidth > 0 || rightWidth > 0) &&
    settings.shiftingStrategy._tag === 'Flexbox'
  const scrollTop =
    leftoverScrollTop !== undefined
      ? leftoverScrollTop
      : shouldShift === isShiftApplied
        ? undefined
        : isShiftApplied
          ? (document.body?.scrollTop ?? 0)
          : window.scrollY
  leftoverScrollTop = undefined

  // Clear styles and hide element structures if inactive or zero-width
  if (!isEffectivelyEnabled || (leftWidth <= 0 && rightWidth <= 0)) {
    runHideAllPads()
  } else {
    // Retrieve matching background colors and patterns based on current mode
    const activePadTheme = getActivePadTheme(settings)

    // Flexbox is the only strategy so far. 'Placeholder' is reserved for a
    // future one; nothing in the popup selects it yet
    if (settings.shiftingStrategy._tag === 'Placeholder') {
      runApplyPlaceholderShifting()
    } else {
      // Add the style tag only once padding is applied, so pages without a
      // matching rule are left untouched
      if (!styleElement) {
        styleElement = document.createElement('style')
        styleElement.id = 'damn-center-style'
      }
      runEnsureAttached(styleElement)
      runApplyFlexboxShifting(
        styleElement,
        leftWidth,
        rightWidth,
        activePadTheme,
      )
    }
  }

  isShiftApplied = shouldShift
  if (shouldShift || rulerElement) {
    runWatchForRemoval()
  }
  if (scrollTop !== undefined) {
    if (shouldShift) {
      if (document.body) document.body.scrollTop = scrollTop
    } else {
      window.scrollTo(window.scrollX, scrollTop)
    }
  }
}

// Used when no rule applies to the page: hides the pads and the ruler
const noMatchSetting: PathSetting = {
  _tag: 'PathSetting',
  enabled: false,
  side: { _tag: 'Left', width: 0 },
  themeMode: 'system',
  light: { bgType: 'transparent', bgColor: '', bgPattern: '' },
  dark: { bgType: 'transparent', bgColor: '', bgPattern: '' },
  matchPattern: '',
  shiftingStrategy: { _tag: 'Flexbox' },
}

// Timer for the periodic URL check below, started only when needed
let urlCheckIntervalId: ReturnType<typeof setInterval> | undefined

// Single-page apps change the URL without reloading the page, so poll for it.
// Rules belong to a hostname, which can't change without a reload, so this
// only runs on sites with at least one rule (or once the popup sends some).
const runStartUrlCheck = () => {
  if (urlCheckIntervalId === undefined) {
    urlCheckIntervalId = setInterval(() => runCheckUrlChange(), 500)
  }
}

const runStopUrlCheck = () => {
  if (urlCheckIntervalId !== undefined) {
    clearInterval(urlCheckIntervalId)
    urlCheckIntervalId = undefined
  }
}

/**
 * Initializes settings on current page.
 */
const runInit = () => {
  if (!isHtmlDocument()) {
    return
  }
  const hostname = getHostname(window.location.href)
  console.log('[Damn Center] Initializing content script for host:', hostname)

  Promise.all([loadGlobalSetting()(), loadPadSettings(hostname)()]).then(
    ([globalEither, padEither]) => {
      // If storage can't be read, keep the page as it is. This happens in tabs
      // that were open when the extension was updated or reloaded: their old
      // content script can no longer reach storage ("Extension context
      // invalidated"), and treating that as "no rules" would strip the padding
      if (globalEither._tag === 'Left' || padEither._tag === 'Left') {
        console.warn(
          '[Damn Center] Could not read settings; leaving the page unchanged',
        )
        return
      }
      const globalSetting = globalEither.right
      const settingsList = padEither.right

      const domainSetting =
        settingsList.find(
          (item): item is DomainSetting => item._tag === 'DomainSetting',
        ) || defaultDomainSetting

      const pathSettings = settingsList.filter(
        (item): item is PathSetting => item._tag === 'PathSetting',
      )

      if (pathSettings.length > 0) {
        runStartUrlCheck()
      } else {
        runStopUrlCheck()
      }

      if (!globalSetting.enabled || !domainSetting.enabled) {
        runUpdateStyles(noMatchSetting, globalSetting, domainSetting)
        return
      }

      const url = window.location.href
      const matched = pathSettings.find(
        (s) => s.enabled && matchUrlPattern(url, s.matchPattern),
      )
      if (matched) {
        runUpdateStyles(matched, globalSetting, domainSetting)
      } else {
        runUpdateStyles(noMatchSetting, globalSetting, domainSetting)
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
    runUpdateStyles(
      currentSettings,
      currentGlobalSetting,
      currentDomainSetting || defaultDomainSetting,
    )
  }
})

// Listen for popstate and hashchange events
window.addEventListener('popstate', runCheckUrlChange)
window.addEventListener('hashchange', runCheckUrlChange)

// Listen for updates from the popup.
//
// Known and accepted: the active tab applies each popup change twice, once
// from this message and once from the storage.onChanged listener below. The
// popup saves before it sends the message, so both carry the same settings and
// the second pass only re-applies what's already there (a few milliseconds, no
// visible effect). Removing the message would mean changing how the popup and
// this script talk to each other, which isn't worth it for no user-visible
// gain.
if (
  typeof chrome !== 'undefined' &&
  chrome.runtime &&
  chrome.runtime.onMessage
) {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'SETTINGS_UPDATED') {
      runStartUrlCheck()
      console.log(
        '[Damn Center] Settings updated from popup:',
        message.settings,
      )
      runUpdateStyles(
        message.settings,
        message.globalSetting || defaultGlobalSetting,
        message.domainSetting || defaultDomainSetting,
      )
    }
  })
}

// Apply changes made in the popup to every open tab, not only the active one
// (e.g. turning the extension back on, or editing this site's matches from
// another tab)
if (
  typeof chrome !== 'undefined' &&
  chrome.storage &&
  chrome.storage.onChanged
) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return
    const hostname = getHostname(window.location.href)
    const globalChange = changes['global_settings']
    if (
      hostname in changes ||
      (globalChange &&
        globalSettingChangeAffectsPages(
          globalChange.oldValue,
          globalChange.newValue,
        ))
    ) {
      runInit()
    }
  })
}

// Read the settings straight away instead of waiting for DOMContentLoaded, so
// the padding is in place before the page first paints rather than the page
// jumping once it has loaded. Everything this script adds is attached to
// <html>, which already exists at document_start.
runInit()

// Re-evaluate styles if the window is resized (to detect maximization shifts)
window.addEventListener('resize', () => {
  if (resizeTimeoutId) {
    window.clearTimeout(resizeTimeoutId)
  }

  // Defer execution by 150ms to allow OS snapping animations to settle
  // and ensure Chrome queries the correct final window dimensions.
  resizeTimeoutId = window.setTimeout(() => {
    if (currentSettings && currentGlobalSetting) {
      runUpdateStyles(
        currentSettings,
        currentGlobalSetting,
        currentDomainSetting || defaultDomainSetting,
      )
    }
  }, 150)
})

// Re-evaluate styles if the document enters or exits fullscreen mode
document.addEventListener('fullscreenchange', () => {
  if (currentSettings && currentGlobalSetting) {
    runUpdateStyles(
      currentSettings,
      currentGlobalSetting,
      currentDomainSetting || defaultDomainSetting,
    )
  }
})

// Re-evaluate styles when the tab becomes active/visible (fixes background tab initialization)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (visibilityTimeoutId) {
      window.clearTimeout(visibilityTimeoutId)
    }
    // Re-read the settings rather than reusing the cached ones: they may have
    // changed in the popup while this tab was in the background
    visibilityTimeoutId = window.setTimeout(runInit, 150)
  }
})
