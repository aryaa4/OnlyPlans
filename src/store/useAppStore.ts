import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Plan, OnboardingState } from '@/types'
import { supabase } from '@/lib/supabase'

export interface AppStore {
  // Auth
  user: User | null
  setUser: (user: User | null) => void

  // Onboarding
  onboarding: OnboardingState
  setOnboarding: (state: Partial<OnboardingState>) => void
  resetOnboarding: () => void

  // Plans
  plans: Plan[]
  setPlans: (plans: Plan[]) => void
  addPlan: (plan: Plan) => void
  updatePlan: (id: string, updates: Partial<Plan>) => void

  // Active mode
  activeMode: 'NOW' | 'SOON' | 'COLLAB'
  setActiveMode: (mode: 'NOW' | 'SOON' | 'COLLAB') => void

  // Active plan for chat
  activePlanId: string | null
  setActivePlanId: (id: string | null) => void

  // Async Actions
  fetchUser: () => Promise<void>
  fetchPlans: () => Promise<void>
}

const defaultOnboarding: OnboardingState = {
  step: 0,
  interests: [],
  photos: [],
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),

      onboarding: defaultOnboarding,
      setOnboarding: (state) =>
        set((prev) => ({ onboarding: { ...prev.onboarding, ...state } })),
      resetOnboarding: () => set({ onboarding: defaultOnboarding }),

      plans: [],
      setPlans: (plans) => set({ plans }),
      addPlan: (plan) => set((prev) => ({ plans: [plan, ...prev.plans] })),
      updatePlan: (id, updates) =>
        set((prev) => ({
          plans: prev.plans.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),

      activeMode: 'NOW',
      setActiveMode: (mode) => set({ activeMode: mode }),

      activePlanId: null,
      setActivePlanId: (id) => set({ activePlanId: id }),

      fetchUser: async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          set({ user: null })
          return
        }
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (userData) {
          set({ user: userData as User })
        }
      },

      fetchPlans: async () => {
        const { data: plansData } = await supabase
          .from('plans')
          .select('*, creator:creator_id(*), participants:plan_participants(user_id)')
          .order('created_at', { ascending: false })

        if (plansData) {
          // Map backend data to match frontend types
          const currentUser = set?.name ? null : null // hack to ignore set.name
          const currentUserId = (useAppStore.getState().user as User | null)?.id
          const formattedPlans = plansData.map(p => ({
            ...p,
            joined_count: p.participants?.length || 0,
            has_joined: p.participants?.some((part: { user_id: string }) => part.user_id === currentUserId) || false
          })) as Plan[]
          set({ plans: formattedPlans })
        }
      },
    }),
    {
      name: 'onlyplans-store',
      version: 1,
      partialize: (state) => ({ user: state.user, onboarding: state.onboarding }),
      migrate: (persistedState, version) => {
        // If store version changes, reset to defaults (clears corrupt/stale state)
        if (version < 1) {
          return { user: null, onboarding: defaultOnboarding }
        }
        return persistedState as AppStore
      },
    }
  )
)
