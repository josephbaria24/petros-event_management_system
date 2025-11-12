import type { ReactNode } from "react"

export default function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background: "linear-gradient(135deg, #00044a 40%, #fbe706ff 100%)", // Blue → Green
      }}
    >
      {children}
    </div>
  )
}
