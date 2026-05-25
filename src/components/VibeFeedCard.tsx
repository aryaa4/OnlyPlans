'use client'

import { motion } from 'framer-motion'
import { MapPin, Clock, Users, ArrowRight, BadgeCheck } from 'lucide-react'
import type { Vibe } from '@/types'
import { formatDistanceToNowStrict, differenceInHours, differenceInMinutes } from 'date-fns'

interface VibeFeedCardProps {
  vibe: Vibe
  onJoin: (vibe: Vibe) => void
  onOpenDetails?: (vibe: Vibe) => void
  index: number
}

export default function VibeFeedCard({ vibe, onJoin, onOpenDetails, index }: VibeFeedCardProps) {
  const isLive = new Date() < new Date(vibe.expires_at)
  
  // Calculate expiry
  const hoursLeft = differenceInHours(new Date(vibe.expires_at), new Date())
  const minsLeft = differenceInMinutes(new Date(vibe.expires_at), new Date()) % 60
  
  const expiryText = hoursLeft > 0 
    ? `${hoursLeft}h left` 
    : minsLeft > 0 
      ? `${minsLeft}m left` 
      : 'Expiring soon'

  // Stable mock distance using vibe ID
  const hash = vibe.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const mockDist = (hash % 50) / 10 + 0.5
  const distance = vibe.lat ? mockDist.toFixed(1) + ' km' : 'Nearby'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2 }}
      onClick={() => onOpenDetails?.(vibe)}
      style={{
        background: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
        border: '1px solid rgba(0,0,0,0.02)',
        cursor: onOpenDetails ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img 
            src={vibe.user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(vibe.user?.full_name || 'User')}&background=F4F4F4&color=333`} 
            alt="" 
            style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} 
          />
          <div>
            <h4 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
              {vibe.user?.full_name}
              {vibe.user?.is_verified && <BadgeCheck size={14} style={{ color: 'var(--cta)' }} />}
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--text-muted)' }}>
                <MapPin size={11} />
                <span style={{ fontSize: 11, fontWeight: 600 }}>{vibe.location || 'Mumbai'}</span>
              </div>
              <span style={{ color: 'var(--border)' }}>•</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{distance}</span>
            </div>
          </div>
        </div>

        {/* Live Badge */}
        {isLive && (
          <div style={{ background: 'var(--now)', color: '#FFF', padding: '4px 10px', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFF', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>LIVE</span>
          </div>
        )}
      </div>

      {/* Vibe Content */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: 'var(--cta)', fontWeight: 700, margin: '0 0 6px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {vibe.prompt}
        </p>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', margin: 0, lineHeight: 1.25, letterSpacing: '-0.02em' }}>
          &quot;{vibe.answer}&quot;
        </h2>
      </div>

      {/* Footer / Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          {/* Expiry */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}>
            <Clock size={14} />
            <span style={{ fontSize: 12, fontWeight: 600 }}>{expiryText}</span>
          </div>
          {/* Participants */}
          {(vibe.joined_count ?? 0) > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}>
              <Users size={14} />
              <span style={{ fontSize: 12, fontWeight: 600 }}>{vibe.joined_count} joined</span>
            </div>
          )}
        </div>

        <button 
          onClick={(e) => { e.stopPropagation(); onJoin(vibe) }}
          style={{ 
            background: 'var(--text-primary)', 
            color: '#FFFFFF', 
            border: 'none', 
            padding: '10px 24px', 
            borderRadius: 99, 
            fontSize: 14, 
            fontWeight: 800, 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
        >
          Join <ArrowRight size={16} />
        </button>
      </div>
    </motion.div>
  )
}
