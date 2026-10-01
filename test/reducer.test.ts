/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-only
 */
import { describe, expect, it } from 'vitest'

import { defaultGlobalSetting } from '../src/common/type/global-setting'
import { type Hostname } from '../src/common/type/hostname'
import {
  type PathSetting,
  createDefaultPathSetting,
} from '../src/common/type/pad-setting'
import { type Model, type Msg } from '../src/type'
import { update } from '../src/update'

const URL = 'https://example.com/docs/intro'

const docsRule: PathSetting = {
  ...createDefaultPathSetting('https://example.com/docs/**'),
  side: { _tag: 'Left', width: 80 },
}
const blogRule = createDefaultPathSetting('https://example.com/blog/**')

const initMsg: Extract<Msg, { _tag: 'Init' }> = {
  _tag: 'Init',
  hostname: 'example.com' as Hostname,
  currentUrl: URL,
  globalSetting: defaultGlobalSetting,
  domainSetting: { _tag: 'DomainSetting', enabled: true },
  padSettingList: [blogRule, docsRule],
  isDefaultRuleUnsaved: false,
}

// Runs messages through update() starting from Init, returning the model
const run = (...msgs: Msg[]): Model => {
  let model = update(initMsg, null)[0]
  for (const msg of msgs) {
    model = update(msg, model)[0]
  }
  if (model === null) throw new Error('model is null')
  return model
}

describe('update', () => {
  it('ignores everything until Init arrives', () => {
    expect(update({ _tag: 'ToggleShowRuler' }, null)[0]).toBeNull()
  })

  it('selects the rule that matches the current page on Init', () => {
    const model = run()

    expect(model.selectedIndex).toBe(1)
    expect(model.padSettingList[model.selectedIndex]).toBe(docsRule)
    // A page that already has a rule starts with the match list collapsed
    expect(model.matchesCollapsed).toBe(true)
  })

  it('changes the width of the selected rule only', () => {
    const model = run({ _tag: 'SetPadWidth', sideType: 'left', width: 240 })

    expect(model.padSettingList[1]!.side).toEqual({ _tag: 'Left', width: 240 })
    expect(model.padSettingList[0]).toBe(blogRule)
  })

  it('adds a new rule on top, selects it and turns on the ruler', () => {
    const model = run({ _tag: 'AddPadSetting' })

    expect(model.padSettingList).toHaveLength(3)
    expect(model.selectedIndex).toBe(0)
    expect(model.globalSetting.showRuler).toBe(true)
    expect(model.matchesCollapsed).toBe(false)
  })

  it('deletes a rule and reselects the one matching the page', () => {
    const model = run({ _tag: 'DeletePadSetting', index: 0 })

    expect(model.padSettingList).toEqual([docsRule])
    expect(model.selectedIndex).toBe(0)
  })

  it('keeps the popup font size between 12 and 32 px', () => {
    expect(
      run({ _tag: 'SetFontSize', fontSize: 99 }).globalSetting.fontSize,
    ).toBe(32)
    expect(
      run({ _tag: 'SetFontSize', fontSize: 4 }).globalSetting.fontSize,
    ).toBe(12)
    expect(
      run({ _tag: 'SetFontSize', fontSize: 20 }).globalSetting.fontSize,
    ).toBe(20)
  })

  it('toggles the ruler, the match list and the extension', () => {
    const model = run(
      { _tag: 'ToggleShowRuler' },
      { _tag: 'ToggleMatchesCollapsed' },
      { _tag: 'ToggleGlobalEnabled' },
    )

    expect(model.globalSetting.showRuler).toBe(true)
    expect(model.matchesCollapsed).toBe(false)
    expect(model.globalSetting.enabled).toBe(false)
  })
})
