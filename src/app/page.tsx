'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore, type AppStore } from '@/store/useAppStore'

export default function RootPage() {
  const router = useRouter()
  const user = useAppStore((s: AppStore) => s.user)

  useEffect(() => {
    if (user) {
      router.replace('/home')
    } else {
      router.replace('/onboarding')
    }
  }, [user, router])

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: 'linear-gradient(135deg, #FFD3AC, #FFB5AB)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, margin: '0 auto 14px', boxShadow: '0 6px 24px rgba(227,154,123,0.3)' }}>⚡</div>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: 500 }}>Loading OnlyPlans…</p>
      </div>
    </div>
  )
}
