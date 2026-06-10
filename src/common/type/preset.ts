/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-only
 */

export interface ColorPreset {
  name: string
  value: string
}

export interface PatternPreset {
  id: string
  name: string
  style: (bgColor: string) => Record<string, string>
}

export const lightColors: ColorPreset[] = [
  { name: 'Transparent', value: 'transparent' },
  { name: 'White', value: '#ffffff' },
  { name: 'Solarized Light', value: '#fdf6e3' },
  { name: 'Sepia', value: '#f4ecd8' },
  { name: 'Nordic Snow', value: '#e5e9f0' },
  { name: 'Soft Gray', value: '#f1f5f9' },
  { name: 'Cream', value: '#fafaf9' },
]

export const darkColors: ColorPreset[] = [
  { name: 'Transparent', value: 'transparent' },
  { name: 'Slate Dark', value: '#0f172a' },
  { name: 'Solarized Dark', value: '#002b36' },
  { name: 'Nord Frost', value: '#2e3440' },
  { name: 'Midnight', value: '#050505' },
  { name: 'Deep Purple', value: '#1e1b4b' },
  { name: 'Forest Green', value: '#062f21' },
]

export const patterns: PatternPreset[] = [
  {
    id: 'none',
    name: 'No Pattern',
    style: (bgColor: string) => ({
      backgroundColor: bgColor,
      backgroundImage: 'none',
    }),
  },
  {
    id: 'dots',
    name: 'Dotted Grid',
    style: (bgColor: string) => ({
      backgroundColor: bgColor,
      backgroundImage:
        'radial-gradient(rgba(128, 128, 128, 0.22) 1.5px, transparent 1.5px)',
      backgroundSize: '16px 16px',
    }),
  },
  {
    id: 'stripes',
    name: 'Diagonal Stripes',
    style: (bgColor: string) => ({
      backgroundColor: bgColor,
      backgroundImage:
        'repeating-linear-gradient(45deg, transparent, transparent 12px, rgba(128, 128, 128, 0.08) 12px, rgba(128, 128, 128, 0.08) 24px)',
      backgroundSize: '34px 34px',
    }),
  },
  {
    id: 'grid',
    name: 'Aesthetic Grid',
    style: (bgColor: string) => ({
      backgroundColor: bgColor,
      backgroundImage:
        'linear-gradient(rgba(128, 128, 128, 0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(128, 128, 128, 0.12) 1px, transparent 1px)',
      backgroundSize: '24px 24px',
    }),
  },

  {
    id: 'carbon',
    name: 'Carbon Fiber',
    style: (bgColor: string) => ({
      backgroundColor: bgColor,
      backgroundImage:
        'linear-gradient(45deg, rgba(128, 128, 128, 0.06) 25%, transparent 25%), linear-gradient(-45deg, rgba(128, 128, 128, 0.06) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(128, 128, 128, 0.06) 75%), linear-gradient(-45deg, transparent 75%, rgba(128, 128, 128, 0.06) 75%)',
      backgroundSize: '20px 20px',
    }),
  },
  {
    id: 'moroccan',
    name: 'Moroccan Lattice',
    style: (bgColor: string) => ({
      backgroundColor: bgColor,
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 20 L20 0 L40 20 L20 40 Z' fill='none' stroke='%23808080' stroke-width='1.5' stroke-opacity='0.12'/%3E%3C/svg%3E")`,
      backgroundSize: '40px 40px',
    }),
  },
]
