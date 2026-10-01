/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-only
 */
// @vitest-environment jsdom
// @vitest-environment-options { "url": "https://example.com/" }
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  type GlobalSetting,
  defaultGlobalSetting,
} from '../src/common/type/global-setting'
import {
  type PaddingSetting,
  type PathSetting,
  createDefaultPathSetting,
} from '../src/common/type/pad-setting'

const PAGE_URL = 'https://example.com/docs/intro'

type MessageListener = (message: unknown) => void

// Listeners each loaded copy of the script adds, removed after every test so
// one test's script can't react to events fired in a later test
const addedListeners: Array<{
  target: EventTarget
  type: string
  listener: EventListenerOrEventListenerObject
}> = []

const recordListeners = (target: EventTarget) => {
  // A test that loads the script twice keeps the first wrapper
  if (vi.isMockFunction(target.addEventListener)) return
  const add = target.addEventListener.bind(target)
  vi.spyOn(target, 'addEventListener').mockImplementation(
    (type, listener, options) => {
      if (listener) addedListeners.push({ target, type, listener })
      add(type, listener, options)
    },
  )
}

// Lets pending storage callbacks and the work they trigger finish
const settle = async () => {
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

// Loads src/worker/content.ts against a fresh DOM and a fake chrome.storage
const loadContentScript = async (
  storage: Record<string, unknown>,
): Promise<{
  sendMessage: MessageListener
  changeStorage: (changes: Record<string, unknown>) => void
  storageReads: () => number
  breakStorage: () => void
}> => {
  const listeners: MessageListener[] = []
  const storageListeners: Array<(changes: object, areaName: string) => void> =
    []
  let storageReads = 0
  let storageBroken = false
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        // Like the real API: answers asynchronously, and throws once the
        // extension has been updated or reloaded under a running page
        get: (keys: string[], callback: (res: object) => void) => {
          if (storageBroken) {
            throw new Error('Extension context invalidated.')
          }
          storageReads += 1
          const result = Object.fromEntries(
            keys.map((key) => [key, structuredClone(storage[key])]),
          )
          setTimeout(() => callback(result), 0)
        },
      },
      onChanged: {
        addListener: (listener: (changes: object, areaName: string) => void) =>
          storageListeners.push(listener),
      },
    },
    runtime: {
      onMessage: {
        addListener: (listener: MessageListener) => listeners.push(listener),
      },
    },
  })
  recordListeners(window)
  recordListeners(document)
  vi.resetModules()
  await import('../src/worker/content')
  // The script reads the global and the site settings, then applies them
  await vi.waitFor(() => expect(storageReads).toBe(2))
  await settle()
  return {
    sendMessage: (message) =>
      listeners.forEach((listener) => listener(message)),
    // Saves new values, as the popup would from any tab
    changeStorage: (changes) => {
      const event = Object.fromEntries(
        Object.entries(changes).map(([key, newValue]) => [
          key,
          { oldValue: storage[key], newValue },
        ]),
      )
      Object.assign(storage, changes)
      storageListeners.forEach((listener) => listener(event, 'local'))
    },
    storageReads: () => storageReads,
    breakStorage: () => {
      storageBroken = true
    },
  }
}

const pathSetting = (overrides: Partial<PathSetting> = {}): PathSetting => ({
  ...createDefaultPathSetting('https://example.com/docs/**'),
  side: { _tag: 'Left', width: 120 },
  light: { bgType: 'color', bgColor: '#fdf6e3', bgPattern: '' },
  dark: { bgType: 'color', bgColor: '#fdf6e3', bgPattern: '' },
  ...overrides,
})

const storageWith = (
  settings: PaddingSetting[],
  globalSetting: GlobalSetting = defaultGlobalSetting,
) => ({ 'example.com': settings, global_settings: globalSetting })

const byId = (id: string) => document.getElementById(id) as HTMLElement | null

const isShown = (id: string) => {
  const element = byId(id)
  return element !== null && element.style.display !== 'none'
}

const setProperty = (target: object, key: string, value: unknown) =>
  Object.defineProperty(target, key, { value, configurable: true })

// A maximized 1920×1080 window; jsdom's defaults are 0 or 1024×768
const setWindowSize = (innerWidth: number, innerHeight: number) => {
  setProperty(window, 'innerWidth', innerWidth)
  setProperty(window, 'innerHeight', innerHeight)
  setProperty(window, 'outerWidth', innerWidth)
  setProperty(window, 'outerHeight', innerHeight)
}

const setPrefersDark = (prefersDark: boolean) =>
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: prefersDark, addEventListener: vi.fn() })),
  )

describe('Content script', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    window.history.replaceState(null, '', PAGE_URL)
    setPrefersDark(false)
    setProperty(window.screen, 'availWidth', 1920)
    setProperty(window.screen, 'availHeight', 1080)
    setProperty(window, 'devicePixelRatio', 1)
    setWindowSize(1920, 1080)
  })

  afterEach(() => {
    addedListeners
      .splice(0)
      .forEach(({ target, type, listener }) =>
        target.removeEventListener(type, listener),
      )
    vi.restoreAllMocks()
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    delete (document as { fullscreenElement?: unknown }).fullscreenElement
    delete (document as { visibilityState?: unknown }).visibilityState
    delete (document as { readyState?: unknown }).readyState
    document.documentElement.innerHTML = '<head></head><body></body>'
  })

  it('adds a left pad when a rule matches the page', async () => {
    await loadContentScript(storageWith([pathSetting()]))

    expect(isShown('damn-center-left')).toBe(true)
    expect(byId('damn-center-left')!.style.width).toBe('120px')
    expect(isShown('damn-center-right')).toBe(false)
    expect(byId('damn-center-style')!.textContent).toContain(
      'max-width: calc(100vw - 120px)',
    )
  })

  it('pads both sides with their own widths', async () => {
    await loadContentScript(
      storageWith([
        pathSetting({ side: { _tag: 'Both', leftWidth: 80, rightWidth: 200 } }),
      ]),
    )

    expect(byId('damn-center-left')!.style.width).toBe('80px')
    expect(byId('damn-center-right')!.style.width).toBe('200px')
    expect(byId('damn-center-style')!.textContent).toContain(
      'max-width: calc(100vw - 280px)',
    )
  })

  it('applies the padding before the page has finished loading', async () => {
    setProperty(document, 'readyState', 'loading')
    await loadContentScript(storageWith([pathSetting()]))

    expect(isShown('damn-center-left')).toBe(true)
  })

  it('removes elements left by an earlier copy of the script', async () => {
    // What a 2.0.0 copy (symmetry-pad-*) or an earlier 2.1+ copy leaves behind
    // when Firefox injects the script again after an update
    for (const id of [
      'symmetry-pad-left',
      'symmetry-pad-style',
      'damn-center-left-placeholder',
      'damn-center-ruler',
    ]) {
      const leftover = document.createElement('div')
      leftover.id = id
      document.documentElement.appendChild(leftover)
    }

    await loadContentScript(storageWith([]))

    expect(
      document.querySelector('[id^="damn-center"], [id^="symmetry-pad"]'),
    ).toBeNull()
  })

  it('keeps a single set of pads when the script is injected again', async () => {
    const storage = storageWith([pathSetting()])
    await loadContentScript(storage)
    await loadContentScript(storage)

    expect(
      document.querySelectorAll('#damn-center-left-placeholder'),
    ).toHaveLength(1)
    expect(document.querySelectorAll('#damn-center-style')).toHaveLength(1)
  })

  it('adds nothing to a site that has no rules', async () => {
    await loadContentScript(storageWith([]))

    expect(document.querySelector('[id^="damn-center"]')).toBeNull()
  })

  it('leaves the page alone when no rule matches', async () => {
    await loadContentScript(
      storageWith([
        pathSetting({ matchPattern: 'https://example.com/blog/**' }),
      ]),
    )

    expect(isShown('damn-center-left')).toBe(false)
    expect(byId('damn-center-style')).toBeNull()
  })

  it('uses the first enabled rule that matches', async () => {
    await loadContentScript(
      storageWith([
        pathSetting({ enabled: false, side: { _tag: 'Left', width: 300 } }),
        pathSetting({ side: { _tag: 'Right', width: 90 } }),
        pathSetting({ side: { _tag: 'Left', width: 50 } }),
      ]),
    )

    expect(isShown('damn-center-left')).toBe(false)
    expect(byId('damn-center-right')!.style.width).toBe('90px')
  })

  it('does nothing when the domain toggle is off', async () => {
    await loadContentScript(
      storageWith([{ _tag: 'DomainSetting', enabled: false }, pathSetting()]),
    )

    expect(isShown('damn-center-left')).toBe(false)
    expect(byId('damn-center-style')).toBeNull()
  })

  it('does nothing when the extension is turned off', async () => {
    await loadContentScript(
      storageWith([pathSetting()], { ...defaultGlobalSetting, enabled: false }),
    )

    expect(isShown('damn-center-left')).toBe(false)
  })

  it('shows the ruler only when it is turned on', async () => {
    await loadContentScript(
      storageWith([pathSetting()], {
        ...defaultGlobalSetting,
        showRuler: true,
      }),
    )

    expect(isShown('damn-center-ruler')).toBe(true)
    expect(byId('damn-center-ruler')!.children).toHaveLength(3)
  })

  it('applies settings sent from the popup', async () => {
    const { sendMessage } = await loadContentScript(storageWith([]))
    expect(isShown('damn-center-left')).toBe(false)

    sendMessage({
      type: 'SETTINGS_UPDATED',
      settings: pathSetting({ side: { _tag: 'Left', width: 160 } }),
      globalSetting: defaultGlobalSetting,
      domainSetting: { _tag: 'DomainSetting', enabled: true },
    })

    expect(isShown('damn-center-left')).toBe(true)
    expect(byId('damn-center-left')!.style.width).toBe('160px')
  })

  it('only polls for URL changes on sites that have rules', async () => {
    await loadContentScript(storageWith([]))
    expect(vi.getTimerCount()).toBe(0)
  })

  it('starts polling once the popup sends settings for the site', async () => {
    const { sendMessage } = await loadContentScript(storageWith([]))

    sendMessage({
      type: 'SETTINGS_UPDATED',
      settings: pathSetting(),
      globalSetting: defaultGlobalSetting,
      domainSetting: { _tag: 'DomainSetting', enabled: true },
    })

    expect(vi.getTimerCount()).toBe(1)
  })

  describe('settings changed outside this tab', () => {
    const turnedOff = { ...defaultGlobalSetting, enabled: false }

    it('applies them right away, even in a background tab', async () => {
      const { changeStorage } = await loadContentScript(
        storageWith([pathSetting()], turnedOff),
      )
      expect(isShown('damn-center-left')).toBe(false)

      changeStorage({ global_settings: defaultGlobalSetting })

      await vi.waitFor(() => expect(isShown('damn-center-left')).toBe(true))
    })

    it('ignores changes to other sites', async () => {
      const { changeStorage, storageReads } = await loadContentScript(
        storageWith([pathSetting()]),
      )
      const readsBefore = storageReads()

      changeStorage({ 'other-site.org': [] })

      expect(storageReads()).toBe(readsBefore)
    })

    it('skips changes that only affect the popup font size', async () => {
      const { changeStorage, storageReads } = await loadContentScript(
        storageWith([pathSetting()]),
      )
      const readsBefore = storageReads()

      changeStorage({
        global_settings: { ...defaultGlobalSetting, fontSize: 24 },
      })

      expect(storageReads()).toBe(readsBefore)
    })

    it('stops polling for URL changes once the last rule is deleted', async () => {
      const { changeStorage } = await loadContentScript(
        storageWith([pathSetting()]),
      )
      expect(vi.getTimerCount()).toBe(1)

      changeStorage({ 'example.com': [] })
      await settle()

      expect(vi.getTimerCount()).toBe(0)
    })

    it('still re-reads them when a resize follows', async () => {
      // Restoring a minimized window fires visibilitychange, then resize
      const storage = storageWith([pathSetting()], turnedOff)
      await loadContentScript(storage)

      storage.global_settings = defaultGlobalSetting
      setProperty(document, 'visibilityState', 'visible')
      document.dispatchEvent(new Event('visibilitychange'))
      window.dispatchEvent(new Event('resize'))

      await vi.waitFor(() => expect(isShown('damn-center-left')).toBe(true))
    })

    it('keeps the padding when storage can no longer be read', async () => {
      // e.g. a tab left open while the extension was updated
      const { changeStorage, breakStorage } = await loadContentScript(
        storageWith([pathSetting()]),
      )
      expect(isShown('damn-center-left')).toBe(true)
      breakStorage()

      setProperty(document, 'visibilityState', 'visible')
      document.dispatchEvent(new Event('visibilitychange'))
      await new Promise((resolve) => setTimeout(resolve, 200))
      changeStorage({ global_settings: defaultGlobalSetting })
      await settle()

      expect(isShown('damn-center-left')).toBe(true)
      expect(byId('damn-center-left')!.style.width).toBe('120px')
    })

    it('re-reads them when the tab becomes visible', async () => {
      const storage = storageWith([pathSetting()], turnedOff)
      await loadContentScript(storage)
      expect(isShown('damn-center-left')).toBe(false)

      // Changed without an event reaching this tab
      storage.global_settings = defaultGlobalSetting
      setProperty(document, 'visibilityState', 'visible')
      document.dispatchEvent(new Event('visibilitychange'))

      await vi.waitFor(() => expect(isShown('damn-center-left')).toBe(true))
    })
  })

  it('re-checks the rules when a single-page app changes the URL', async () => {
    await loadContentScript(storageWith([pathSetting()]))
    expect(isShown('damn-center-left')).toBe(true)

    window.history.pushState(null, '', 'https://example.com/blog/post')
    vi.advanceTimersByTime(500)

    await vi.waitFor(() => expect(isShown('damn-center-left')).toBe(false))
  })

  it('uses the light colors in light mode and the dark colors in dark mode', async () => {
    const colors = {
      light: { bgType: 'color', bgColor: 'rgb(253, 246, 227)', bgPattern: '' },
      dark: { bgType: 'color', bgColor: 'rgb(0, 43, 54)', bgPattern: '' },
    } as const
    await loadContentScript(
      storageWith([pathSetting({ themeMode: 'dark', ...colors })]),
    )
    expect(byId('damn-center-left')!.style.backgroundColor).toBe(
      'rgb(0, 43, 54)',
    )

    document.documentElement.innerHTML = '<head></head><body></body>'
    await loadContentScript(
      storageWith([pathSetting({ themeMode: 'light', ...colors })]),
    )
    expect(byId('damn-center-left')!.style.backgroundColor).toBe(
      'rgb(253, 246, 227)',
    )
  })

  it('follows the system color scheme in system mode', async () => {
    setPrefersDark(true)
    await loadContentScript(
      storageWith([
        pathSetting({
          themeMode: 'system',
          light: {
            bgType: 'color',
            bgColor: 'rgb(253, 246, 227)',
            bgPattern: '',
          },
          dark: { bgType: 'color', bgColor: 'rgb(0, 43, 54)', bgPattern: '' },
        }),
      ]),
    )

    expect(byId('damn-center-left')!.style.backgroundColor).toBe(
      'rgb(0, 43, 54)',
    )
  })

  it('draws a pattern background', async () => {
    const pattern = {
      bgType: 'pattern',
      bgColor: '#2aa198',
      bgPattern: 'dots',
    } as const
    await loadContentScript(
      storageWith([pathSetting({ light: pattern, dark: pattern })]),
    )

    expect(byId('damn-center-left')!.style.backgroundImage).not.toBe('')
    expect(byId('damn-center-left')!.style.backgroundImage).not.toBe('none')
  })

  it('steps aside while the page is fullscreen', async () => {
    setProperty(document, 'fullscreenElement', document.body)
    await loadContentScript(storageWith([pathSetting()]))

    expect(isShown('damn-center-left')).toBe(false)
  })

  describe('"Disable when not maximized"', () => {
    const notMaximizedSetting = {
      ...defaultGlobalSetting,
      disableWhenNotMaximized: true,
    }

    it('keeps the pads in a maximized window', async () => {
      await loadContentScript(storageWith([pathSetting()], notMaximizedSetting))

      expect(isShown('damn-center-left')).toBe(true)
    })

    it('hides the pads in a smaller window', async () => {
      setWindowSize(1200, 800)
      await loadContentScript(storageWith([pathSetting()], notMaximizedSetting))

      expect(isShown('damn-center-left')).toBe(false)
    })

    it('ignores the window size when the option is off', async () => {
      setWindowSize(1200, 800)
      await loadContentScript(storageWith([pathSetting()]))

      expect(isShown('damn-center-left')).toBe(true)
    })
  })
})
