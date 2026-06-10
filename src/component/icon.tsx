/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-only
 */
import React from 'react'

interface IconProps {
  className?: string
}

export const SunIcon: React.FC<IconProps> = ({
  className = 'w-[14px] h-[14px]',
}) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2.5'
    className={className}
  >
    <circle cx='12' cy='12' r='4' />
    <path d='M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41' />
  </svg>
)

export const MoonIcon: React.FC<IconProps> = ({
  className = 'w-[14px] h-[14px]',
}) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2.5'
    className={className}
  >
    <path d='M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z' />
  </svg>
)

export const MonitorIcon: React.FC<IconProps> = ({
  className = 'w-[14px] h-[14px]',
}) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2.5'
    className={className}
  >
    <rect width='20' height='14' x='2' y='3' rx='2' />
    <path d='M12 17v4M8 21h8' />
  </svg>
)

export const PowerIcon: React.FC<IconProps> = ({
  className = 'w-[20px] h-[20px]',
}) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    className={className}
  >
    <path d='M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10' />
  </svg>
)

export const HeartIcon: React.FC<IconProps> = ({
  className = 'w-[12px] h-[12px] text-rose-500 inline-block align-middle',
}) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 24 24'
    fill='currentColor'
    className={className}
  >
    <path d='M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3c1.767 0 3.327.95 4.312 2.407C12.986 3.95 14.546 3 16.312 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z' />
  </svg>
)

export const ChevronUpIcon: React.FC<IconProps> = ({
  className = 'w-[12px] h-[12px]',
}) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2.5'
    strokeLinecap='round'
    strokeLinejoin='round'
    className={className}
  >
    <path d='m18 15-6-6-6 6' />
  </svg>
)

export const ChevronDownIcon: React.FC<IconProps> = ({
  className = 'w-[12px] h-[12px]',
}) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2.5'
    strokeLinecap='round'
    strokeLinejoin='round'
    className={className}
  >
    <path d='m6 9 6 6 6-6' />
  </svg>
)

export const RulerIcon: React.FC<IconProps> = ({
  className = 'w-[14px] h-[14px]',
}) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2.5'
    strokeLinecap='round'
    strokeLinejoin='round'
    className={className}
  >
    <rect width='20' height='8' x='2' y='8' rx='1' />
    <path d='M7 8v3' />
    <path d='M12 8v4' />
    <path d='M17 8v3' />
  </svg>
)
