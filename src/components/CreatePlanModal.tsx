'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MapPin, Plus, Minus } from 'lucide-react'
import type { Plan } from '@/types'
import { supabase } from '@/lib/supabase'
import { COLLAB_CATEGORIES } from '@/lib/mockData'
import toast from 'react-hot-toast'

interface CreatePlanModalProps {
  onClose: () => void
  onCreated: (plan: Plan) => void
  defaultMode?: 'NOW' | 'SOON' | 'COLLAB'
}

const MODES = [
  { id: 'NOW',    label: '🔴 Now',    color: '#E85A4F', bg: '#FFFFFF', border: '#EAE7DC' },
  { id: 'SOON',   label: '📅 Soon',   color: '#EFB11D', bg: '#FFFFFF', border: '#EAE7DC' },
  { id: 'COLLAB', label: '🤝 Collab', color: '#865D36', bg: '#FFFFFF', border: '#EAE7DC' },
]

export default function CreatePlanModal({ onClose, onCreated, defaultMode = 'NOW' }: CreatePlanModalProps) {
  const [mode, setMode] = useState<'NOW' | 'SOON' | 'COLLAB'>(defaultMode)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [maxPeople, setMaxPeople] = useState(6)
  const [collabCategory, setCollabCategory] = useState(COLLAB_CATEGORIES[0].label)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [loading, setLoading] = useState(false)

  const modeData = MODES.find(m => m.id === mode)!

  const handleCreate = async () => {
    if (!title.trim() || !location.trim()) { toast.error('Please add a title and location'); return }
    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { toast.error('Not authenticated'); setLoading(false); return }

    const now = new Date()
    const startsAt = mode === 'NOW'
      ? new Date(now.getTime() + 15 * 60000).toISOString()
      : date && time
        ? new Date(`${date}T${time}`).toISOString()
        : new Date(now.getTime() + 24 * 3600000).toISOString()

    const planData = {
      creator_id: session.user.id,
      mode,
      title: title.trim(),
      description: description.trim() || null,
      location: location.trim(),
      starts_at: startsAt,
      max_people: maxPeople,
      tags: [mode],
      collab_category: mode === 'COLLAB' ? collabCategory : null,
      is_active: true
    }

    const { data, error } = await supabase
      .from('plans')
      .insert(planData)
      .select('*, creator:creator_id(*)')
      .single()

    if (error || !data) {
      toast.error('Failed to create plan')
      setLoading(false)
      return
    }

    // Automatically join the plan you just created
    await supabase.from('plan_participants').insert({ plan_id: data.id, user_id: session.user.id })

    const formattedPlan: Plan = {
      ...data,
      joined_count: 1,
      has_joined: true
    }

    setLoading(false)
    onCreated(formattedPlan)
    toast.success('Plan created! 🎉')
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(62,54,46,0.45)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-end' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 430, margin: '0 auto', background: 'var(--bg-secondary)', borderRadius: '28px 28px 0 0', maxHeight: '90dvh', overflowY: 'auto' }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        </div>

        <div style={{ padding: '16px 20px 40px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>Create Plan</h2>
            <button onClick={onClose} style={{ background: 'var(--bg-section)', border: '1px solid var(--border)', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <X size={17} />
            </button>
          </div>

          {/* Mode tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {MODES.map(m => (
              <button key={m.id} onClick={() => setMode(m.id as typeof mode)}
                style={{ flex: 1, padding: '10px 6px', borderRadius: 'var(--radius-sm)', background: mode === m.id ? m.bg : 'var(--bg-section)', border: `1.5px solid ${mode === m.id ? m.border : 'var(--border)'}`, color: mode === m.id ? m.color : 'var(--text-muted)', fontSize: 12, fontWeight: mode === m.id ? 700 : 500, cursor: 'pointer', transition: 'all 0.15s ease', textAlign: 'center' }}>
                {m.label}
              </button>
            ))}
          </div>

          {/* Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Title *', el: <input className="input-field" placeholder={mode === 'NOW' ? 'e.g. Cycling in 30 mins' : mode === 'SOON' ? 'e.g. Run club Sunday morning' : 'e.g. Looking for a photography partner'} value={title} onChange={e => setTitle(e.target.value)} maxLength={80} /> },
              { label: 'Description', el: <textarea className="input-field" placeholder="What's the vibe? Add more details..." value={description} onChange={e => setDescription(e.target.value)} rows={3} maxLength={300} style={{ resize: 'none', lineHeight: 1.5 }} /> },
            ].map(({ label, el }) => (
              <div key={label}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>{label}</label>
                {el}
              </div>
            ))}

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Location *</label>
              <div style={{ position: 'relative' }}>
                <MapPin size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: modeData.color }} />
                <input className="input-field" placeholder="Where is this happening?" value={location} onChange={e => setLocation(e.target.value)} style={{ paddingLeft: 40 }} />
              </div>
            </div>

            {mode !== 'NOW' && (
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  { label: 'Date', type: 'date', val: date, set: setDate },
                  { label: 'Time', type: 'time', val: time, set: setTime },
                ].map(({ label, type, val, set }) => (
                  <div key={label} style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>{label}</label>
                    <input type={type} className="input-field" value={val} onChange={e => set(e.target.value)} style={{ colorScheme: 'light' }} />
                  </div>
                ))}
              </div>
            )}

            {mode === 'COLLAB' && (
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>Category</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {COLLAB_CATEGORIES.map(cat => (
                    <button key={cat.label} onClick={() => setCollabCategory(cat.label)}
                      style={{ padding: '8px 14px', borderRadius: 999, background: collabCategory === cat.label ? '#FFFFFF' : 'var(--bg-section)', border: `1px solid ${collabCategory === cat.label ? 'var(--border)' : 'var(--border)'}`, color: collabCategory === cat.label ? 'var(--collab)' : 'var(--text-secondary)', fontSize: 13, fontWeight: collabCategory === cat.label ? 700 : 500, cursor: 'pointer' }}>
                      {cat.icon} {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>Max people</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                {[{ icon: <Minus size={15} />, action: () => setMaxPeople(p => Math.max(2, p - 1)) }, { icon: <Plus size={15} />, action: () => setMaxPeople(p => Math.min(50, p + 1)) }].map(({ icon, action }, i) => (
                  <button key={i} onClick={action} style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-section)', border: '1.5px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                    {icon}
                  </button>
                )).filter((_, i) => i === 0).concat(
                  <span key="count" style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-primary)', width: 40, textAlign: 'center' }}>{maxPeople}</span>,
                  <button key="plus" onClick={() => setMaxPeople(p => Math.min(50, p + 1))} style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-section)', border: '1.5px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                    <Plus size={15} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <button className="btn-primary" onClick={handleCreate} disabled={loading} style={{ marginTop: 28, background: loading ? 'var(--border)' : 'var(--cta)', color: loading ? 'var(--text-muted)' : '#FFFFFF', boxShadow: loading ? 'none' : '0 4px 16px rgba(232,90,79,0.28)' }}>
            {loading ? 'Creating…' : '✨ Create Plan'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
