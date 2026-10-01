/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-only
 */
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { defaultGlobalSetting } from '../src/common/type/global-setting'
import { type Hostname } from '../src/common/type/hostname'
import { createDefaultPathSetting } from '../src/common/type/pad-setting'
import { type Model, type Msg } from '../src/type'
import { update } from '../src/update'

// On a site with no saved rules, the popup shows a suggested default rule.
// It must only be saved when the user edits the rules, never as a side effect
// of a global or site-wide toggle.

const HOST = 'example.org'
const suggestedRule = createDefaultPathSetting(`https://${HOST}/**`)

const initFreshSite: Msg = {
  _tag: 'Init',
  hostname: HOST as Hostname,
  currentUrl: `https://${HOST}/`,
  globalSetting: defaultGlobalSetting,
  domainSetting: { _tag: 'DomainSetting', enabled: true },
  padSettingList: [suggestedRule],
  isDefaultRuleUnsaved: true,
}

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
        callback([]),
      sendMessage: vi.fn(),
    },
    storage: {
      local: {
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

// Runs the messages through update() and executes their commands
const run = async (...msgs: Msg[]): Promise<Model> => {
  let model = update(initFreshSite, null)[0]
  for (const msg of msgs) {
    const [next, cmd] = update(msg, model)
    cmd.execute(() => undefined)
    model = next
  }
  await new Promise((resolve) => setTimeout(resolve, 0))
  if (model === null) throw new Error('model is null')
  return model
}

describe('the suggested default rule on a site without rules', () => {
  it.each<Msg>([
    { _tag: 'ToggleGlobalEnabled' },
    { _tag: 'ToggleShowRuler' },
    { _tag: 'ToggleDisableWhenNotMaximized' },
    { _tag: 'SetFontSize', fontSize: 20 },
  ])('is not saved by $_tag', async (msg) => {
    await run(msg)

    expect(saved).not.toHaveProperty(HOST)
    expect(saved).toHaveProperty('global_settings')
  })

  it('is not saved when the site is switched off', async () => {
    await run({ _tag: 'ToggleDomainEnabled' })

    // Only the site's on/off switch is stored, without any rule
    expect(saved[HOST]).toEqual([
      expect.objectContaining({ _tag: 'DomainSetting', enabled: false }),
    ])
  })

  it('is saved once the user edits it', async () => {
    const model = await run({
      _tag: 'SetPadWidth',
      sideType: 'left',
      width: 200,
    })

    expect(model.isDefaultRuleUnsaved).toBe(false)
    expect(saved[HOST]).toEqual([
      expect.objectContaining({ _tag: 'DomainSetting' }),
      expect.objectContaining({
        _tag: 'PathSetting',
        side: { _tag: 'Left', width: 200 },
      }),
    ])
  })

  it('is kept by later toggles once it has been saved', async () => {
    await run(
      { _tag: 'SetPadWidth', sideType: 'left', width: 200 },
      { _tag: 'ToggleDomainEnabled' },
    )

    expect(saved[HOST]).toEqual([
      expect.objectContaining({ _tag: 'DomainSetting', enabled: false }),
      expect.objectContaining({ _tag: 'PathSetting' }),
    ])
  })
})
