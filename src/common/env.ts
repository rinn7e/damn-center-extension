/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const UI_THEME_ID: string =
  (import.meta as { env?: { VITE_UI_THEME_ID?: string } }).env
    ?.VITE_UI_THEME_ID ?? 'neon'

export const IS_DEV: boolean = import.meta.env.DEV

export const DISABLE_LOG: boolean = import.meta.env.VITE_DISABLE_LOG === 'true'

export const BUILD_DATE: string | undefined = import.meta.env.VITE_BUILD_DATE

export const SHOW_BUILD_DATE: boolean =
  import.meta.env.VITE_SHOW_BUILD_DATE === 'true'
