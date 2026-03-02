"use client"

import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { Toaster as SonnerToaster } from "./toast"

interface ToastProviderProps {
  children: React.ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  return (
    <ToastPrimitives.Provider>
      {children}
      <SonnerToaster />
    </ToastPrimitives.Provider>
  )
}
