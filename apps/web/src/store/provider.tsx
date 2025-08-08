"use client"

import React from "react"
import { Provider } from "react-redux"

import { type AppStore, makeStore } from "./store"

const StoreProvider = ({ children }: { children: React.ReactNode }) => {
  const storeRef = React.useRef<AppStore>(undefined)

  if (!storeRef.current) {
    storeRef.current = makeStore()
    // TODO: Initialize store with initial state
  }

  return <Provider store={storeRef.current}>{children}</Provider>
}

export default StoreProvider
