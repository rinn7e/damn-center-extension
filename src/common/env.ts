/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const UI_THEME_ID: string =
  (import.meta as { env?: { VITE_UI_THEME_ID?: string } }).env
    ?.VITE_UI_THEME_ID ?? 'neon'
