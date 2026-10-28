/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-only
 */
import * as t from 'io-ts'

// A monitor is told apart by its screen size, which needs no permission and
// works in every browser. Two monitors of the same size share their rules.
export type Monitor = {
  width: number
  height: number
}

export const MonitorCodec: t.Type<Monitor> = t.type({
  width: t.number,
  height: t.number,
})

/**
 * The size of the screen the page is on. Chrome and Safari report it in
 * pixels that don't change with page zoom. Firefox reports CSS pixels, which
 * do (a 2560x1440 screen reads 2133x1200 at 120%), so there it is scaled
 * back to device pixels, which don't.
 */
export const getCurrentMonitor = (): Monitor => {
  const scale = navigator.userAgent.includes('Firefox')
    ? window.devicePixelRatio || 1
    : 1
  return {
    width: Math.round(screen.width * scale),
    height: Math.round(screen.height * scale),
  }
}

// Firefox rounds the CSS screen size, so scaling it back can be off by up to
// half the pixel ratio: 7.5 pixels at its highest zoom (500%) on a 3x screen.
// Real monitor sizes differ by far more than that.
const MONITOR_SIZE_TOLERANCE = 8

export const isSameMonitor = (a: Monitor, b: Monitor): boolean =>
  Math.abs(a.width - b.width) <= MONITOR_SIZE_TOLERANCE &&
  Math.abs(a.height - b.height) <= MONITOR_SIZE_TOLERANCE

export const formatMonitor = (monitor: Monitor): string =>
  `${monitor.width}x${monitor.height}`
