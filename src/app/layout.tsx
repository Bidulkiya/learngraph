import type { Metadata, Viewport } from "next"
import { Noto_Sans_KR } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { ServiceWorkerRegister } from "@/components/layout/ServiceWorkerRegister"
import "./globals.css"

const notoSansKR = Noto_Sans_KR({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "NodeBloom — 노드가 피다, 지식이 자라다",
  description:
    "AI가 수업 자료에서 스킬트리를 자동 생성하고, 학생이 퀴즈를 풀어 노드를 잠금해제하며 꽃이 피듯 지식이 확장되는 차세대 교육 플랫폼.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NodeBloom",
  },
}

export const viewport: Viewport = {
  themeColor: "#6366F1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className={`${notoSansKR.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.svg" />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <ServiceWorkerRegister />
        <Toaster
          richColors
          position="top-right"
          visibleToasts={5}
          duration={5000}
          expand
        />
      </body>
    </html>
  )
}
