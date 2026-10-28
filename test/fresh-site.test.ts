/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-only
 */
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { type SiteSetting } from '../src/common/type/site-setting'
import { type Model, type Msg } from '../src/type'
import { activeRules, loadInitialDataCmd, update } from '../src/update'

// A site the user has never set up: the popup shows the empty state
// ("No matches for this monitor yet"), and nothing saves a rule until + New
// Match

const HOST = 'example.org'
let saved: Record<string, unknown>

beforeEach(() => {
  saved = {}
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false, addEventListener: vi.fn() })),
  )
  vi.stubGlobal('chrome', {
    runtime: {},
    tabs: {
      query: (_query: object, callback: (tabs: object[]) => void) =>
        callback([{ id: 1, url: `https://${HOST}/page` }]),
      // No content script answers, like on a page that was open before the
      // extension was installed
      sendMessage: vi.fn(
        (_tabId: number, _message: unknown, callback?: () => void) =>
          callback?.(),
      ),
    },
    storage: {
      local: {
        // Answers with what was saved, as the real storage does
        get: (keys: string[] | null, callback: (res: object) => void) =>
          setTimeout(
            () =>
              callback(
                structuredClone(
                  keys === null
                    ? saved
                    : Object.fromEntries(
                        keys
                          .filter((key) => key in saved)
                          .map((key) => [key, saved[key]]),
                      ),
                ),
              ),
            0,
          ),
        set: (items: Record<string, unknown>, callback?: () => void) => {
          Object.assign(saved, items)
          callback?.()
        },
      },
    },
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// Opens the popup: runs the initial load and returns its Init message
const openPopup = async (): Promise<Extract<Msg, { _tag: 'Init' }>> => {
  const dispatched: Msg[] = []
  loadInitialDataCmd().execute((msg) => dispatched.push(msg))
  await vi.waitFor(() => expect(dispatched).toHaveLength(1))
  const init = dispatched[0]
  if (init?._tag !== 'Init') throw new Error('expected Init')
  return init
}

// Runs messages after Init, executing their commands
const run = async (init: Msg, ...msgs: Msg[]): Promise<Model> => {
  let model = update(init, null)[0]
  for (const msg of msgs) {
    const [next, cmd] = update(msg, model)
    cmd.execute(() => undefined)
    model = next
  }
  // A save reads the stored schema version first (one tick of the fake
  // storage), then writes; wait for both
  for (let tick = 0; tick < 2; tick++) {
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
  if (model === null) throw new Error('model is null')
  return model
}

describe('a site without saved rules', () => {
  it('opens with no matches', async () => {
    const init = await openPopup()

    expect(init.hostname).toBe(HOST)
    expect(init.site.monitors).toEqual([])
  })

  it.each<Msg>([
    { _tag: 'ToggleGlobalEnabled' },
    { _tag: 'ToggleShowRuler' },
    { _tag: 'ToggleDisableWhenNotMaximized' },
    { _tag: 'SetFontSize', fontSize: 20 },
    { _tag: 'ToggleDomainEnabled' },
  ])('gets no rule saved by $_tag', async (msg) => {
    await run(await openPopup(), msg)

    const site = saved[HOST] as SiteSetting | undefined
    expect(site?.monitors ?? []).toEqual([])
  })

  it('gets a rule once the user clicks + New Match', async () => {
    const model = await run(await openPopup(), { _tag: 'AddPadSetting' })

    expect(activeRules(model)).toHaveLength(1)
    expect((saved[HOST] as SiteSetting).monitors[0]!.rules).toContainEqual(
      expect.objectContaining({ _tag: 'PathSetting' }),
    )
  })
})
