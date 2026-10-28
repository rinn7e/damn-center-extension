/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-only
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { queryActiveTabAndSettings } from '../src/update'

const stubBrowser = (tab: { id: number; url?: string }) => {
  // The popup falls back to its own screen when the tab has no answer
  vi.stubGlobal('screen', { width: 1920, height: 1080 })
  vi.stubGlobal('chrome', {
    runtime: {},
    tabs: {
      query: (_query: object, callback: (tabs: object[]) => void) =>
        callback([tab]),
    },
    storage: {
      local: {
        get: (_keys: string[], callback: (res: object) => void) =>
          setTimeout(() => callback({}), 0),
        // The popup marks fresh storage with the current schema version
        set: (_items: object, callback?: () => void) => callback?.(),
      },
    },
  })
}

describe('queryActiveTabAndSettings', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses the hostname of a normal page', async () => {
    stubBrowser({ id: 1, url: 'https://example.com/docs/intro' })

    const { hostname, currentUrl } = await queryActiveTabAndSettings()

    expect(hostname).toBe('example.com')
    expect(currentUrl).toBe('https://example.com/docs/intro')
  })

  it('uses system-settings when the browser hides the page URL', async () => {
    // e.g. chrome://settings, whose URL the popup isn't given
    stubBrowser({ id: 1 })

    const { hostname } = await queryActiveTabAndSettings()

    expect(hostname).toBe('system-settings')
  })
})
