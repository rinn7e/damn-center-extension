/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-only
 */
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  CURRENT_SCHEMA_VERSION,
  defaultGlobalSetting,
} from '../src/common/type/global-setting'
import { type Hostname } from '../src/common/type/hostname'
import {
  type Monitor,
  getCurrentMonitor,
  isSameMonitor,
} from '../src/common/type/monitor'
import {
  type PathSetting,
  createDefaultPathSetting,
} from '../src/common/type/pad-setting'
import {
  type SiteSetting,
  decodeStoredSiteSetting,
  otherMonitorRules,
  rulesFor,
  setRulesFor,
} from '../src/common/type/site-setting'
import {
  MIGRATION_STEPS,
  type MigrationStep,
  loadSiteSetting,
  migrateStoredData,
} from '../src/storage/storage'
import { type Model, type Msg } from '../src/type'
import {
  activeRules,
  loadInitialDataCmd,
  update,
  validateBackupData,
} from '../src/update'

// Rules per monitor: which rules apply on which screen, what the popup
// saves, and how settings saved by schema version 1 are read and migrated

const HOST = 'example.org'

const ultrawide: Monitor = { width: 3440, height: 1440 }
const laptop: Monitor = { width: 1366, height: 768 }

const oldRule: PathSetting = {
  ...createDefaultPathSetting(`https://${HOST}/**`),
  side: { _tag: 'Left', width: 120 },
}
const wideRule: PathSetting = {
  ...oldRule,
  side: { _tag: 'Left', width: 400 },
}
const laptopRule: PathSetting = {
  ...oldRule,
  side: { _tag: 'Left', width: 40 },
}

const siteWith = (...monitors: SiteSetting['monitors']): SiteSetting => ({
  _tag: 'SiteSetting',
  enabled: true,
  monitors,
})

const twoMonitors = siteWith(
  { monitor: ultrawide, rules: [wideRule] },
  { monitor: laptop, rules: [laptopRule] },
)

// What version 1 stored for a site: the site toggle and the rules in one list
const v1Site = [
  { _tag: 'DomainSetting', enabled: false, updatedAt: 5 },
  oldRule,
]

// Version 1 settings once they belong to the ultrawide monitor
const v1SiteOnUltrawide: SiteSetting = {
  _tag: 'SiteSetting',
  enabled: false,
  updatedAt: 5,
  monitors: [{ monitor: ultrawide, rules: [oldRule] }],
}

const setProperty = (target: object, key: string, value: unknown) =>
  Object.defineProperty(target, key, { value, configurable: true })

describe('the monitor id', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('is the screen size in Chrome, whatever the page zoom', () => {
    setProperty(window.screen, 'width', 2560)
    setProperty(window.screen, 'height', 1440)
    setProperty(window, 'devicePixelRatio', 1.5)

    expect(getCurrentMonitor()).toEqual({ width: 2560, height: 1440 })
  })

  it('does not change with page zoom in Firefox', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (Macintosh; rv:140.0) Gecko/20100101 Firefox/140.0',
    )
    // Firefox reports CSS pixels: a 5120x2880 screen at a 2x display scale,
    // then the same screen with the page zoomed to 150% (3x)
    setProperty(window.screen, 'width', 2560)
    setProperty(window.screen, 'height', 1440)
    setProperty(window, 'devicePixelRatio', 2)
    const atNormalZoom = getCurrentMonitor()
    setProperty(window.screen, 'width', 1707)
    setProperty(window.screen, 'height', 960)
    setProperty(window, 'devicePixelRatio', 3)
    const zoomedIn = getCurrentMonitor()

    expect(atNormalZoom).toEqual({ width: 5120, height: 2880 })
    expect(isSameMonitor(atNormalZoom, zoomedIn)).toBe(true)
  })

  it('still matches at the highest Firefox zoom', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (Macintosh; rv:140.0) Gecko/20100101 Firefox/140.0',
    )
    // A 3456x2234 Retina screen at 500% zoom (ratio 10): 2234 / 10 = 223.4
    // is reported as 223, which scales back to 2230
    setProperty(window.screen, 'width', 346)
    setProperty(window.screen, 'height', 223)
    setProperty(window, 'devicePixelRatio', 10)

    expect(
      isSameMonitor(getCurrentMonitor(), { width: 3456, height: 2234 }),
    ).toBe(true)
  })

  it('tells monitors of different sizes apart', () => {
    expect(isSameMonitor(ultrawide, { width: 3442, height: 1439 })).toBe(true)
    expect(isSameMonitor(ultrawide, laptop)).toBe(false)
    expect(isSameMonitor(ultrawide, { width: 3440, height: 1600 })).toBe(false)
  })
})

describe('choosing the rules for a screen size', () => {
  it('uses the rules of the monitor the page is on', () => {
    expect(rulesFor(twoMonitors, ultrawide)).toEqual([wideRule])
    expect(rulesFor(twoMonitors, laptop)).toEqual([laptopRule])
  })

  it('has no rules on a monitor without any', () => {
    expect(rulesFor(twoMonitors, { width: 1920, height: 1080 })).toEqual([])
  })

  it('changes the rules of one monitor only', () => {
    expect(setRulesFor(twoMonitors, laptop, [oldRule]).monitors).toEqual([
      { monitor: ultrawide, rules: [wideRule] },
      { monitor: laptop, rules: [oldRule] },
    ])
  })

  it('adds a monitor with its first rule and drops it with its last', () => {
    const desk = { width: 1920, height: 1080 }
    const added = setRulesFor(twoMonitors, desk, [oldRule])

    expect(rulesFor(added, desk)).toEqual([oldRule])
    expect(setRulesFor(added, desk, [])).toEqual(twoMonitors)
  })

  it('lists the other monitors to copy from', () => {
    expect(otherMonitorRules(twoMonitors, laptop)).toEqual([
      { monitor: ultrawide, rules: [wideRule] },
    ])
  })
})

describe('stored site settings', () => {
  it('reads settings saved by the current version (schema 1) as the rules of the given monitor', () => {
    expect(decodeStoredSiteSetting(v1Site, ultrawide)).toEqual({
      _tag: 'Right',
      right: v1SiteOnUltrawide,
    })
  })

  it('reads a version 1 list without a site toggle as switched on', () => {
    const decoded = decodeStoredSiteSetting([oldRule], ultrawide)

    expect(decoded._tag === 'Right' && decoded.right.enabled).toBe(true)
  })

  it('reads a version 1 list without rules as no monitors', () => {
    const decoded = decodeStoredSiteSetting(
      [{ _tag: 'DomainSetting', enabled: true }],
      ultrawide,
    )

    expect(decoded._tag === 'Right' && decoded.right.monitors).toEqual([])
  })

  it('reads schema 2 settings as they are', () => {
    expect(decodeStoredSiteSetting(twoMonitors, ultrawide)).toEqual({
      _tag: 'Right',
      right: twoMonitors,
    })
  })

  it('rejects a monitor without rules', () => {
    const decoded = decodeStoredSiteSetting(
      siteWith({ monitor: ultrawide, rules: [] } as never),
      ultrawide,
    )

    expect(decoded._tag).toBe('Left')
  })

  it('rejects the same monitor listed twice', () => {
    const decoded = decodeStoredSiteSetting(
      siteWith(
        { monitor: ultrawide, rules: [oldRule] },
        { monitor: ultrawide, rules: [wideRule] },
      ),
      ultrawide,
    )

    expect(decoded._tag).toBe('Left')
  })

  it('accepts backups of either schema version', () => {
    expect(
      validateBackupData({
        global_settings: { ...defaultGlobalSetting, schema_version: 1 },
        [HOST]: v1Site,
      }),
    ).toBe(true)
    expect(validateBackupData({ [HOST]: twoMonitors })).toBe(true)
    expect(validateBackupData({ [HOST]: { _tag: 'SiteSetting' } })).toBe(false)
  })
})

describe('migrating stored data to schema 2', () => {
  it('moves every version 1 site to the given monitor', () => {
    const writes = migrateStoredData(
      {
        global_settings: { ...defaultGlobalSetting, schema_version: 1 },
        [HOST]: v1Site,
        'other.org': [oldRule],
      },
      ultrawide,
    )

    expect(writes).toEqual({
      set: {
        global_settings: { ...defaultGlobalSetting, schema_version: 2 },
        [HOST]: v1SiteOnUltrawide,
        'other.org': siteWith({ monitor: ultrawide, rules: [oldRule] }),
      },
      remove: [],
    })
  })

  it('also runs when version 1 never saved the global settings', () => {
    const writes = migrateStoredData({ [HOST]: [oldRule] }, ultrawide)

    expect(writes?.set[HOST]).toEqual(
      siteWith({ monitor: ultrawide, rules: [oldRule] }),
    )
    expect(writes?.set.global_settings).toEqual(defaultGlobalSetting)
  })

  it('keeps the global settings the user chose', () => {
    const writes = migrateStoredData(
      {
        global_settings: {
          ...defaultGlobalSetting,
          schema_version: 1,
          showRuler: true,
        },
      },
      ultrawide,
    )

    expect(writes?.set.global_settings).toEqual({
      ...defaultGlobalSetting,
      showRuler: true,
    })
  })

  it('keeps migrated data importable', () => {
    const writes = migrateStoredData({ [HOST]: v1Site }, ultrawide)

    expect(writes && validateBackupData(writes.set)).toBe(true)
  })

  it('has one step for every schema version up to the current one', () => {
    expect(MIGRATION_STEPS.map((step) => step.to)).toEqual(
      Array.from({ length: CURRENT_SCHEMA_VERSION - 1 }, (_, i) => i + 2),
    )
  })

  it('does nothing once the data is at schema 2', () => {
    expect(
      migrateStoredData(
        { global_settings: defaultGlobalSetting, [HOST]: twoMonitors },
        ultrawide,
      ),
    ).toBeNull()
  })

  it('leaves data of a newer schema alone, even when it does not decode', () => {
    expect(
      migrateStoredData(
        {
          // A future global setting this version cannot decode
          global_settings: { schema_version: 3, theme: 'auto' },
          [HOST]: v1Site,
        },
        ultrawide,
      ),
    ).toBeNull()
  })
})

describe('running migration steps', () => {
  // Made-up future steps, to check the runner on its own: 3 renames the
  // tag of every SiteSetting, 4 removes a key
  const toV3: MigrationStep = {
    to: 3,
    migrate: (stored) =>
      Object.fromEntries(
        Object.entries(stored).map(([key, value]) => [
          key,
          typeof value === 'object' &&
          value !== null &&
          (value as { _tag?: string })._tag === 'SiteSetting'
            ? { ...value, _tag: 'SiteSettingV3' }
            : value,
        ]),
      ),
  }
  const toV4: MigrationStep = {
    to: 4,
    migrate: ({ 'other.org': _removed, ...rest }) => rest,
  }
  const steps = [...MIGRATION_STEPS, toV3, toV4]

  it('runs every step after the stored version, in order, in one write', () => {
    const writes = migrateStoredData(
      {
        global_settings: { ...defaultGlobalSetting, schema_version: 1 },
        [HOST]: v1Site,
        'other.org': [oldRule],
      },
      ultrawide,
      steps,
    )

    expect(writes).toEqual({
      set: {
        global_settings: { ...defaultGlobalSetting, schema_version: 4 },
        [HOST]: { ...v1SiteOnUltrawide, _tag: 'SiteSettingV3' },
      },
      remove: ['other.org'],
    })
  })

  it('runs only the steps after the stored version', () => {
    const writes = migrateStoredData(
      {
        global_settings: { ...defaultGlobalSetting, schema_version: 3 },
        [HOST]: { ...twoMonitors, _tag: 'SiteSettingV3' },
        'other.org': twoMonitors,
      },
      ultrawide,
      steps,
    )

    // Step 3 would rename the tag of other.org; only step 4 runs
    expect(writes).toEqual({
      set: { global_settings: { ...defaultGlobalSetting, schema_version: 4 } },
      remove: ['other.org'],
    })
  })

  it('fails instead of resetting global settings a step broke', () => {
    // A buggy future step that drops a required field
    const breaksGlobal: MigrationStep = {
      to: 3,
      migrate: (stored) => ({
        ...stored,
        global_settings: { fontSize: 20 },
      }),
    }

    expect(() =>
      migrateStoredData({ global_settings: defaultGlobalSetting }, ultrawide, [
        ...MIGRATION_STEPS,
        breaksGlobal,
      ]),
    ).toThrow('The global settings do not match format 3 after the migration')
  })

  it('rewrites only the values a step changed', () => {
    const writes = migrateStoredData(
      {
        global_settings: { ...defaultGlobalSetting, schema_version: 2 },
        [HOST]: twoMonitors,
        'plain.org': 'not a site value',
      },
      ultrawide,
      steps,
    )

    expect(Object.keys(writes?.set ?? {}).sort()).toEqual([
      HOST,
      'global_settings',
    ])
  })
})

describe('the popup', () => {
  let stored: Record<string, unknown>
  // What the active tab's content script answers when asked for its monitor
  let tabMonitor: Monitor | undefined
  // The rules the popup applied to the tab, last first
  let sentSettings: PathSetting[]

  beforeEach(() => {
    stored = { global_settings: defaultGlobalSetting }
    tabMonitor = ultrawide
    sentSettings = []
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false, addEventListener: vi.fn() })),
    )
    vi.stubGlobal('chrome', {
      runtime: {},
      tabs: {
        query: (_query: object, callback: (tabs: object[]) => void) =>
          callback([{ id: 1, url: `https://${HOST}/page` }]),
        sendMessage: (
          _tabId: number,
          message: { type: string; settings?: PathSetting },
          callback?: (response?: unknown) => void,
        ) => {
          if (message.settings) sentSettings.unshift(message.settings)
          callback?.(message.type === 'GET_MONITOR' ? tabMonitor : undefined)
        },
      },
      storage: {
        local: {
          get: (keys: string[] | null, callback: (res: object) => void) =>
            setTimeout(
              () =>
                callback(
                  structuredClone(
                    keys === null
                      ? stored
                      : Object.fromEntries(
                          keys
                            .filter((key) => key in stored)
                            .map((key) => [key, stored[key]]),
                        ),
                  ),
                ),
              0,
            ),
          set: (items: Record<string, unknown>, callback?: () => void) => {
            Object.assign(stored, structuredClone(items))
            callback?.()
          },
        },
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
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

  it('edits the monitor of the active tab', async () => {
    stored[HOST] = twoMonitors

    const model = await run(await openPopup())

    expect(model.monitor).toEqual(ultrawide)
    expect(activeRules(model)).toEqual([wideRule])
  })

  it('uses its own screen when the tab does not answer', async () => {
    tabMonitor = undefined
    setProperty(window.screen, 'width', 1366)
    setProperty(window.screen, 'height', 768)

    const model = await run(await openPopup())

    expect(model.monitor).toEqual(laptop)
  })

  describe('with version 1 settings', () => {
    beforeEach(() => {
      stored = {
        global_settings: { ...defaultGlobalSetting, schema_version: 1 },
        [HOST]: v1Site,
      }
    })

    it('asks before migrating, and changes nothing until then', async () => {
      const init = await openPopup()
      const before = structuredClone(stored)

      expect(init.migration).toEqual({ _tag: 'Needed', fromVersion: 1 })
      const model = await run(init, {
        _tag: 'SetPadWidth',
        sideType: 'left',
        width: 200,
      })

      expect(activeRules(model)).toEqual([oldRule])
      expect(stored).toEqual(before)
    })

    it('migrates to the monitor of the tab once the user clicks OK', async () => {
      const init = await openPopup()
      const model = update(init, null)[0]
      if (model === null) throw new Error('model is null')
      const dispatched: Msg[] = []

      const [running, cmd] = update({ _tag: 'RunMigration' }, model)
      cmd.execute((msg) => dispatched.push(msg))
      await vi.waitFor(() => expect(dispatched).toHaveLength(1))

      expect(running?.migration).toEqual({ _tag: 'Running', fromVersion: 1 })
      expect(dispatched).toEqual([{ _tag: 'MigrationDone' }])
      expect(stored).toEqual({
        global_settings: { ...defaultGlobalSetting, schema_version: 2 },
        [HOST]: v1SiteOnUltrawide,
      })
      // Opening again finds nothing to migrate
      expect((await openPopup()).migration).toEqual({ _tag: 'UpToDate' })
    })

    it('shows why the migration failed, and writes nothing', async () => {
      const init = await openPopup()
      const model = update(init, null)[0]
      if (model === null) throw new Error('model is null')
      const before = structuredClone(stored)
      const local = (
        globalThis as unknown as {
          chrome: {
            runtime: { lastError?: { message: string } }
            storage: { local: { set: unknown } }
          }
        }
      ).chrome
      local.storage.local.set = (_items: unknown, callback: () => void) => {
        local.runtime.lastError = { message: 'QUOTA_BYTES quota exceeded' }
        callback()
        local.runtime.lastError = undefined
      }
      const dispatched: Msg[] = []

      const [running, cmd] = update({ _tag: 'RunMigration' }, model)
      if (running === null) throw new Error('model is null')
      cmd.execute((msg) => dispatched.push(msg))
      await vi.waitFor(() => expect(dispatched).toHaveLength(1))

      expect(dispatched).toEqual([
        { _tag: 'MigrationFailed', error: 'QUOTA_BYTES quota exceeded' },
      ])
      expect(update(dispatched[0]!, running)[0]?.migration).toEqual({
        _tag: 'Failed',
        fromVersion: 1,
        error: 'QUOTA_BYTES quota exceeded',
      })
      expect(stored).toEqual(before)
    })
  })

  it('asks even when only the global settings are in an old format', async () => {
    stored = { global_settings: { ...defaultGlobalSetting, schema_version: 1 } }

    expect((await openPopup()).migration).toEqual({
      _tag: 'Needed',
      fromVersion: 1,
    })
  })

  it('keeps the stored format when trying again after a failure', () => {
    const model = update(
      {
        _tag: 'Init',
        hostname: HOST as Hostname,
        currentUrl: `https://${HOST}/page`,
        globalSetting: defaultGlobalSetting,
        site: twoMonitors,
        monitor: ultrawide,
        migration: { _tag: 'Running', fromVersion: 1 },
      },
      null,
    )[0]
    if (model === null) throw new Error('model is null')

    const failed = update({ _tag: 'MigrationFailed', error: 'nope' }, model)[0]
    const again = failed && update({ _tag: 'RunMigration' }, failed)[0]

    expect(failed?.migration).toEqual({
      _tag: 'Failed',
      fromVersion: 1,
      error: 'nope',
    })
    expect(again?.migration).toEqual({ _tag: 'Running', fromVersion: 1 })
  })

  it('shows a failed read on open, and migrates when tried again', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    stored = {
      global_settings: { ...defaultGlobalSetting, schema_version: 1 },
      [HOST]: v1Site,
    }
    const local = (
      globalThis as unknown as {
        chrome: {
          runtime: { lastError?: { message: string } }
          storage: {
            local: {
              get: (keys: unknown, callback: (res?: object) => void) => void
            }
          }
        }
      }
    ).chrome
    const get = local.storage.local.get
    // The first full read (the check on open) fails
    let failNext = true
    local.storage.local.get = (keys, callback) => {
      if (keys === null && failNext) {
        failNext = false
        local.runtime.lastError = { message: 'Storage read failed' }
        callback(undefined)
        local.runtime.lastError = undefined
      } else {
        get(keys, callback)
      }
    }

    const init = await openPopup()
    expect(init.migration).toEqual({
      _tag: 'Failed',
      fromVersion: null,
      error: 'Storage read failed',
    })
    const model = update(init, null)[0]
    if (model === null) throw new Error('model is null')
    // Nothing is edited while the prompt shows the failure
    expect(update({ _tag: 'ToggleShowRuler' }, model)[0]).toBe(model)

    const dispatched: Msg[] = []
    update({ _tag: 'RunMigration' }, model)[1].execute((msg) =>
      dispatched.push(msg),
    )
    await vi.waitFor(() => expect(dispatched).toHaveLength(1))

    expect(dispatched).toEqual([{ _tag: 'MigrationDone' }])
    expect(stored[HOST]).toEqual(v1SiteOnUltrawide)
  })

  it('updates the version of a fresh install without asking', async () => {
    stored = {}

    const init = await openPopup()

    expect(init.migration).toEqual({ _tag: 'UpToDate' })
    expect(stored).toEqual({ global_settings: defaultGlobalSetting })
  })

  it('says so instead of downloading an empty file when the read fails', async () => {
    const alert = vi.fn()
    vi.stubGlobal('alert', alert)
    const model = update(await openPopup(), null)[0]
    if (model === null) throw new Error('model is null')
    const local = (
      globalThis as unknown as {
        chrome: {
          runtime: { lastError?: { message: string } }
          storage: {
            local: {
              get: (keys: unknown, callback: (res?: object) => void) => void
            }
          }
        }
      }
    ).chrome
    local.storage.local.get = (_keys, callback) => {
      local.runtime.lastError = { message: 'Storage read failed' }
      callback(undefined)
      local.runtime.lastError = undefined
    }
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click')

    update({ _tag: 'ExportConfig' }, model)[1].execute(() => undefined)
    await vi.waitFor(() => expect(alert).toHaveBeenCalled())

    expect(alert).toHaveBeenCalledWith(
      'Could not read your settings to download them: Storage read failed',
    )
    expect(click).not.toHaveBeenCalled()
  })

  it('asks to update the extension when a newer one saved the settings', async () => {
    stored = {
      global_settings: { ...defaultGlobalSetting, schema_version: 3 },
      [HOST]: twoMonitors,
    }
    const before = structuredClone(stored)

    const init = await openPopup()
    const model = await run(
      init,
      { _tag: 'SetPadWidth', sideType: 'left', width: 200 },
      { _tag: 'ToggleShowRuler' },
      { _tag: 'AddPadSetting' },
      // There is nothing to migrate down to this format
      { _tag: 'RunMigration' },
    )

    expect(init.migration).toEqual({ _tag: 'Newer', storedVersion: 3 })
    expect(model.migration).toEqual({ _tag: 'Newer', storedVersion: 3 })
    expect(activeRules(model)).toEqual([wideRule])
    expect(stored).toEqual(before)
  })

  it('saves edits to the rules of this monitor only', async () => {
    stored[HOST] = twoMonitors

    await run(await openPopup(), {
      _tag: 'SetPadWidth',
      sideType: 'left',
      width: 200,
    })

    expect(stored[HOST]).toEqual(
      siteWith(
        {
          monitor: ultrawide,
          rules: [
            expect.objectContaining({ side: { _tag: 'Left', width: 200 } }),
          ],
        },
        { monitor: laptop, rules: [laptopRule] },
      ),
    )
  })

  it('starts empty on a new monitor and copies the rules of another', async () => {
    tabMonitor = { width: 1920, height: 1080 }
    stored[HOST] = twoMonitors

    const init = await openPopup()
    const opened = await run(init)
    expect(activeRules(opened)).toEqual([])

    const model = await run(
      init,
      { _tag: 'ToggleCopyMonitorList' },
      { _tag: 'ViewMonitor', monitor: laptop },
      { _tag: 'CopyAllRules', mode: 'Replace' },
    )

    expect(activeRules(model)).toEqual([laptopRule])
    expect((stored[HOST] as SiteSetting).monitors).toEqual([
      { monitor: ultrawide, rules: [wideRule] },
      { monitor: laptop, rules: [laptopRule] },
      { monitor: { width: 1920, height: 1080 }, rules: [laptopRule] },
    ])
  })

  it('applies the rules of its own monitor to the tab while showing another', async () => {
    tabMonitor = laptop
    stored[HOST] = siteWith(
      { monitor: ultrawide, rules: [wideRule] },
      { monitor: laptop, rules: [{ ...laptopRule, matchPattern: '**' }] },
    )

    await run(
      await openPopup(),
      { _tag: 'ViewMonitor', monitor: ultrawide },
      { _tag: 'CopyRuleToCurrentMonitor', index: 0 },
    )

    // The tab keeps the first matching rule of the laptop list
    expect(sentSettings[0]).toEqual(
      expect.objectContaining({ side: { _tag: 'Left', width: 40 } }),
    )
    expect((stored[HOST] as SiteSetting).monitors[1]!.rules).toEqual([
      { ...laptopRule, matchPattern: '**' },
      wideRule,
    ])
  })

  it('stops waiting for a tab that does not answer', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] })
    try {
      const chromeStub = (globalThis as unknown as { chrome: { tabs: object } })
        .chrome
      // A busy page never calls back
      chromeStub.tabs = { ...chromeStub.tabs, sendMessage: () => undefined }
      setProperty(window.screen, 'width', 1366)
      setProperty(window.screen, 'height', 768)

      const dispatched: Msg[] = []
      loadInitialDataCmd().execute((msg) => dispatched.push(msg))
      await vi.advanceTimersByTimeAsync(300)
      await vi.runAllTimersAsync()

      expect(dispatched[0]).toEqual(
        expect.objectContaining({ _tag: 'Init', monitor: laptop }),
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps the site toggle shared by all monitors', async () => {
    stored[HOST] = twoMonitors

    await run(await openPopup(), { _tag: 'ToggleDomainEnabled' })

    expect(stored[HOST]).toEqual(
      expect.objectContaining({
        enabled: false,
        monitors: twoMonitors.monitors,
      }),
    )
  })
})

describe('loading a site', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('falls back to no rules when the stored value is broken', async () => {
    vi.stubGlobal('chrome', {
      runtime: {},
      storage: {
        local: {
          get: (_keys: string[], callback: (res: object) => void) =>
            setTimeout(() => callback({ [HOST]: { _tag: 'oops' } }), 0),
        },
      },
    })

    const result = await loadSiteSetting(HOST as Hostname, ultrawide)()

    expect(result).toEqual({ _tag: 'Right', right: siteWith() })
  })
})
