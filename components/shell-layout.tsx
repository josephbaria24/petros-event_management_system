"use client"

import { Toaster } from "sonner"
import { ThemeProvider } from "./theme-provider"

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
       <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
      {children}
      </ThemeProvider>
      {/* ✅ Global Sonner Toaster */}
      <Toaster
        richColors
        position="top-right"
        closeButton
      />
    </>
  )
}
