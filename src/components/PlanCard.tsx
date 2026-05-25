'use client'

import { motion } from 'framer-motion'
import { MapPin, Clock, Users, BadgeCheck, Zap } from 'lucide-react'
import type { Plan } from '@/types'
import { formatDistanceToNow, format, isToday, isTomorrow } from 'date-fns'

interface PlanCardProps {
  plan: Plan
  onJoin: (plan: Plan) => void
  onOpen: (plan: Plan) => void
  index?: number
}

function formatStart(dateStr: string, mode: string) {
  const d = new Date(dateStr)
  if (mode === 'NOW') return `In ${formatDistanceToNow(d)}`
  if (isToday(d)) return `Today · ${format(d, 'h:mm a')}`
  if (isTomorrow(d)) return `Tomorrow · ${format(d, 'h:mm a')}`
  return format(d, 'EEE MMM d · h:mm a')
}

const MODE_META = {
  NOW:    { color: '#E85A4F', pill: 'pill-now',    label: '🔴 LIVE NOW' },
  SOON:   { color: '#EFB11D', pill: 'pill-soon',   label: '📅 SOON'     },
  COLLAB: { color: '#865D36', pill: 'pill-collab', label: '🤝 COLLAB'   },
}

export default function PlanCard({ plan, onJoin, onOpen, index = 0 }: PlanCardProps) {
  const meta = MODE_META[plan.mode]
  const spotsLeft = plan.max_people ? plan.max_people - plan.joined_count : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: index * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileTap={{ scale: 0.985 }}
      onClick={() => onOpen(plan)}
      className="card"
      style={{ padding: '18px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
    >
      {/* Mode accent top strip */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, transparent, ${meta.color}55, transparent)`,
      }} />

      {/* Header: avatar + name + spots */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <img
            src={plan.creator.avatar_url}
            alt={plan.creator.full_name}
            style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }}
            className={plan.creator.is_verified ? 'avatar-ring-verified' : ''}
          />
          {plan.creator.is_free_now && plan.mode === 'NOW' && (
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, background: 'var(--now)', borderRadius: '50%', border: '2px solid #FFFFFF' }} />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {plan.creator.full_name}
            </span>
            {plan.creator.is_verified && (
              <BadgeCheck size={13} style={{ color: 'var(--peach-warm)', flexShrink: 0 }} />
            )}
          </div>
          <span className={`pill ${meta.pill}`}>{meta.label}</span>
        </div>

        {spotsLeft !== null && (
          <div style={{
            background: spotsLeft <= 2 ? '#FFFFFF' : 'var(--bg-section)',
            border: `1px solid ${spotsLeft <= 2 ? 'var(--now)' : 'var(--border)'}`,
            borderRadius: 10,
            padding: '6px 10px',
            textAlign: 'center',
            flexShrink: 0,
          }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: spotsLeft <= 2 ? '#E85A4F' : 'var(--text-primary)' }}>
              {spotsLeft}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>left</div>
          </div>
        )}
      </div>

      {/* Title */}
      <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10, lineHeight: 1.3 }}>
        {plan.title}
      </h3>

      {/* Meta */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        {[
          { Icon: MapPin, text: plan.location },
          { Icon: Clock,  text: formatStart(plan.starts_at, plan.mode) },
          { Icon: Users,  text: `${plan.joined_count} joined${plan.max_people ? ` · ${plan.max_people} max` : ''}` },
        ].map(({ Icon, text }) => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Icon size={13} style={{ color: meta.color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {text}
            </span>
          </div>
        ))}
      </div>

      {/* Tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {plan.tags.slice(0, 3).map(tag => (
          <span key={tag} className="tag">{tag}</span>
        ))}
      </div>

      {/* CTA */}
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={e => { e.stopPropagation(); onJoin(plan) }}
        style={{
          width: '100%',
          padding: 13,
          borderRadius: 'var(--radius-sm)',
          background: plan.has_joined ? '#FFFFFF' : 'var(--cta)',
          border: plan.has_joined ? '1.5px solid var(--border)' : 'none',
          color: plan.has_joined ? 'var(--text-secondary)' : '#FFFFFF',
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
          letterSpacing: '0.01em',
          boxShadow: plan.has_joined ? 'none' : '0 3px 12px rgba(232,90,79,0.25)',
        }}
      >
        <Zap size={14} />
        {plan.has_joined ? 'Joined ✓' : plan.mode === 'COLLAB' ? 'Request to Join' : 'Join Plan'}
      </motion.button>
    </motion.div>
  )
}
