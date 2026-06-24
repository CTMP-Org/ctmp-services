import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { MsalProvider } from "@/components/providers/msal-provider"
import { ThemeProvider } from "@/components/providers/theme-provider"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: "Cloud Training Management Portal",
  description: "Enterprise management for AWS and cloud training environments.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-zinc-950 text-zinc-50`}>
        <MsalProvider>
          <ThemeProvider defaultTheme="dark">
            {children}
          </ThemeProvider>
        </MsalProvider>
      </body>
    </html>
  )
}
