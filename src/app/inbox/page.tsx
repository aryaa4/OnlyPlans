'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import BottomNav from '@/components/BottomNav'
import { useAppStore } from '@/store/useAppStore'
import { supabase } from '@/lib/supabase'
import type { User, Conversation } from '@/types'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import ChatPanel from '@/components/ChatPanel'

type InboxItem = Conversation & {
  other_user: User
  last_message?: { content: string, created_at: string }
}

export default function InboxPage() {
  const { user, activeMode } = useAppStore()
  const router = useRouter()
  const [conversations, setConversations] = useState<InboxItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !user) {
      router.push('/onboarding')
    } else if (mounted && user) {
      fetchConversations()
    }
  }, [user, mounted, router])

  const fetchConversations = async () => {
    if (!user) return

    const { data: convData } = await supabase
      .from('conversations')
      .select('*, user1:user1_id(*), user2:user2_id(*)')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (convData) {
      const withMessages = await Promise.all(convData.map(async (c: Conversation & { user1: User, user2: User }) => {
        const other_user = c.user1_id === user.id ? c.user2 : c.user1
        const { data: messages } = await supabase
          .from('messages')
          .select('content, created_at')
          .eq('conversation_id', c.id)
          .order('created_at', { ascending: false })
          .limit(1)
        
        return {
          ...c,
          other_user,
          last_message: messages && messages.length > 0 ? messages[0] : null
        }
      }))

      setConversations(withMessages as InboxItem[])
    }
    setLoading(false)
  }

  if (!mounted || !user) return null

  return (
    <div className="page-container" style={{ background: '#FFF7F2' }}>
      <div style={{ padding: '54px 20px 20px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.4px', margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
          Inbox
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>
          Your real-time connections
        </p>
      </div>

      <div style={{ padding: '0 16px 120px' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 40 }}>Loading...</p>
        ) : conversations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>No messages yet</h3>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>Join a Live Vibe to start a conversation!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {conversations.map((conv, i) => (
              <motion.button
                key={conv.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveConversation(conv)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  background: '#FFFFFF', padding: '16px', borderRadius: 20,
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                  width: '100%'
                }}
              >
                <img 
                  src={conv.other_user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(conv.other_user.full_name)}&background=E85A4F&color=fff`} 
                  alt="" 
                  style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover' }} 
                />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <h4 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {conv.other_user.full_name}
                    </h4>
                    {conv.last_message && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>
                        {format(new Date(conv.last_message.created_at), 'MMM d, h:mm a')}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 14, color: conv.last_message ? 'var(--text-secondary)' : 'var(--text-muted)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: conv.last_message ? 500 : 400 }}>
                    {conv.last_message ? conv.last_message.content : 'No messages yet...'}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      <BottomNav activeMode={activeMode} />

      <AnimatePresence>
        {activeConversation && (
          <ChatPanel 
            conversation={activeConversation} 
            onClose={() => { setActiveConversation(null); fetchConversations() }} 
          />
        )}
      </AnimatePresence>
    </div>
  )
}
