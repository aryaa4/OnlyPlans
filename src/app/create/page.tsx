'use client'

import { useState, useEffect } from 'react'
import { Sparkles } from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import { useAppStore } from '@/store/useAppStore'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

const VIBE_PROMPTS = [
  "Right now I feel like...",
  "I'm stepping out for...",
  "Join me if you want to...",
  "If you're free right now...",
  "Looking for someone to..."
]

export default function CreatePage() {
  const { user } = useAppStore()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [vibePrompt, setVibePrompt] = useState(VIBE_PROMPTS[0])
  const [vibeAnswer, setVibeAnswer] = useState('')
  const [vibeExpiryHours, setVibeExpiryHours] = useState(2)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  const handleAddVibe = async () => {
    if (!vibeAnswer.trim() || !user) return toast.error('Please add an answer')
    
    const newVibe = {
      user_id: user.id,
      prompt: vibePrompt,
      answer: vibeAnswer.trim(),
      type: 'live',
      expires_at: new Date(Date.now() + vibeExpiryHours * 60 * 60 * 1000).toISOString(),
      location: user.city,
      lat: 19.0760, // Mock Mumbai lat
      lng: 72.8777  // Mock Mumbai lng
    }

    const { error } = await supabase.from('vibes').insert(newVibe)
    if (!error) {
      toast.success('Live vibe created! 🎉')
      router.push('/home')
    } else {
      toast.error('Failed to create vibe')
    }
  }

  if (!mounted || !user) return null

  return (
    <div className="page-container" style={{ background: '#FFF7F2' }}>
      <div style={{ padding: '54px 20px 120px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', padding: '12px', background: 'var(--cta)', borderRadius: '50%', color: '#FFF', marginBottom: 16, boxShadow: '0 8px 24px rgba(232,90,79,0.3)' }}>
            <Sparkles size={32} />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>Start a Vibe</h1>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', margin: '8px 0 0' }}>Spontaneous plans start here. What are you up to?</p>
        </div>

        <div style={{ background: '#FFFFFF', borderRadius: 24, padding: 24, boxShadow: '0 10px 30px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>1. Choose a Prompt</h3>
          <select 
            value={vibePrompt} 
            onChange={e => setVibePrompt(e.target.value)}
            style={{ width: '100%', padding: '14px 16px', borderRadius: 16, border: '1px solid var(--border)', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 24, appearance: 'none', background: 'var(--bg-secondary)' }}
          >
            {VIBE_PROMPTS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <h3 style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>2. Your Answer</h3>
          <textarea 
            value={vibeAnswer} 
            onChange={e => setVibeAnswer(e.target.value)}
            placeholder="get some coffee ☕️"
            maxLength={100}
            style={{ width: '100%', padding: '16px', borderRadius: 16, border: '1px solid var(--border)', fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', minHeight: 120, resize: 'none', marginBottom: 8, background: 'var(--bg-secondary)' }}
          />
          <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 24 }}>
            {vibeAnswer.length}/100
          </div>

          <h3 style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>3. Expiry</h3>
          <div style={{ display: 'flex', gap: 10, marginBottom: 32 }}>
            {[2, 4, 6].map(h => (
              <button 
                key={h} 
                onClick={() => setVibeExpiryHours(h)}
                style={{ flex: 1, padding: '12px', borderRadius: 12, border: `2px solid ${vibeExpiryHours === h ? 'var(--cta)' : 'var(--border)'}`, background: vibeExpiryHours === h ? 'rgba(232,90,79,0.05)' : '#FFF', color: vibeExpiryHours === h ? 'var(--cta)' : 'var(--text-muted)', fontWeight: 700, fontSize: 14 }}
              >
                {h} Hours
              </button>
            ))}
          </div>

          <button 
            onClick={handleAddVibe}
            style={{ width: '100%', padding: '18px', borderRadius: 99, background: 'var(--cta)', color: '#FFF', fontSize: 16, fontWeight: 800, border: 'none', cursor: 'pointer', boxShadow: '0 8px 24px rgba(232,90,79,0.3)' }}
          >
            Post Vibe
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
