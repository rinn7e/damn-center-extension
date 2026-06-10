/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-only
 */

export const formatDateTime = (date: Date): string => {
  return [
    date.toLocaleDateString('en-IE', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
    date.toLocaleTimeString('en-IE', {
      hour: 'numeric',
      minute: 'numeric',
    }),
  ].join(' ')
}
