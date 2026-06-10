/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-only
 */
import * as t from 'io-ts'

export type Hostname = string & { readonly __brand: unique symbol }

export const HostnameCodec = new t.Type<Hostname, string, unknown>(
  'Hostname',
  (u): u is Hostname => typeof u === 'string',
  (u, c) =>
    typeof u === 'string' ? t.success(u as Hostname) : t.failure(u, c),
  (a) => a,
)
