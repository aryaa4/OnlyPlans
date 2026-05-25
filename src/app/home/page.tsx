'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, MapPin, Bell, Compass, ArrowRight } from 'lucide-react'
import BottomNav from '@/components/BottomNav'
import VibeFeedCard from '@/components/VibeFeedCard'
import ChatPanel from '@/components/ChatPanel'
import { useAppStore } from '@/store/useAppStore'
import { supabase } from '@/lib/supabase'
import type { Vibe, Conversation } from '@/types'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

type FeedTab = 'LIVE NOW' | 'TRENDING' | 'CIRCLE'

export default function HomePage() {
  const { user } = useAppStore()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<FeedTab>('LIVE NOW')
  const [vibes, setVibes] = useState<Vibe[]>([])
  const [loading, setLoading] = useState(true)
  
  const [chatConversation, setChatConversation] = useState<Conversation | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && user) {
      fetchVibes()
    }
  }, [mounted, user, activeTab])

  const fetchVibes = async () => {
    if (!user) return
    setLoading(true)

    // Base query for active vibes
    let query = supabase
      .from('vibes')
      .select('*, user:user_id(*)')
      .gt('expires_at', new Date().toISOString())

    // If "CIRCLE", filter by followed users
    if (activeTab === 'CIRCLE') {
      const { data: follows } = await supabase.from('connections').select('following_id').eq('follower_id', user.id)
      const followedIds = follows?.map(f => f.following_id) || []
      if (followedIds.length > 0) {
        query = query.in('user_id', followedIds)
      } else {
        // No circle, no vibes
        setVibes([])
        setLoading(false)
        return
      }
    }

    const { data: vibesData } = await query

    if (vibesData) {
      // Fetch joined counts for each vibe
      const withCounts = await Promise.all(vibesData.map(async (v: Vibe) => {
        const { count } = await supabase
          .from('conversations')
          .select('id', { count: 'exact', head: true })
          .eq('vibe_context_id', v.id)
        
        return { ...v, joined_count: count || 0 }
      }))

      // Sorting logic
      let sorted = [...withCounts]
      if (activeTab === 'LIVE NOW') {
        // Soonest expiry first
        sorted.sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime())
      } else if (activeTab === 'TRENDING') {
        // Highest joined count first
        sorted.sort((a, b) => (b.joined_count || 0) - (a.joined_count || 0))
      }

      setVibes(sorted as Vibe[])
    }
    setLoading(false)
  }

  const handleJoinVibe = async (vibe: Vibe) => {
    if (!user) return
    const other_user_id = vibe.user_id
    
    // You can't join your own vibe, but for testing we'll allow it or skip the check.
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

  const filteredVibes = vibes.filter(v => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return v.prompt.toLowerCase().includes(q) || v.answer.toLowerCase().includes(q) || v.location?.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="page-container" style={{ background: '#FFF7F2' }}>
      
      {/* Header */}
      <div style={{ padding: '54px 20px 10px', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={18} color="var(--cta)" />
            <h1 style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.4px', margin: 0, color: 'var(--text-primary)' }}>
              Mumbai
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <motion.button whileTap={{ scale: 0.88 }} onClick={() => setShowSearch(s => !s)}
              style={{ width: 38, height: 38, borderRadius: '50%', background: showSearch ? '#FFFFFF' : 'var(--bg-secondary)', border: `1px solid ${showSearch ? 'var(--now)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: showSearch ? 'var(--cta)' : 'var(--text-muted)', boxShadow: '0 1px 6px var(--shadow-soft)' }}>
              <Search size={17} />
            </motion.button>
            <motion.button whileTap={{ scale: 0.88 }}
              style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--bg-secondary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', boxShadow: '0 1px 6px var(--shadow-soft)', position: 'relative' }}>
              <Bell size={17} />
              <div style={{ position: 'absolute', top: 8, right: 9, width: 7, height: 7, borderRadius: '50%', background: 'var(--cta)', border: '1.5px solid var(--bg-primary)' }} />
            </motion.button>
          </div>
        </div>

        {/* Search */}
        <AnimatePresence>
          {showSearch && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input className="input-field" placeholder="Search vibes…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} autoFocus style={{ paddingLeft: 40 }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <div className="hide-scrollbar" style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 10, margin: '0 -20px', paddingLeft: 20, paddingRight: 20 }}>
          {(['LIVE NOW', 'TRENDING', 'CIRCLE'] as FeedTab[]).map(tab => {
            const isActive = activeTab === tab
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 99,
                  background: isActive ? 'var(--text-primary)' : '#FFFFFF',
                  color: isActive ? '#FFFFFF' : 'var(--text-muted)',
                  border: `1px solid ${isActive ? 'var(--text-primary)' : 'var(--border)'}`,
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                  boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                {tab === 'LIVE NOW' && isActive && <span style={{ color: 'var(--cta)', marginRight: 6 }}>●</span>}
                {tab}
              </button>
            )
          })}
        </div>
      </div>

      {/* Feed */}
      <div style={{ padding: '10px 16px 120px', position: 'relative', zIndex: 10 }}>
        {loading ? (
          <div style={{ textAlign: 'center', marginTop: 40, color: 'var(--text-muted)' }}>Loading vibes...</div>
        ) : filteredVibes.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>No vibes right now</h3>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '0 0 24px 0' }}>Be the catalyst. Start something.</p>
            <button onClick={() => router.push('/profile')} style={{ background: 'var(--cta)', color: '#FFFFFF', border: 'none', padding: '14px 28px', borderRadius: 99, fontSize: 15, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 24px rgba(232,90,79,0.3)', cursor: 'pointer' }}>
              Create Vibe <ArrowRight size={18} />
            </button>
          </motion.div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filteredVibes.map((vibe, i) => (
              <VibeFeedCard key={vibe.id} vibe={vibe} onJoin={handleJoinVibe} index={i} />
            ))}
            
            {/* Explore Footer Card */}
            {activeTab === 'LIVE NOW' && (
              <div style={{ textAlign: 'center', padding: '40px 20px', background: '#FFFFFF', borderRadius: 24, border: '1px dashed var(--border)', marginTop: 20 }}>
                <Compass size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
                <h4 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>End of nearby vibes</h4>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px 0' }}>Expand your radius or explore other areas.</p>
                <button style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '10px 20px', borderRadius: 99, fontSize: 13, fontWeight: 700 }}>
                  Explore Area
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNav />

      {/* Modals */}
      <AnimatePresence>
        {chatConversation && <ChatPanel conversation={chatConversation} onClose={() => setChatConversation(null)} />}
      </AnimatePresence>
    </div>
  )
}
