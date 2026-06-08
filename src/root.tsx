/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import React from 'react'
import { createRoot } from 'react-dom/client'

import { AppProgram } from './program'

const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<AppProgram />)
}
