'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/useAppStore'
import { INTERESTS } from '@/lib/mockData'
import toast from 'react-hot-toast'
import { ArrowRight, ArrowLeft, Phone, Mail, MapPin, Check, ImagePlus, Trash2 } from 'lucide-react'
import type { User } from '@/types'
import { supabase } from '@/lib/supabase'
import IOSDatePicker from '@/components/IOSDatePicker'

const TOTAL_STEPS = 5

export default function OnboardingPage() {
  const router = useRouter()
  const { onboarding, setOnboarding, setUser, resetOnboarding } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const step = onboarding.step

  useEffect(() => setMounted(true), [])

  const goNext = () => setOnboarding({ step: step + 1 })
  const goBack = () => setOnboarding({ step: Math.max(0, step - 1) })
  const progress = ((step + 1) / TOTAL_STEPS) * 100

  if (!mounted) return null // Prevent hydration mismatch

  const completeOnboarding = async (files: File[]) => {
    if (files.length < 2) { toast.error('Please add at least 2 photos'); return }
    setLoading(true)
    
    // Get current session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      toast.error('Session expired. Please sign in again.')
      setLoading(false)
      return
    }

    const username = (onboarding.full_name || 'user').toLowerCase().replace(/\s/g, '.') + Math.floor(Math.random() * 1000)

    // Upload files
    const uploadedUrls: string[] = []
    for (const file of files) {
      const ext = file.name.split('.').pop()
      const fileName = `${session.user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
      
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, file)
        
      if (uploadError) {
        console.error('Upload error:', uploadError)
        toast.error(`Failed to upload ${file.name}`)
        continue
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(fileName)
        
      uploadedUrls.push(publicUrl)
    }

    if (uploadedUrls.length < 2) {
      toast.error('Not enough photos uploaded successfully. Please try again.')
      setLoading(false)
      return
    }

    const userProfile = {
      id: session.user.id,
      full_name: onboarding.full_name || 'User',
      username,
      avatar_url: uploadedUrls[0],
      photos: uploadedUrls,
      interests: onboarding.interests || [],
      city: onboarding.city || 'Mumbai',
      dob: onboarding.dob || '2000-01-01',
      gender: onboarding.gender,
      is_verified: false,
      is_free_now: false,
    }

    const { error } = await supabase
      .from('users')
      .update(userProfile)
      .eq('id', session.user.id)

    if (error) {
      console.error('Error saving profile:', error)
      toast.error('Failed to save profile.')
      setLoading(false)
      return
    }

    setUser({ ...userProfile, created_at: new Date().toISOString() })
    resetOnboarding()
    setLoading(false)
    toast.success('Welcome to OnlyPlans! 🎉')
    router.push('/home')
  }

  return (
    <div className="page-container" style={{ minHeight: '100dvh', overflow: 'hidden', position: 'relative' }}>
      {/* Warm ambient */}
      <div style={{ position: 'absolute', top: -80, right: -60, width: 260, height: 260, borderRadius: '50%', background: 'var(--peach-light)', opacity: 0.5, filter: 'blur(70px)', pointerEvents: 'none', zIndex: -1 }} />
      <div style={{ position: 'absolute', bottom: 80, left: -70, width: 200, height: 200, borderRadius: '50%', background: 'var(--peach-soft)', opacity: 0.3, filter: 'blur(55px)', pointerEvents: 'none', zIndex: -1 }} />

      {/* Progress bar */}
      {step > 0 && (
        <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, height: 3, background: 'var(--border)', zIndex: 100 }}>
          <motion.div animate={{ width: `${progress}%` }} transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{ height: '100%', background: 'linear-gradient(90deg, var(--peach-warm), var(--cta))', borderRadius: '0 2px 2px 0' }} />
        </div>
      )}

      {/* Back button */}
      {step > 0 && (
        <button onClick={goBack} style={{ position: 'fixed', top: 18, left: 18, zIndex: 100, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', boxShadow: '0 1px 6px var(--shadow-soft)' }}>
          <ArrowLeft size={18} />
        </button>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={step}
          initial={{ opacity: 0, x: 36 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -36 }}
          transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', padding: '60px 24px 40px', position: 'relative', zIndex: 10 }}
        >
          {step === 0 && <StepWelcome onNext={goNext} />}
          {step === 1 && <StepAuth onNext={goNext} onboarding={onboarding} setOnboarding={setOnboarding} />}
          {step === 2 && <StepProfile onNext={goNext} onboarding={onboarding} setOnboarding={setOnboarding} />}
          {step === 3 && <StepInterests onNext={goNext} onboarding={onboarding} setOnboarding={setOnboarding} />}
          {step === 4 && <StepPhotos onComplete={completeOnboarding} onboarding={onboarding} setOnboarding={setOnboarding} loading={loading} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/* ── Step 0: Welcome ──────────────────────────────────── */
function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, type: 'spring' }}>
        <div style={{ width: 90, height: 90, borderRadius: 28, background: 'linear-gradient(135deg, var(--peach-light), var(--peach-soft))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, marginBottom: 28, boxShadow: '0 8px 32px rgba(227,154,123,0.3)', marginLeft: 'auto', marginRight: 'auto' }}>
          ⚡
        </div>
      </motion.div>

      <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-0.8px', marginBottom: 10, background: 'linear-gradient(135deg, var(--peach-warm), var(--cta))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
        OnlyPlans
      </motion.h1>

      <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
        style={{ fontSize: 18, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 10, maxWidth: 260 }}>
        Real plans.<br />Real people.<br />Real meetups.
      </motion.p>

      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.38 }}
        style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 56, maxWidth: 260, lineHeight: 1.65 }}>
        Create instant hangouts, join live plans, and meet people near you in under 30 seconds.
      </motion.p>

      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.46 }} style={{ width: '100%', maxWidth: 320 }}>
        <button className="btn-primary" onClick={onNext} style={{ fontSize: 17, padding: 18 }}>
          Get Started <ArrowRight size={18} />
        </button>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 14, textAlign: 'center' }}>
          By continuing you agree to our Terms & Privacy Policy
        </p>
      </motion.div>
    </div>
  )
}

/* ── Step 1: Auth ─────────────────────────────────────── */
function StepAuth({ onNext, onboarding, setOnboarding }: any) {
  const [method, setMethod] = useState<'phone' | 'email'>('phone')
  const [value, setValue] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const sendOtp = async () => {
    if (!value.trim()) return toast.error('Enter your ' + method)
    setLoading(true)

    const { error } = await supabase.auth.signInWithOtp(
      method === 'email' ? { email: value.trim() } : { phone: value.trim() }
    )

    setLoading(false)

    if (error) {
      return toast.error(error.message)
    }

    setOtpSent(true)
    toast.success('OTP sent!')
  }

  const verify = async () => {
    if (!otp.trim() || otp.length < 6) return toast.error('Enter the complete OTP')
    setLoading(true)

    const { error } = await supabase.auth.verifyOtp({
      [method === 'phone' ? 'phone' : 'email']: value.trim(),
      token: otp.trim(),
      type: method === 'phone' ? 'sms' : 'email',
    } as any)

    setLoading(false)

    if (error) {
      return toast.error(error.message || 'Invalid OTP')
    }

    if (method === 'phone') setOnboarding({ phone: value.trim() }); else setOnboarding({ email: value.trim() })
    onNext()
  }

  return (
    <div style={{ flex: 1, paddingTop: 40 }}>
      <h2 style={{ fontSize: 30, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Sign in</h2>
      <p style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 30 }}>We'll send you a one-time code</p>

      {/* Toggle */}
      <div style={{ display: 'flex', background: 'var(--bg-section)', borderRadius: 14, padding: 4, marginBottom: 22, border: '1px solid var(--border)' }}>
        {(['phone', 'email'] as const).map(m => (
          <button key={m} onClick={() => setMethod(m)}
            style={{ flex: 1, padding: '10px 0', borderRadius: 11, background: method === m ? 'var(--bg-secondary)' : 'transparent', border: method === m ? '1px solid var(--border)' : '1px solid transparent', color: method === m ? 'var(--cta)' : 'var(--text-muted)', fontWeight: method === m ? 700 : 500, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: method === m ? '0 1px 4px var(--shadow-soft)' : 'none' }}>
            {m === 'phone' ? <Phone size={14} /> : <Mail size={14} />}
            {m === 'phone' ? 'Phone' : 'Email'}
          </button>
        ))}
      </div>

      <input className="input-field" placeholder={method === 'phone' ? '+91 98765 43210' : 'you@example.com'} value={value} onChange={e => setValue(e.target.value)} type={method === 'phone' ? 'tel' : 'email'} style={{ marginBottom: 12 }} />

      {otpSent && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Enter the code from your email</p>
          <input className="input-field" placeholder="· · · · · ·" value={otp} onChange={e => setOtp(e.target.value.slice(0, 8))} type="number" inputMode="numeric" style={{ marginBottom: 12, letterSpacing: '0.4em', fontSize: 22, textAlign: 'center' }} />
        </motion.div>
      )}

      <button className="btn-primary" onClick={otpSent ? verify : sendOtp} disabled={loading} style={{ marginTop: 8 }}>
        {loading ? 'Please wait…' : otpSent ? 'Verify & Continue' : 'Send OTP'}
        {!loading && <ArrowRight size={17} />}
      </button>
    </div>
  )
}

/* ── Step 2: Profile ──────────────────────────────────── */
function StepProfile({ onNext, onboarding, setOnboarding }: any) {
  const [name, setName] = useState(onboarding.full_name || '')
  const [dob, setDob]   = useState(onboarding.dob || '')
  const [gender, setGender] = useState(onboarding.gender || '')
  const [city, setCity] = useState(onboarding.city || '')
  const [showDatePicker, setShowDatePicker] = useState(false)

  const handleNext = () => {
    if (!name.trim() || !dob || !city.trim()) return toast.error('Please fill in required fields')
    setOnboarding({ full_name: name, dob, gender, city }); onNext()
  }

  return (
    <div style={{ flex: 1, paddingTop: 20 }}>
      <h2 style={{ fontSize: 30, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Your Profile</h2>
      <p style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 28 }}>Tell us a bit about yourself</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Full Name *</label>
          <input className="input-field" placeholder="Arjun Mehta" value={name} onChange={e => setName(e.target.value)} />
        </div>

        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Date of Birth *</label>
          <div 
            className="input-field" 
            style={{ color: dob ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}
            onClick={() => setShowDatePicker(true)}
          >
            {dob ? new Date(dob).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Select your birthday'}
          </div>
        </div>

        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>Gender (optional)</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['Male', 'Female', 'Non-binary', 'Prefer not to say'].map(g => (
              <button key={g} onClick={() => setGender(gender === g ? '' : g)}
                style={{ padding: '8px 16px', borderRadius: 999, background: gender === g ? '#FFFFFF' : 'var(--bg-section)', border: `1.5px solid ${gender === g ? 'var(--now)' : 'var(--border)'}`, color: gender === g ? 'var(--cta)' : 'var(--text-secondary)', fontSize: 13, fontWeight: gender === g ? 700 : 500, cursor: 'pointer' }}>
                {g}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>City *</label>
          <div style={{ position: 'relative' }}>
            <MapPin size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--cta)' }} />
            <input className="input-field" placeholder="Mumbai" value={city} onChange={e => setCity(e.target.value)} style={{ paddingLeft: 40 }} />
          </div>
        </div>
      </div>

      <button className="btn-primary" onClick={handleNext} style={{ marginTop: 32 }}>
        Continue <ArrowRight size={17} />
      </button>

      <AnimatePresence>
        {showDatePicker && (
          <IOSDatePicker 
            value={dob} 
            onChange={(val) => setDob(val)} 
            onClose={() => setShowDatePicker(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Step 3: Interests ────────────────────────────────── */
function StepInterests({ onNext, onboarding, setOnboarding }: any) {
  const [selected, setSelected] = useState<string[]>(onboarding.interests || [])

  const toggle = (i: string) => setSelected(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])

  const handleNext = () => {
    if (selected.length < 3) return toast.error('Select at least 3 interests')
    setOnboarding({ interests: selected }); onNext()
  }

  return (
    <div style={{ flex: 1, paddingTop: 10 }}>
      <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Your Interests</h2>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>
        Pick 3+ · <span style={{ color: 'var(--cta)', fontWeight: 600 }}>{selected.length} selected</span>
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 32 }}>
        {Object.entries(INTERESTS).map(([category, items]) => (
          <div key={category}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>{category}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {items.map(item => {
                const isSelected = selected.includes(item)
                return (
                  <motion.button key={item} whileTap={{ scale: 0.93 }} onClick={() => toggle(item)}
                    className={`interest-chip${isSelected ? ' selected' : ''}`}>
                    {isSelected && <Check size={11} />}
                    {item}
                  </motion.button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <button className="btn-primary" onClick={handleNext}>
        Continue <ArrowRight size={17} />
      </button>
    </div>
  )
}

/* ── Step 4: Photos ───────────────────────────────────── */

function StepPhotos({ onComplete, loading }: any) {
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    
    const selectedFiles = Array.from(e.target.files)
    if (files.length + selectedFiles.length > 6) {
      toast.error('Max 6 photos allowed')
      return
    }

    const newFiles = [...files, ...selectedFiles]
    const newPreviews = [...previews, ...selectedFiles.map(f => URL.createObjectURL(f))]
    
    setFiles(newFiles)
    setPreviews(newPreviews)
  }

  const removePhoto = (index: number) => {
    const newFiles = [...files]
    const newPreviews = [...previews]
    
    newFiles.splice(index, 1)
    newPreviews.splice(index, 1)
    
    setFiles(newFiles)
    setPreviews(newPreviews)
  }

  return (
    <div style={{ flex: 1, paddingTop: 10 }}>
      <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Add Photos</h2>
      <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 4 }}>
        Min 2, max 6 · <span style={{ color: 'var(--cta)', fontWeight: 600 }}>{files.length}/6</span>
      </p>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 22 }}>Upload real photos from your device</p>

      {/* Selected photos */}
      {previews.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 22 }}>
          {previews.map((src, i) => (
            <motion.div key={src} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              style={{ position: 'relative', aspectRatio: '1', borderRadius: 14, overflow: 'hidden', border: '2.5px solid var(--cta)' }}>
              <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button onClick={() => removePhoto(i)} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                <Trash2 size={12} />
              </button>
              <div style={{ position: 'absolute', bottom: 5, right: 5, background: 'var(--cta)', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#FFFFFF' }}>{i + 1}</div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {files.length < 6 && (
        <div style={{ marginBottom: 28 }}>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*,.heic,.heif,image/heic,image/heif" 
            multiple 
            style={{ display: 'none' }} 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            style={{ width: '100%', padding: '30px 20px', borderRadius: 18, border: '2px dashed var(--cta)', background: 'rgba(232,90,79,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', color: 'var(--cta)' }}
          >
            <ImagePlus size={32} />
            <span style={{ fontSize: 14, fontWeight: 700 }}>Tap to select photos</span>
          </button>
        </div>
      )}

      <button className="btn-primary" onClick={() => onComplete(files)} disabled={files.length < 2 || loading}>
        {loading ? 'Uploading your photos…' : files.length < 2 ? `Select ${2 - files.length} more photo${files.length === 1 ? '' : 's'}` : '🚀 Launch OnlyPlans'}
      </button>
    </div>
  )
}
