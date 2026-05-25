'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LocateFixed } from 'lucide-react'
import dynamic from 'next/dynamic'
import BottomNav from '@/components/BottomNav'
import VibeFeedCard from '@/components/VibeFeedCard'
import ChatPanel from '@/components/ChatPanel'
import { useAppStore } from '@/store/useAppStore'
import { supabase } from '@/lib/supabase'
import type { Vibe, Conversation } from '@/types'
import toast from 'react-hot-toast'

// Dynamically import the Map to avoid SSR issues with Leaflet
const ExploreMap = dynamic(() => import('@/components/ExploreMap'), {
  ssr: false,
  loading: () => <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#E8E6E1' }}>Loading Map...</div>
})

export default function ExplorePage() {
  const { user } = useAppStore()
  const [mounted, setMounted] = useState(false)
  const [vibes, setVibes] = useState<Vibe[]>([])
  const [filter, setFilter] = useState<'ALL' | 'LIVE' | 'SOON' | 'COLLAB'>('ALL')
  const [selectedVibe, setSelectedVibe] = useState<Vibe | null>(null)
  const [chatConversation, setChatConversation] = useState<Conversation | null>(null)
  
  // Map state
  const [center, setCenter] = useState({ lat: 19.0760, lng: 72.8777 }) // Default Mumbai
  const [zoom, setZoom] = useState(13)

  const fetchVibes = async () => {
    const { data } = await supabase
      .from('vibes')
      .select('*, user:user_id(*)')
      .gt('expires_at', new Date().toISOString())
      
    if (data) setVibes(data as Vibe[])
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
    fetchVibes()
    
    // Attempt to get user's real location on mount
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.log('Geolocation error:', err),
        { enableHighAccuracy: true }
      )
    }

    // Setup realtime subscription
    const channel = supabase.channel('explore-vibes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vibes' }, (payload) => {
        fetchVibes()
      })
      .subscribe()

    // Cleanup
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleCenterOnMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude })
          setZoom(15)
        },
        () => toast.error('Location access denied')
      )
    } else {
      toast.error('Geolocation not supported by your browser')
    }
  }

  const handleJoinVibe = async (vibe: Vibe) => {
    if (!user) return
    const other_user_id = vibe.user_id
    
    if (other_user_id === user.id) {
      toast("You can't join your own vibe!", { icon: '🤔' })
      return
    }

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
      setChatConversation({ ...conv, other_user })
    }
  }

  if (!mounted) return null

  const filteredVibes = vibes.filter(v => filter === 'ALL' || v.type === filter.toLowerCase())

  return (
    <div className="page-container" style={{ background: '#FFF7F2', position: 'relative' }}>
      
      {/* Map Layer */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <ExploreMap 
          vibes={filteredVibes}
          center={center}
          zoom={zoom}
          selectedVibe={selectedVibe}
          onMarkerClick={setSelectedVibe}
          onMapClick={() => setSelectedVibe(null)}
        />
      </div>

      {/* Floating UI Overlays */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none', display: 'flex', flexDirection: 'column' }}>
        
        {/* Top Filters */}
        <div style={{ padding: '64px 20px 20px', pointerEvents: 'auto', display: 'flex', gap: 10, overflowX: 'auto' }} className="hide-scrollbar">
          {(['ALL', 'LIVE', 'SOON', 'COLLAB'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '8px 16px',
                borderRadius: 99,
                background: filter === f ? 'var(--text-primary)' : '#FFFFFF',
                color: filter === f ? '#FFFFFF' : 'var(--text-primary)',
                fontSize: 12, fontWeight: 800, border: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                cursor: 'pointer', whiteSpace: 'nowrap'
              }}
            >
              {f === 'LIVE' && filter === f && <span style={{ color: 'var(--cta)', marginRight: 6 }}>●</span>}
              {f}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Center on Me FAB */}
        {!selectedVibe && (
          <div style={{ alignSelf: 'flex-end', padding: '0 20px 100px', pointerEvents: 'auto' }}>
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={handleCenterOnMe}
              style={{ width: 48, height: 48, borderRadius: '50%', background: '#FFF', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', cursor: 'pointer' }}
            >
              <LocateFixed size={20} />
            </motion.button>
          </div>
        )}

        {/* Selected Vibe Bottom Card */}
        <AnimatePresence>
          {selectedVibe && !chatConversation && (
            <motion.div 
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{ padding: '0 16px 120px', pointerEvents: 'auto' }}
            >
              <VibeFeedCard vibe={selectedVibe} onJoin={handleJoinVibe} index={0} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ position: 'relative', zIndex: 20 }}>
        <BottomNav />
      </div>

      <AnimatePresence>
        {chatConversation && <ChatPanel conversation={chatConversation} onClose={() => setChatConversation(null)} />}
      </AnimatePresence>
    </div>
  )
}
