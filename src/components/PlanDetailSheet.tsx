'use client'

import { motion } from 'framer-motion'
import { X, MapPin, Clock, Users, BadgeCheck, MessageCircle, Calendar } from 'lucide-react'
import type { Plan } from '@/types'
import { format, formatDistanceToNow, isToday, isTomorrow } from 'date-fns'
import toast from 'react-hot-toast'

interface PlanDetailSheetProps {
  plan: Plan
  onClose: () => void
  onJoin: (plan: Plan) => void
  onOpenChat: (plan: Plan) => void
}

function formatStart(dateStr: string, mode: string) {
  const d = new Date(dateStr)
  if (mode === 'NOW') return `Starting in ${formatDistanceToNow(d)}`
  if (isToday(d))    return `Today at ${format(d, 'h:mm a')}`
  if (isTomorrow(d)) return `Tomorrow at ${format(d, 'h:mm a')}`
  return format(d, 'EEEE, MMM d · h:mm a')
}

const MODE_META = {
  NOW:    { color: '#E85A4F', label: 'Live Now',  bg: '#FFFFFF', border: '#EAE7DC' },
  SOON:   { color: '#EFB11D', label: 'Coming Up', bg: '#FFFFFF', border: '#EAE7DC' },
  COLLAB: { color: '#865D36', label: 'Collab',    bg: '#FFFFFF', border: '#EAE7DC' },
}

const ATTENDEE_AVATARS = [
  'https://i.pravatar.cc/150?img=11',
  'https://i.pravatar.cc/150?img=47',
  'https://i.pravatar.cc/150?img=15',
  'https://i.pravatar.cc/150?img=44',
  'https://i.pravatar.cc/150?img=19',
]

export default function PlanDetailSheet({ plan, onClose, onJoin, onOpenChat }: PlanDetailSheetProps) {
  const meta = MODE_META[plan.mode]
  const spotsLeft = plan.max_people ? plan.max_people - plan.joined_count : null

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(62,54,46,0.4)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 34 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 430, margin: '0 auto', background: 'var(--bg-secondary)', borderRadius: '28px 28px 0 0', maxHeight: '88dvh', overflowY: 'auto' }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>

        {/* Mode strip */}
        <div style={{ height: 3, margin: '10px 20px 0', borderRadius: 2, background: `linear-gradient(90deg, transparent, ${meta.color}55, transparent)` }} />

        <div style={{ padding: '18px 20px 40px' }}>
          {/* Creator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <div style={{ position: 'relative' }}>
              <img src={plan.creator.avatar_url} alt="" style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover' }} className={plan.creator.is_verified ? 'avatar-ring-verified' : ''} />
              {plan.creator.is_free_now && <div style={{ position: 'absolute', bottom: 0, right: 0, width: 13, height: 13, background: 'var(--now)', borderRadius: '50%', border: '2px solid #FFFFFF' }} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{plan.creator.full_name}</span>
                {plan.creator.is_verified && <BadgeCheck size={14} style={{ color: 'var(--peach-warm)' }} />}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>@{plan.creator.username} · Plan creator</p>
            </div>
            <button onClick={onClose} style={{ background: 'var(--bg-section)', border: '1px solid var(--border)', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <X size={16} />
            </button>
          </div>

          {/* Title */}
          <h2 style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.25, marginBottom: 10, color: 'var(--text-primary)' }}>{plan.title}</h2>
          {plan.description && <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 18 }}>{plan.description}</p>}

          {/* Info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
            {[
              { Icon: MapPin,   label: 'Location', value: plan.location },
              { Icon: Clock,    label: 'Time',     value: formatStart(plan.starts_at, plan.mode) },
              { Icon: Users,    label: 'People',   value: `${plan.joined_count}${plan.max_people ? `/${plan.max_people}` : ''} joined` },
              { Icon: Calendar, label: 'Mode',     value: plan.collab_category || plan.mode },
            ].map(({ Icon, label, value }) => (
              <div key={label} className="card-section" style={{ padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                  <Icon size={12} style={{ color: meta.color }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 22 }}>
            {plan.tags.map(tag => (
              <span key={tag} style={{ padding: '5px 14px', borderRadius: 999, background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color, fontSize: 12, fontWeight: 600 }}>
                {tag}
              </span>
            ))}
          </div>

          {/* Attendees */}
          <div style={{ marginBottom: 26 }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Who&apos;s joining</h3>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {ATTENDEE_AVATARS.slice(0, Math.min(plan.joined_count, 5)).map((src, i) => (
                <img key={i} src={src} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--bg-secondary)', marginLeft: i === 0 ? 0 : -9, position: 'relative', zIndex: 10 - i }} />
              ))}
              {plan.joined_count > 5 && (
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-section)', border: '2px solid var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: -9, fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', position: 'relative', zIndex: 5 }}>
                  +{plan.joined_count - 5}
                </div>
              )}
            </div>
          </div>

          {/* CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {plan.has_joined ? (
              <button onClick={() => onOpenChat(plan)} className="btn-primary">
                <MessageCircle size={17} />
                Open Group Chat
              </button>
            ) : (
              <button onClick={() => { onJoin(plan); onClose() }} className="btn-primary">
                {plan.mode === 'COLLAB' ? '🤝 Request to Collaborate' : '⚡ Join Plan'}
              </button>
            )}
            {plan.has_joined && (
              <button onClick={() => toast('Left plan', { icon: '👋' })} className="btn-ghost" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>
                Leave plan
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
