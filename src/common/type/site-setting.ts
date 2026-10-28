/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-only
 */
import type { NonEmptyArray } from 'fp-ts/NonEmptyArray'
import * as t from 'io-ts'
import { nonEmptyArray } from 'io-ts-types'

import { type Monitor, MonitorCodec, isSameMonitor } from './monitor'
import {
  type DomainSetting,
  type PaddingSetting,
  PaddingSettingCodec,
  type PathSetting,
  PathSettingCodec,
} from './pad-setting'

// The rules of a site on one monitor. A monitor without rules has no entry,
// so the list is never empty.
export type MonitorRules = {
  monitor: Monitor
  rules: NonEmptyArray<PathSetting>
}

export const MonitorRulesCodec: t.Type<MonitorRules, unknown, unknown> = t.type(
  {
    monitor: MonitorCodec,
    rules: nonEmptyArray(PathSettingCodec),
  },
)

const hasNoDuplicateMonitor = (monitors: MonitorRules[]): boolean =>
  monitors.every((entry, index) =>
    monitors
      .slice(index + 1)
      .every((other) => !isSameMonitor(entry.monitor, other.monitor)),
  )

const MonitorRulesListCodec = new t.Type<MonitorRules[], unknown, unknown>(
  'MonitorRulesList',
  (input): input is MonitorRules[] =>
    t.array(MonitorRulesCodec).is(input) && hasNoDuplicateMonitor(input),
  (input, context) => {
    const decoded = t.array(MonitorRulesCodec).validate(input, context)
    return decoded._tag === 'Right' && !hasNoDuplicateMonitor(decoded.right)
      ? t.failure(input, context, 'The same monitor is listed twice')
      : decoded
  },
  (output) => output,
)

// Everything stored for one site, under its hostname key
export type SiteSetting = {
  _tag: 'SiteSetting'
  // The site toggle: off turns off the rules of the site on every monitor
  enabled: boolean
  updatedAt?: number
  // The rules of each monitor, told apart by screen size
  monitors: MonitorRules[]
}

const SiteSettingV2Codec: t.Type<SiteSetting, unknown, unknown> =
  t.intersection([
    t.type({
      _tag: t.literal('SiteSetting'),
      enabled: t.boolean,
      monitors: MonitorRulesListCodec,
    }),
    t.partial({
      updatedAt: t.number,
    }),
  ])

export const defaultSiteSetting: SiteSetting = {
  _tag: 'SiteSetting',
  enabled: true,
  monitors: [],
}

/**
 * Converts a site value stored by schema version 1, a list mixing the site
 * toggle (DomainSetting) with the rules (PathSetting), to a SiteSetting.
 * Version 1 had one list for every screen; it becomes the list of `monitor`.
 */
export const migrateSiteSettingV1 = (
  list: PaddingSetting[],
  monitor: Monitor,
): SiteSetting => {
  const domainSetting = list.find(
    (item): item is DomainSetting => item._tag === 'DomainSetting',
  )
  const [first, ...rest] = list.filter(
    (item): item is PathSetting => item._tag === 'PathSetting',
  )
  return {
    _tag: 'SiteSetting',
    enabled: domainSetting?.enabled ?? true,
    ...(domainSetting?.updatedAt !== undefined
      ? { updatedAt: domainSetting.updatedAt }
      : {}),
    monitors: first === undefined ? [] : [{ monitor, rules: [first, ...rest] }],
  }
}

/**
 * Decodes a stored site value of either schema version. A version 1 list
 * becomes the rules of `monitor`: pages pass their own monitor, so old
 * settings keep applying on every screen until the popup migrates them.
 */
export const decodeStoredSiteSetting = (
  raw: unknown,
  monitor: Monitor,
): t.Validation<SiteSetting> => {
  if (Array.isArray(raw)) {
    const v1 = t.array(PaddingSettingCodec).decode(raw)
    return v1._tag === 'Right'
      ? t.success(migrateSiteSettingV1(v1.right, monitor))
      : t.failures(v1.left)
  } else {
    return SiteSettingV2Codec.decode(raw)
  }
}

/** True for a stored site value of either schema version. */
export const isStoredSiteSetting = (raw: unknown): boolean =>
  // The monitor only says where version 1 rules go, not whether they decode
  decodeStoredSiteSetting(raw, { width: 0, height: 0 })._tag === 'Right'

// Reading and changing the rules of one monitor
// -------------------------------------------------------------

/** The rules of a site on a monitor; none when it has no entry. */
export const rulesFor = (site: SiteSetting, monitor: Monitor): PathSetting[] =>
  site.monitors.find((entry) => isSameMonitor(entry.monitor, monitor))?.rules ??
  []

/**
 * Replaces the rules of a site on a monitor. An empty list removes the
 * monitor's entry.
 */
export const setRulesFor = (
  site: SiteSetting,
  monitor: Monitor,
  rules: PathSetting[],
): SiteSetting => {
  const others = site.monitors.filter(
    (entry) => !isSameMonitor(entry.monitor, monitor),
  )
  const [first, ...rest] = rules
  const index = site.monitors.findIndex((entry) =>
    isSameMonitor(entry.monitor, monitor),
  )
  if (first === undefined) {
    return { ...site, monitors: others }
  } else {
    // Keep the monitor where it was in the list
    const entry: MonitorRules = { monitor, rules: [first, ...rest] }
    const monitors = [...others]
    monitors.splice(index === -1 ? others.length : index, 0, entry)
    return { ...site, monitors }
  }
}

/** The other monitors that have rules for the site, to copy them from. */
export const otherMonitorRules = (
  site: SiteSetting,
  monitor: Monitor,
): MonitorRules[] =>
  site.monitors.filter((entry) => !isSameMonitor(entry.monitor, monitor))
