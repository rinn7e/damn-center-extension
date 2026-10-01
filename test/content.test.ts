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

// Loads src/worker/content.ts against a fresh DOM and a fake chrome.storage
const loadContentScript = async (
  storage: Record<string, unknown>,
): Promise<{ sendMessage: MessageListener }> => {
  const listeners: MessageListener[] = []
  vi.stubGlobal('chrome', {
    storage: {
      local: {
        get: (keys: string[], callback: (res: object) => void) =>
          callback(Object.fromEntries(keys.map((key) => [key, storage[key]]))),
      },
    },
    runtime: {
      onMessage: {
        addListener: (listener: MessageListener) => listeners.push(listener),
      },
    },
  })
  vi.resetModules()
  await import('../src/worker/content')
  await vi.waitFor(() => {
    expect(document.getElementById('damn-center-style')).not.toBeNull()
  })
  return {
    sendMessage: (message) =>
      listeners.forEach((listener) => listener(message)),
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
    vi.useFakeTimers({ toFake: ['setInterval'] })
    window.history.replaceState(null, '', PAGE_URL)
    setPrefersDark(false)
    setProperty(window.screen, 'availWidth', 1920)
    setProperty(window.screen, 'availHeight', 1080)
    setProperty(window, 'devicePixelRatio', 1)
    setWindowSize(1920, 1080)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    delete (document as { fullscreenElement?: unknown }).fullscreenElement
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

  it('leaves the page alone when no rule matches', async () => {
    await loadContentScript(
      storageWith([
        pathSetting({ matchPattern: 'https://example.com/blog/**' }),
      ]),
    )

    expect(isShown('damn-center-left')).toBe(false)
    expect(byId('damn-center-style')!.textContent).toBe('')
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
    expect(byId('damn-center-style')!.textContent).toBe('')
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
