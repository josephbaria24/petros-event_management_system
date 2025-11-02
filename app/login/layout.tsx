import type { ReactNode } from "react"

export default function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background: "linear-gradient(135deg, #1e3a8a 0%, #16a34a 100%)", // Blue → Green
      }}
    >
      {children}
    </div>
  )
}
