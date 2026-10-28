/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-only
 */
import { describe, expect, it } from 'vitest'

import { defaultGlobalSetting } from '../src/common/type/global-setting'
import { type Hostname } from '../src/common/type/hostname'
import { type Monitor } from '../src/common/type/monitor'
import {
  type PathSetting,
  createDefaultPathSetting,
} from '../src/common/type/pad-setting'
import { type SiteSetting } from '../src/common/type/site-setting'
import { type Model, type Msg } from '../src/type'
import {
  activeRules,
  isViewingOtherMonitor,
  update,
  viewedRules,
} from '../src/update'

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
  site: {
    _tag: 'SiteSetting',
    enabled: true,
    monitors: [
      { monitor: { width: 1920, height: 1080 }, rules: [blogRule, docsRule] },
    ],
  },
  monitor: { width: 1920, height: 1080 },
  migration: { _tag: 'UpToDate' },
}

// Runs messages through update() starting from Init, returning the model
const run = (...msgs: Msg[]): Model => runFrom(initMsg, ...msgs)

const runFrom = (
  init: Extract<Msg, { _tag: 'Init' }>,
  ...msgs: Msg[]
): Model => {
  let model = update(init, null)[0]
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
    expect(activeRules(model)[model.selectedIndex]).toBe(docsRule)
    // A page that already has a rule starts with the match list collapsed
    expect(model.matchesCollapsed).toBe(true)
  })

  it('changes the width of the selected rule only', () => {
    const model = run({ _tag: 'SetPadWidth', sideType: 'left', width: 240 })

    expect(activeRules(model)[1]!.side).toEqual({ _tag: 'Left', width: 240 })
    expect(activeRules(model)[0]).toBe(blogRule)
  })

  it('adds a new rule on top, selects it and turns on the ruler', () => {
    const model = run({ _tag: 'AddPadSetting' })

    expect(activeRules(model)).toHaveLength(3)
    expect(model.selectedIndex).toBe(0)
    expect(model.globalSetting.showRuler).toBe(true)
    expect(model.matchesCollapsed).toBe(false)
  })

  it('deletes a rule and reselects the one matching the page', () => {
    const model = run({ _tag: 'DeletePadSetting', index: 0 })

    expect(activeRules(model)).toEqual([docsRule])
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

  describe('rules per monitor', () => {
    const desk: Monitor = { width: 1920, height: 1080 }
    const laptop: Monitor = { width: 1366, height: 768 }
    const laptopRule: PathSetting = { ...docsRule, matchPattern: '**' }
    const twoMonitors: SiteSetting = {
      ...initMsg.site,
      monitors: [
        { monitor: desk, rules: [blogRule, docsRule] },
        { monitor: laptop, rules: [laptopRule] },
      ],
    }

    it('edits the rules of the monitor the popup is on', () => {
      expect(activeRules(runFrom({ ...initMsg, site: twoMonitors }))).toEqual([
        blogRule,
        docsRule,
      ])
      expect(
        activeRules(
          runFrom({ ...initMsg, site: twoMonitors, monitor: laptop }),
        ),
      ).toEqual([laptopRule])
    })

    it('shows no rules on a monitor without any', () => {
      const model = runFrom({ ...initMsg, monitor: laptop })

      expect(activeRules(model)).toEqual([])
      // Nothing to collapse, so the empty state and the copy button show
      expect(model.matchesCollapsed).toBe(false)
    })

    it('changes only the rules of this monitor', () => {
      const model = runFrom(
        { ...initMsg, site: twoMonitors, monitor: laptop },
        { _tag: 'SetPadWidth', sideType: 'left', width: 240 },
      )

      expect(model.site.monitors).toEqual([
        { monitor: desk, rules: [blogRule, docsRule] },
        {
          monitor: laptop,
          rules: [
            expect.objectContaining({ side: { _tag: 'Left', width: 240 } }),
          ],
        },
      ])
    })

    it('copies all the rules of another monitor, replacing its own', () => {
      const model = runFrom(
        { ...initMsg, site: twoMonitors, monitor: laptop },
        { _tag: 'ViewMonitor', monitor: desk },
        { _tag: 'CopyAllRules', mode: 'Replace' },
      )

      expect(activeRules(model)).toEqual([blogRule, docsRule])
      // Back on this monitor, with the rule for the page selected
      expect(isViewingOtherMonitor(model)).toBe(false)
      expect(model.selectedIndex).toBe(1)
      expect(model.site.monitors).toEqual([
        { monitor: desk, rules: [blogRule, docsRule] },
        { monitor: laptop, rules: [blogRule, docsRule] },
      ])
    })

    it('copies only the rules this monitor is missing', () => {
      const model = runFrom(
        { ...initMsg, site: twoMonitors, monitor: laptop },
        { _tag: 'ViewMonitor', monitor: desk },
        { _tag: 'CopyAllRules', mode: 'AddMissing' },
      )

      // laptopRule matches '**', which desk does not have; both desk rules
      // are added after it, so the laptop rule keeps its priority
      expect(activeRules(model)).toEqual([laptopRule, blogRule, docsRule])
    })

    it('copies one rule, replacing the one with the same URL pattern', () => {
      const laptopDocs: PathSetting = {
        ...docsRule,
        side: { _tag: 'Left', width: 10 },
      }
      const model = runFrom(
        {
          ...initMsg,
          site: {
            ...twoMonitors,
            monitors: [
              { monitor: desk, rules: [blogRule, docsRule] },
              { monitor: laptop, rules: [laptopDocs] },
            ],
          },
          monitor: laptop,
        },
        { _tag: 'ViewMonitor', monitor: desk },
        { _tag: 'CopyRuleToCurrentMonitor', index: 1 },
        { _tag: 'CopyRuleToCurrentMonitor', index: 0 },
      )

      expect(activeRules(model)).toEqual([docsRule, blogRule])
      // Still showing the other monitor, to copy more
      expect(viewedRules(model)).toEqual([blogRule, docsRule])
    })

    it('shows another monitor read only', () => {
      const model = runFrom(
        { ...initMsg, site: twoMonitors, monitor: laptop },
        { _tag: 'ViewMonitor', monitor: desk },
        { _tag: 'SetPadWidth', sideType: 'left', width: 240 },
        { _tag: 'DeletePadSetting', index: 0 },
        { _tag: 'AddPadSetting' },
      )

      expect(viewedRules(model)).toEqual([blogRule, docsRule])
      expect(model.site).toEqual(twoMonitors)
    })

    it('drops the monitor once its last rule is deleted', () => {
      const model = runFrom(
        { ...initMsg, site: twoMonitors, monitor: laptop },
        { _tag: 'DeletePadSetting', index: 0 },
      )

      expect(model.site.monitors).toEqual([
        { monitor: desk, rules: [blogRule, docsRule] },
      ])
    })
  })
})
