/*
 * Copyright (C) 2026 Moremi Vannak
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import React from 'react'
import { ProgramWithNav } from 'react-tea-cup'
import { type Dispatcher, Sub } from 'tea-cup-fp'

import { App } from './app'
import { type Model, type Msg } from './type'
import { init, update } from './update'

const preLoadingView = () => {
  return (
    <div className='bg-theme-secondary flex h-[550px] w-[380px] items-center justify-center select-none'>
      <div
        className='border-theme-border-input border-t-theme-primary h-8 w-8 animate-spin border-4'
        style={{ borderRadius: '50%' }}
      ></div>
    </div>
  )
}

const preView = (dispatch: Dispatcher<Msg>, model: Model | null) => {
  return model ? <App model={model} dispatch={dispatch} /> : preLoadingView()
}

export const AppProgram = () => {
  return (
    <ProgramWithNav<Model | null, Msg>
      onUrlChange={() => ({ _tag: 'NoOp' })}
      init={init}
      update={update}
      view={preView}
      subscriptions={() => Sub.none()}
    />
  )
}
