/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-only
 */

export const UI_THEME_ID: string =
  (import.meta as { env?: { VITE_UI_THEME_ID?: string } }).env
    ?.VITE_UI_THEME_ID ?? 'solarizedLight'

export const BUILD_DATE: string | undefined = import.meta.env.VITE_BUILD_DATE

export const SHOW_BUILD_DATE: boolean =
  import.meta.env.VITE_SHOW_BUILD_DATE === 'true'

export const DEFAULT_FONT_SIZE: number =
  Number(import.meta.env.VITE_DEFAULT_FONT_SIZE) || 16
