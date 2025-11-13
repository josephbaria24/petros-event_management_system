import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Shell } from "@/components/shell-layout"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

const poppins = Geist({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: "Petrosphere Event Manager",
  description:
    "Developed by Petrosphere DSIS for managing events and attendees efficiently.",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={poppins.className}>
        {/* ✅ Wrap everything in Shell to include Sonner */}
        <Shell>{children}</Shell>
        <Analytics />
      </body>
    </html>
  )
}
