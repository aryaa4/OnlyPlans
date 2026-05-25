'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BadgeCheck, MapPin, Settings, LogOut, ChevronRight, Zap, Camera, X, Plus, Clock, Activity, Trash2, ShieldCheck } from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import ChatPanel from '@/components/ChatPanel'
import { useAppStore } from '@/store/useAppStore'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Conversation, User } from '@/types'
import toast from 'react-hot-toast'
import type { Vibe } from '@/types'

const VIBE_PROMPTS = [
  "Right now I feel like…",
  "I’m stepping out for…",
  "Join me if you want to…",
  "If you’re free right now…",
  "Looking for someone to…"
]

const STATS = [
  { label: 'Plans Created', value: '12' },
  { label: 'Plans Joined',  value: '34' },
]

export default function ProfilePage() {
  const { user, setUser, activeMode } = useAppStore()
  const router = useRouter()
  const [isFreeNow, setIsFreeNow] = useState(user?.is_free_now || false)
  const [circleCount, setCircleCount] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [now] = useState(() => Date.now())

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  // Vibe Editor State
  const [showVibeModal, setShowVibeModal] = useState(false)
  const [vibePrompt, setVibePrompt] = useState(VIBE_PROMPTS[0])
  const [vibeAnswer, setVibeAnswer] = useState('')
  const [vibeExpiryHours, setVibeExpiryHours] = useState(2)
  const [activeConversation, setActiveConversation] = useState<Conversation & { other_user?: User } | null>(null)
  const [userVibes, setUserVibes] = useState<Vibe[]>([])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && user) {
      supabase.from('connections').select('follower_id', { count: 'exact', head: true }).eq('following_id', user.id).then(({ count }) => {
        if (count !== null) setCircleCount(count)
      })
      supabase.from('vibes').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).then(({ data }) => {
        if (data) setUserVibes(data as Vibe[])
      })
    }
  }, [user, mounted])

  useEffect(() => {
    if (mounted && !user) {
      router.push('/onboarding')
    }
  }, [user, router, mounted])

  if (!mounted || !user) return null

  // Active Vibes Filter
  const activeVibes = (userVibes || []).filter(v => new Date(v.expires_at) > new Date())

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    router.push('/onboarding')
    toast('See you soon! 👋')
  }

  const toggleFreeNow = async () => {
    const next = !isFreeNow
    setIsFreeNow(next)
    toast(next ? "You're now visible as free! ⚡" : 'Status hidden')
    
    await supabase.from('users').update({ is_free_now: next }).eq('id', user.id)
    setUser({ ...user, is_free_now: next })
  }

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

    setShowVibeModal(false)
    setVibeAnswer('')
    setVibeExpiryHours(2)
    
    const { data: inserted, error } = await supabase.from('vibes').insert(newVibe).select('*, user:user_id(*)').single()
    if (!error && inserted) {
      setUserVibes(prev => [inserted as Vibe, ...prev])
      toast.success('Live vibe added!')
    } else {
      toast.error('Failed to add vibe')
    }
  }

  const handleRemoveVibe = async (vibeId: string) => {
    if (!user) return
    const { error } = await supabase.from('vibes').delete().eq('id', vibeId)
    if (!error) {
      setUserVibes(prev => prev.filter(v => v.id !== vibeId))
    }
  }

  const handleJoinVibe = async (vibe: Vibe) => {
    if (!user) return
    // In a real app, this would be someone else's vibe. For now, testing logic:
    // Create or fetch conversation
    const other_user_id = user.id // using self for testing, normally vibe's author
    
    const { data: existing } = await supabase
      .from('conversations')
      .select('*, user1:user1_id(*), user2:user2_id(*)')
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${other_user_id}),and(user1_id.eq.${other_user_id},user2_id.eq.${user.id})`)
      .limit(1)

    let conv = existing?.[0]
    if (!conv) {
      const { data: inserted } = await supabase.from('conversations').insert({
        user1_id: user.id,
        user2_id: other_user_id,
        vibe_context_id: vibe.id
      }).select('*, user1:user1_id(*), user2:user2_id(*)').single()
      conv = inserted
    } else if (conv.vibe_context_id !== vibe.id) {
      await supabase.from('conversations').update({ vibe_context_id: vibe.id }).eq('id', conv.id)
      conv.vibe_context_id = vibe.id
    }

    if (conv) {
      const other_user = conv.user1_id === user.id ? conv.user2 : conv.user1
      setActiveConversation({ ...conv, other_user })
    }
  }

  const uploadFile = async (file: File) => {
    const ext = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
    const { error } = await supabase.storage.from('photos').upload(fileName, file)
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(fileName)
    return publicUrl
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setUploading(true)
      const toastId = toast.loading('Updating profile picture...')
      const publicUrl = await uploadFile(file)
      await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', user.id)
      setUser({ ...user, avatar_url: publicUrl })
      toast.success('Looking good!', { id: toastId })
    } catch (err) {
      toast.error('Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleAddPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    if (user.photos.length + files.length > 6) return toast.error('Max 6 photos allowed')
    try {
      setUploading(true)
      const toastId = toast.loading('Uploading photos...')
      const newUrls = await Promise.all(files.map(uploadFile))
      const updatedPhotos = [...(user.photos || []), ...newUrls]
      await supabase.from('users').update({ photos: updatedPhotos }).eq('id', user.id)
      setUser({ ...user, photos: updatedPhotos })
      toast.success('Photos added!', { id: toastId })
    } catch (err) {
      toast.error('Failed to upload some photos')
    } finally {
      setUploading(false)
    }
  }

  const removePhoto = async (index: number) => {
    const newPhotos = [...user.photos]
    newPhotos.splice(index, 1)
    setUser({ ...user, photos: newPhotos })
    await supabase.from('users').update({ photos: newPhotos }).eq('id', user.id)
  }

  return (
    <div className="page-container" style={{ minHeight: '100dvh' }}>
      {/* Background blobs */}
      <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'var(--peach-light)', opacity: 0.5, filter: 'blur(55px)', pointerEvents: 'none', zIndex: -1 }} />

      <input type="file" ref={avatarInputRef} onChange={handleAvatarChange} accept="image/*,.heic,.heif" style={{ display: 'none' }} />
      <input type="file" ref={photoInputRef} onChange={handleAddPhotos} accept="image/*,.heic,.heif" multiple style={{ display: 'none' }} />

      {/* Header */}
      <div style={{ padding: '54px 20px 22px', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>Profile</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            {[Settings].map((Icon, i) => (
              <button key={i} style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-secondary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', boxShadow: '0 1px 5px var(--shadow-soft)' }}>
                <Icon size={15} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: '0 20px 120px', position: 'relative', zIndex: 10 }}>

        {/* Avatar + name */}
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 24 }}>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'relative', width: 86, height: 86, borderRadius: 28, boxShadow: '0 4px 20px rgba(227,154,123,0.25)', overflow: 'hidden' }} className={user.is_verified ? 'avatar-ring-verified' : ''}>
               <img src={user.avatar_url} alt={user.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
               <button onClick={() => avatarInputRef.current?.click()} disabled={uploading} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', opacity: uploading ? 0.5 : 1 }}>
                 <Camera size={24} color="#FFFFFF" />
               </button>
            </div>
            {user.is_verified && (
              <div style={{ position: 'absolute', bottom: -4, right: -4, background: 'var(--bg-secondary)', borderRadius: '50%', padding: 2, boxShadow: '0 1px 4px var(--shadow-soft)', pointerEvents: 'none' }}>
                <BadgeCheck size={20} style={{ color: 'var(--peach-warm)' }} />
              </div>
            )}
          </div>
          <div style={{ flex: 1, paddingBottom: 4 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>
              {user.full_name}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 5 }}>@{user.username}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={12} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{user.city}</span>
            </div>
          </div>
        </motion.div>

        {/* Trust Card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.02 }} style={{ marginBottom: 24 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid var(--border)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
               <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(232,90,79,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <ShieldCheck size={18} style={{ color: 'var(--cta)' }} />
               </div>
               <div>
                 <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{user.trust_status || 'New'}</p>
                 <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>{user.meetup_count || 0} successful meetups</p>
               </div>
            </div>
            {user.is_verified && (
              <div style={{ background: 'var(--bg-section)', padding: '4px 10px', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 4 }}>
                <BadgeCheck size={14} style={{ color: 'var(--cta)' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>Verified</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Live Vibes Section */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }} style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Activity size={14} style={{ color: 'var(--cta)' }} />
              <h3 style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live Vibes</h3>
            </div>
            {activeVibes.length < 4 && (
              <button onClick={() => setShowVibeModal(true)} style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border)', borderRadius: 99, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                <Plus size={12} /> Add
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <AnimatePresence>
              {activeVibes.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setShowVibeModal(true)}
                  style={{ padding: 20, background: 'var(--bg-secondary)', borderRadius: 16, border: '1.5px dashed var(--border)', textAlign: 'center', cursor: 'pointer' }}
                >
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, margin: 0 }}>You have no active vibes.<br/>Add one so people know what you&apos;re up to!</p>
                </motion.div>
              ) : (
                activeVibes.map((vibe) => {
                  const hoursLeft = Math.max(0, Math.floor((new Date(vibe.expires_at).getTime() - now) / (1000 * 60 * 60)))
                  const isLiveNow = hoursLeft <= 2
                  
                  return (
                    <motion.div 
                      key={vibe.id}
                      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      style={{ background: '#FFF7F2', borderRadius: 24, padding: 20, position: 'relative', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: 12, cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: isLiveNow ? 'rgba(232,90,79,0.12)' : 'var(--bg-section)', padding: '6px 10px', borderRadius: 8 }}>
                          <Clock size={12} style={{ color: isLiveNow ? 'var(--cta)' : 'var(--text-muted)' }} />
                          <span style={{ fontSize: 10, fontWeight: 800, color: isLiveNow ? 'var(--cta)' : 'var(--text-muted)', letterSpacing: '0.06em' }}>
                            {isLiveNow ? 'LIVE NOW' : 'TODAY'} • {hoursLeft}h
                          </span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); handleRemoveVibe(vibe.id) }} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--text-muted)' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div>
                        <p style={{ fontSize: 14, color: 'var(--text-primary)', opacity: 0.6, fontWeight: 500, margin: '0 0 4px 0' }}>{vibe.prompt}</p>
                        <p style={{ fontSize: 18, color: 'var(--text-primary)', fontWeight: 800, margin: 0, lineHeight: 1.3 }}>{vibe.answer}</p>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                         <button onClick={(e) => { e.stopPropagation(); handleJoinVibe(vibe) }} style={{ padding: '8px 20px', borderRadius: 99, background: 'var(--cta)', color: '#FFFFFF', fontSize: 13, fontWeight: 700, border: 'none', boxShadow: '0 4px 12px rgba(232,90,79,0.25)', cursor: 'pointer' }}>
                           Join
                         </button>
                      </div>
                    </motion.div>
                  )
                })
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Free Now toggle */}
        <motion.button initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          whileTap={{ scale: 0.97 }} onClick={toggleFreeNow}
          className="card"
          style={{ width: '100%', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', marginBottom: 24, background: isFreeNow ? '#FFFFFF' : 'var(--bg-secondary)', border: `1.5px solid ${isFreeNow ? 'var(--now)' : 'var(--border)'}` }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: isFreeNow ? 'rgba(232,90,79,0.12)' : 'var(--bg-section)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={17} style={{ color: isFreeNow ? 'var(--cta)' : 'var(--text-muted)' }} />
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: isFreeNow ? 'var(--cta)' : 'var(--text-primary)', margin: 0 }}>
              {isFreeNow ? "I'm Free Now!" : 'Set as Free Now'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              {isFreeNow ? "Others can see you're available" : "Show you're free to meet"}
            </p>
          </div>
          <div style={{ width: 46, height: 26, borderRadius: 13, background: isFreeNow ? 'var(--cta)' : 'var(--border)', position: 'relative', transition: 'background 0.2s ease', flexShrink: 0 }}>
            <motion.div animate={{ x: isFreeNow ? 22 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 32 }}
              style={{ position: 'absolute', top: 3, width: 20, height: 20, borderRadius: '50%', background: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
          </div>
        </motion.button>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
          <div className="card" style={{ padding: '14px 10px', textAlign: 'center' }}>
            <p style={{ fontSize: 26, fontWeight: 900, color: 'var(--cta)', margin: 0 }}>{circleCount}</p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, margin: '3px 0 0', lineHeight: 1.3 }}>Circle</p>
          </div>
          {STATS.map(({ label, value }) => (
            <div key={label} className="card" style={{ padding: '14px 10px', textAlign: 'center' }}>
              <p style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>{value}</p>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, margin: '3px 0 0', lineHeight: 1.3 }}>{label}</p>
            </div>
          ))}
        </motion.div>

        {/* Photos */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Photos <span style={{ color: 'var(--cta)' }}>{user.photos?.length || 0}/6</span></h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {(user.photos || []).map((src: string, i: number) => (
              <div key={i} style={{ aspectRatio: '1', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px var(--shadow-soft)', position: 'relative' }}>
                <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button onClick={() => removePhoto(i)} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                  <X size={12} />
                </button>
              </div>
            ))}
            {(user.photos?.length || 0) < 6 && (
              <button onClick={() => photoInputRef.current?.click()} disabled={uploading} style={{ aspectRatio: '1', borderRadius: 14, background: 'var(--bg-section)', border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, opacity: uploading ? 0.5 : 1 }}>
                <span style={{ fontSize: 26, color: 'var(--text-muted)', fontWeight: 300 }}>+</span>
              </button>
            )}
          </div>
        </motion.div>

        {/* Interests */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Interests</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(user.interests || []).map((interest: string) => (
              <span key={interest} style={{ padding: '6px 14px', borderRadius: 999, background: '#FFFFFF', border: '1px solid var(--now)', color: 'var(--cta)', fontSize: 13, fontWeight: 600 }}>
                {interest}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Sign out */}
        <button onClick={handleLogout} className="btn-ghost" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)', marginTop: 12 }}>
          <LogOut size={15} />
          Sign Out
        </button>
      </div>

      <BottomNav activeMode={activeMode} onModeChange={() => {}} />

      {/* Vibe Editor Bottom Sheet */}
      <AnimatePresence>
        {showVibeModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(62,54,46,0.35)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end' }}
            onClick={() => setShowVibeModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 430, margin: '0 auto', background: '#FFF7F2', borderRadius: '24px 24px 0 0', padding: '16px 20px env(safe-area-inset-bottom, 20px)' }}
            >
              <div style={{ width: 36, height: 5, borderRadius: 3, background: 'var(--border)', margin: '0 auto 16px' }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <button onClick={() => setShowVibeModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 16, fontWeight: 600, padding: 0, cursor: 'pointer' }}>
                  Cancel
                </button>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Create Vibe</h3>
                <button 
                  onClick={handleAddVibe} 
                  disabled={!vibeAnswer.trim()} 
                  style={{ background: 'none', border: 'none', color: vibeAnswer.trim() ? 'var(--cta)' : 'var(--text-muted)', fontSize: 16, fontWeight: 700, padding: 0, cursor: vibeAnswer.trim() ? 'pointer' : 'default', opacity: vibeAnswer.trim() ? 1 : 0.5 }}
                >
                  Done
                </button>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Prompt</label>
                <select 
                  value={vibePrompt} 
                  onChange={e => setVibePrompt(e.target.value)}
                  style={{ width: '100%', padding: '16px', borderRadius: 16, background: '#FFFFFF', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', outline: 'none', appearance: 'none' }}
                >
                  {VIBE_PROMPTS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Answer</label>
                <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1.5px solid var(--cta)', padding: '16px', position: 'relative', boxShadow: '0 4px 12px rgba(232,90,79,0.08)' }}>
                  <textarea 
                    value={vibeAnswer}
                    onChange={e => setVibeAnswer(e.target.value.slice(0, 100))}
                    placeholder="e.g. going for coffee in Bandra!"
                    style={{ width: '100%', border: 'none', background: 'transparent', fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', resize: 'none', outline: 'none', minHeight: 60, fontFamily: 'inherit' }}
                  />
                  <span style={{ position: 'absolute', bottom: 12, right: 16, fontSize: 11, fontWeight: 700, color: vibeAnswer.length >= 100 ? 'var(--cta)' : 'var(--text-muted)' }}>
                    {vibeAnswer.length}/100
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: 32 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, display: 'block' }}>Expires in</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[2, 6, 24].map(h => (
                    <button 
                      key={h}
                      onClick={() => setVibeExpiryHours(h)}
                      style={{ flex: 1, padding: '14px 0', borderRadius: 14, border: `1.5px solid ${vibeExpiryHours === h ? 'var(--cta)' : 'transparent'}`, background: vibeExpiryHours === h ? 'rgba(232,90,79,0.08)' : '#FFFFFF', color: vibeExpiryHours === h ? 'var(--cta)' : 'var(--text-muted)', boxShadow: vibeExpiryHours === h ? 'none' : '0 2px 8px rgba(0,0,0,0.03)', fontSize: 15, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeConversation && (
          <ChatPanel conversation={activeConversation} onClose={() => setActiveConversation(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}
