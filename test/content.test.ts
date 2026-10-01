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

describe('Content script', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval'] })
    window.history.replaceState(null, '', PAGE_URL)
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false, addEventListener: vi.fn() })),
    )
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
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
    })

    expect(isShown('damn-center-left')).toBe(true)
    expect(byId('damn-center-left')!.style.width).toBe('160px')
  })
})
