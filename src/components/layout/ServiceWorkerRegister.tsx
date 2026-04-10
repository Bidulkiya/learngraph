'use client'

import { useEffect } from 'react'

/**
 * Service Worker 등록 — 프로덕션에서만 활성화.
 * Root layout에 한 번만 마운트.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('[SW] Registration failed:', err)
      })
    }
  }, [])

  return null
}
