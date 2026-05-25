'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, MessageCircle, BarChart2 } from 'lucide-react'
import type { Plan, Message, Conversation, User, Vibe } from '@/types'
import { format } from 'date-fns'
import { useAppStore, type AppStore } from '@/store/useAppStore'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface ChatPanelProps {
  plan?: Plan
  conversation?: Conversation & { other_user?: User }
  onClose: () => void
}

export default function ChatPanel({ plan, conversation, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [vibeContext, setVibeContext] = useState<Vibe | null>(null)
  
  // Kept polling states for group chats later
  const [showPollForm, setShowPollForm] = useState(false)
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState(['', ''])
  const [votedPolls, setVotedPolls] = useState<Record<string, string>>({})
  
  const bottomRef = useRef<HTMLDivElement>(null)
  const user = useAppStore((s: AppStore) => s.user)
  const setUser = useAppStore((s: AppStore) => s.setUser)
  const myUserId = user?.id || 'me'

  // Trust System states
  const [showMeetPrompt, setShowMeetPrompt] = useState(false)
  const [hasRespondedToMeetup, setHasRespondedToMeetup] = useState(false)

  async function fetchMessages() {
    const query = supabase.from('messages').select('*, user:user_id(*)').order('created_at', { ascending: true })
    if (conversation) query.eq('conversation_id', conversation.id)
    else if (plan) query.eq('plan_id', plan.id)
    
    const { data } = await query
    if (data) setMessages(data as Message[])
  }

  useEffect(() => {
    fetchMessages()
    
    // Subscribe to realtime messages
    const roomKey = conversation ? `conversation_id=eq.${conversation.id}` : `plan_id=eq.${plan?.id}`
    const channel = supabase.channel(`public:messages:${roomKey}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: roomKey }, (payload) => {
        fetchMessages() // Or append payload.new
      })
      .subscribe()

    // Fetch vibe context if this is a DM about a vibe
    if (conversation?.vibe_context_id) {
      supabase.from('vibes').select('*').eq('id', conversation.vibe_context_id).single().then(({ data }) => {
        if (data) setVibeContext(data as Vibe)
      })
    }

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversation, plan])

  useEffect(() => {
    if (conversation && messages.length >= 4 && !hasRespondedToMeetup && user) {
      // Check if already responded
      supabase.from('meetups').select('id').eq('conversation_id', conversation.id).eq('reporter_id', user.id).then(({ data }) => {
        if (data && data.length > 0) {
          setHasRespondedToMeetup(true)
        } else {
          setShowMeetPrompt(true)
        }
      })
    }
  }, [messages.length, conversation, hasRespondedToMeetup, user])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || !user) return
    const newMsg = {
      user_id: user.id,
      content: input,
      type: 'text' as const,
      conversation_id: conversation?.id,
      plan_id: plan?.id
    }
    
    setInput('')
    // Optimistic UI
    setMessages(prev => [...prev, { id: 'temp', ...newMsg, user, created_at: new Date().toISOString() } as Message])
    
    await supabase.from('messages').insert(newMsg)
  }

  const handleMeetupResponse = async (didMeet: boolean) => {
    if (!user || !conversation) return
    setShowMeetPrompt(false)
    setHasRespondedToMeetup(true)
    
    await supabase.from('meetups').insert({
      reporter_id: user.id,
      met_user_id: conversation.other_user?.id,
      conversation_id: conversation.id,
      did_meet: didMeet
    })
    
    if (didMeet) {
      toast.success('Awesome! Your trust score increased. 🌟')
      const newCount = (user.meetup_count || 0) + 1
      setUser({ ...user, meetup_count: newCount, trust_status: newCount >= 5 ? 'Highly Trusted' : 'Trusted' })
      
      await supabase.from('users').update({ 
        meetup_count: newCount,
        trust_status: newCount >= 5 ? 'Highly Trusted' : 'Trusted'
      }).eq('id', user.id)
      
      if (conversation.other_user) {
        const otherCount = (conversation.other_user.meetup_count || 0) + 1
        await supabase.from('users').update({ 
          meetup_count: otherCount,
          trust_status: otherCount >= 5 ? 'Highly Trusted' : 'Trusted'
        }).eq('id', conversation.other_user.id)
      }
    }
  }

  // Poll logic omitted for brevity, kept structure
  const sendPoll = () => {}
  const votePoll = (msgId: string, optId: string) => {}

  return (
    <motion.div
      initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 32 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'var(--bg-primary)',
        display: 'flex', flexDirection: 'column',
        maxWidth: 430, left: '50%', transform: 'translateX(-50%)',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '52px 20px 14px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
      }}>
        <button onClick={onClose} style={{ background: 'var(--bg-section)', border: '1px solid var(--border)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
          <X size={18} />
        </button>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {conversation ? conversation.other_user?.full_name : plan?.title}
          </h2>
          {vibeContext ? (
            <p style={{ fontSize: 11, color: 'var(--cta)', margin: 0, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Replying to Live Vibe: {vibeContext.answer}
            </p>
          ) : (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              {conversation ? 'Direct Message' : `${plan?.joined_count} members · Group chat`}
            </p>
          )}
        </div>
        <div style={{ background: '#FFFFFF', border: '1px solid #EAE7DC', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <MessageCircle size={16} style={{ color: 'var(--cta)' }} />
        </div>
      </div>

      {/* Trust & Safety Prompt */}
      <AnimatePresence>
        {showMeetPrompt && conversation && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div style={{ background: 'var(--peach-light)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Did you meet {conversation.other_user?.full_name}?
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => handleMeetupResponse(false)} style={{ padding: '6px 14px', borderRadius: 99, border: '1px solid var(--border)', background: '#FFF', fontSize: 12, fontWeight: 700, cursor: 'pointer', color: 'var(--text-muted)' }}>No</button>
                <button onClick={() => handleMeetupResponse(true)} style={{ padding: '6px 14px', borderRadius: 99, border: 'none', background: 'var(--cta)', color: '#FFF', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(232,90,79,0.3)' }}>Yes</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.map(msg => {
            const isMe = msg.user_id === myUserId
            return (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
                {!isMe && <img src={msg.user.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />}
                <div style={{ maxWidth: '78%' }}>
                  {!isMe && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3, paddingLeft: 4, fontWeight: 600 }}>{msg.user.full_name}</p>}

                  {msg.type === 'poll' && msg.poll ? (
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 14, minWidth: 220, boxShadow: '0 2px 10px var(--shadow-soft)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                        <BarChart2 size={13} style={{ color: 'var(--soon)' }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{msg.poll.question}</span>
                      </div>
                      {msg.poll.options.map(opt => {
                        const total = msg.poll!.options.reduce((s, o) => s + o.votes, 0)
                        const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0
                        const hasVoted = !!votedPolls[msg.id]
                        const myVote = votedPolls[msg.id] === opt.id
                        return (
                          <button key={opt.id} onClick={() => votePoll(msg.id, opt.id)} disabled={hasVoted}
                            style={{ position: 'relative', background: myVote ? '#FFFFFF' : 'var(--bg-section)', border: `1px solid ${myVote ? 'var(--now)' : 'var(--border)'}`, borderRadius: 10, padding: '9px 12px', cursor: hasVoted ? 'default' : 'pointer', overflow: 'hidden', textAlign: 'left', width: '100%', marginBottom: 6 }}>
                            {hasVoted && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: myVote ? 'rgba(232,90,79,0.1)' : 'rgba(163,144,128,0.08)', transition: 'width 0.5s ease' }} />}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                              <span style={{ fontSize: 13, color: myVote ? 'var(--cta)' : 'var(--text-primary)', fontWeight: myVote ? 700 : 500 }}>{opt.text}</span>
                              {hasVoted && <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{pct}%</span>}
                            </div>
                          </button>
                        )
                      })}
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
                        {msg.poll.options.reduce((s, o) => s + o.votes, 0)} votes
                      </p>
                    </div>
                  ) : (
                    <div style={{
                      background: isMe ? 'var(--cta)' : 'var(--bg-secondary)',
                      border: isMe ? 'none' : '1px solid var(--border)',
                      borderRadius: isMe ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                      padding: '10px 14px',
                      color: isMe ? '#FFFFFF' : 'var(--text-primary)',
                      fontSize: 14, lineHeight: 1.45,
                      boxShadow: '0 1px 6px var(--shadow-soft)',
                    }}>
                      {msg.content}
                    </div>
                  )}
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, textAlign: isMe ? 'right' : 'left', padding: isMe ? '0 4px 0 0' : '0 0 0 4px' }}>
                    {format(new Date(msg.created_at), 'h:mm a')}
                  </p>
                </div>
              </motion.div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Poll form */}
      <AnimatePresence>
        {showPollForm && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', padding: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>Create Poll</p>
            <input className="input-field" placeholder="Poll question..." value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} style={{ marginBottom: 8, fontSize: 14, padding: '11px 14px' }} />
            {pollOptions.map((opt, i) => (
              <input key={i} className="input-field" placeholder={`Option ${i + 1}`} value={opt} onChange={e => setPollOptions(prev => prev.map((o, j) => j === i ? e.target.value : o))} style={{ marginBottom: 6, fontSize: 14, padding: '11px 14px' }} />
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={() => setPollOptions(prev => [...prev, ''])} style={{ flex: 1, background: 'none', border: '1px dashed var(--border)', borderRadius: 10, padding: '8px 14px', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>
                + Add option
              </button>
              <button onClick={sendPoll} style={{ background: 'var(--soon)', border: 'none', borderRadius: 10, padding: '8px 18px', color: '#3E362E', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Post Poll
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div style={{ display: 'flex', gap: 10, padding: '12px 16px 28px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', alignItems: 'flex-end' }}>
        <button
          onClick={() => setShowPollForm(!showPollForm)}
          style={{ width: 40, height: 40, borderRadius: '50%', background: showPollForm ? '#FFFFFF' : 'var(--bg-section)', border: `1px solid ${showPollForm ? 'var(--soon)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, color: showPollForm ? 'var(--soon)' : 'var(--text-muted)' }}
        >
          <BarChart2 size={16} />
        </button>
        <input className="input-field" placeholder="Message..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} style={{ flex: 1, padding: '11px 15px', fontSize: 15 }} />
        <motion.button whileTap={{ scale: 0.9 }} onClick={sendMessage}
          style={{ width: 40, height: 40, borderRadius: '50%', background: input.trim() ? 'var(--cta)' : 'var(--bg-section)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, color: input.trim() ? '#FFFFFF' : 'var(--text-muted)', transition: 'all 0.18s ease', boxShadow: input.trim() ? '0 3px 10px rgba(232,90,79,0.3)' : 'none' }}>
          <Send size={16} />
        </motion.button>
      </div>
    </motion.div>
  )
}
