'use client'

import { motion } from 'framer-motion'
import { Home, Compass, PlusCircle, MessageCircle, User } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { useAppStore } from '@/store/useAppStore'

const tabs = [
  { icon: Home,          label: 'Home',    path: '/home' },
  { icon: Compass,       label: 'Explore', path: '/explore' },
  { icon: PlusCircle,    label: 'Create',  path: '/create' },
  { icon: MessageCircle, label: 'Inbox',   path: '/inbox' },
  { icon: User,          label: 'Profile', path: '/profile' },
]

interface BottomNavProps {
  activeMode?: string
  onModeChange?: (mode: string) => void
}


export default function BottomNav({ activeMode = 'NOW', onModeChange }: BottomNavProps) {
  const router   = useRouter()
  const pathname = usePathname()
  const { setActiveMode } = useAppStore()

  const handleTab = (tab: typeof tabs[0]) => {
    if (tab.path && pathname !== tab.path) {
      router.push(tab.path)
    }
  }

  return (
    <nav className="bottom-nav pb-safe" style={{ zIndex: 9999, pointerEvents: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
        {tabs.map(tab => {
          const isActive = tab.path === pathname || (tab.path === '/explore' && pathname === '/home' && activeMode === 'SOON') || (tab.path === '/home' && pathname === '/home' && activeMode === 'NOW')
          const color = '#E85A4F'

          return (
            <button
              key={tab.label}
              onClick={() => handleTab(tab)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                background: 'none', border: 'none', cursor: 'pointer', padding: '4px 16px',
                position: 'relative', zIndex: 10000, pointerEvents: 'auto',
              }}
            >
              {/* Active pill highlight */}
              {isActive && (
                <motion.div
                  layoutId="nav-bg"
                  style={{
                    position: 'absolute', inset: 0,
                    borderRadius: 12,
                    background: `${color}14`,
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}

              <motion.div
                animate={{ color: isActive ? color : 'var(--text-muted)', scale: isActive ? 1.08 : 1 }}
                transition={{ duration: 0.18 }}
                style={{ position: 'relative', zIndex: 1 }}
              >
                <tab.icon size={22} strokeWidth={isActive ? 2.4 : 1.8} />
              </motion.div>

              <motion.span
                animate={{ color: isActive ? color : 'var(--text-muted)', fontWeight: isActive ? 700 : 500 }}
                style={{ fontSize: 10, letterSpacing: '0.02em', position: 'relative', zIndex: 1 }}
              >
                {tab.label}
              </motion.span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
