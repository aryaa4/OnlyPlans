export type PlanMode = 'NOW' | 'SOON' | 'COLLAB'

export type CollabCategory =
  | 'Content creation'
  | 'Photography'
  | 'Videography'
  | 'Fitness partners'
  | 'Startup / coding'
  | 'Influencer collabs'

export interface Vibe {
  id: string
  user_id: string
  user: User
  prompt: string
  answer: string
  type: 'live' | 'plan' | 'collab'
  location?: string
  lat?: number
  lng?: number
  expires_at: string
  created_at: string
  joined_count?: number
  has_joined?: boolean
}

export interface User {
  id: string
  full_name: string
  username: string
  avatar_url?: string
  photos: string[]
  interests: string[]
  city: string
  dob: string
  gender?: string
  vibes?: Vibe[]
  is_verified: boolean
  is_free_now: boolean
  meetup_count?: number
  trust_status?: string
  created_at: string
}

export interface Plan {
  id: string
  creator_id: string
  creator: User
  mode: PlanMode
  title: string
  description?: string
  location: string
  lat?: number
  lng?: number
  starts_at: string
  ends_at?: string
  max_people?: number
  joined_count: number
  tags: string[]
  collab_category?: CollabCategory
  is_active: boolean
  created_at: string
  has_joined?: boolean
}

export interface Message {
  id: string
  conversation_id?: string
  plan_id?: string
  user_id: string
  user: User
  content: string
  type: 'text' | 'poll'
  poll?: Poll
  created_at: string
}

export interface Poll {
  id: string
  question: string
  options: PollOption[]
  created_by: string
  created_at: string
}

export interface PollOption {
  id: string
  text: string
  votes: number
  voted_by: string[]
}

export interface OnboardingState {
  step: number
  phone?: string
  email?: string
  full_name?: string
  dob?: string
  gender?: string
  city?: string
  interests: string[]
  photos: string[]
  selfie_url?: string
}

export interface Connection {
  follower_id: string
  following_id: string
  created_at: string
}

export interface Conversation {
  id: string
  user1_id: string
  user2_id: string
  vibe_context_id?: string
  created_at: string
}

export interface Meetup {
  id: string
  reporter_id: string
  met_user_id: string
  conversation_id: string
  did_meet: boolean
  created_at: string
}

export interface Report {
  id: string
  reporter_id: string
  reported_id: string
  reason: string
  status: string
  created_at: string
}

export interface Block {
  id: string
  blocker_id: string
  blocked_id: string
  created_at: string
}
