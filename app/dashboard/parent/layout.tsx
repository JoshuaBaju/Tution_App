"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  Suspense,
  type ReactNode
} from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import DashboardShell, { type NavItem } from '@/components/dashboard/DashboardShell'

// ---------------------------------------------------------------------------
// 🏛️ Shared tab identity — single source of truth for the whole Parent view
// ---------------------------------------------------------------------------
export type TabID = 'home' | 'children' | 'book' | 'chat' | 'billing' | 'profile'

export const NAV_ITEMS: NavItem<TabID>[] = [
  { id: 'home', label: 'Home Overview', icon: '🏠' },
  { id: 'children', label: 'Manage Children', icon: '🧒' },
  { id: 'book', label: 'Book Tutors', icon: '🔍' },
  { id: 'chat', label: 'Messages Hub', icon: '💬' },
  { id: 'billing', label: 'Billing & Invoices', icon: '💳' },
  { id: 'profile', label: 'Profile Settings', icon: '⚙️', hideMobile: true }
]

interface ParentContextValue {
  parentId: string
  parentName: string
  activeTab: TabID
  handleTabChange: (tab: TabID) => void
}

const ParentContext = createContext<ParentContextValue | null>(null)

export function useParent() {
  const ctx = useContext(ParentContext)
  if (!ctx) {
    throw new Error('useParent() must be called from within ParentDashboardLayout')
  }
  return ctx
}

// ---------------------------------------------------------------------------
// 🎯 Layout content — auth guard, profile fetch, context + shell
// ---------------------------------------------------------------------------
function ParentDashboardLayoutContent({ children }: { children: ReactNode }) {
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<TabID>('home')
  const [parentId, setParentId] = useState<string>('')
  const [parentName, setParentName] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // 🎯 Direct state handler (simple & fast like Teacher layout)
  const handleTabChange = (tab: TabID) => {
    setActiveTab(tab)
  }

  // 🔐 Session & profile guarding
  useEffect(() => {
    async function checkSecuritySession() {
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      if (authError || !session?.user) return router.push('/login')

      const { data: profile, error: dbError } = await supabase
        .from('parents')
        .select('id, name')
        .eq('id', session.user.id)
        .maybeSingle()

      if (dbError || !profile) return router.push('/login')

      setParentId(profile.id)
      setParentName(profile.name || 'Parent')
      setLoading(false)
    }
    checkSecuritySession()
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="w-screen h-screen bg-[#1A2D48] flex items-center justify-center">
        <span className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <ParentContext.Provider value={{ parentId, parentName, activeTab, handleTabChange }}>
      <DashboardShell<TabID>
        userDisplayName={parentName}
        userId={parentId}
        userSubtext={
          parentId ? (
            <p className="text-[10px] font-mono text-slate-300 truncate">
              ID: {parentId.slice(0, 8)}...
            </p>
          ) : undefined
        }
        navItems={NAV_ITEMS}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onSignOut={handleSignOut}
        onProfileClick={() => handleTabChange('profile')}
      >
        {children}
      </DashboardShell>
    </ParentContext.Provider>
  )
}

// 📦 Safe Export Root Wrapped in a Next.js Client Suspense Boundary Container
export default function ParentDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="w-screen h-screen bg-[#1A2D48] flex items-center justify-center">
          <span className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ParentDashboardLayoutContent>{children}</ParentDashboardLayoutContent>
    </Suspense>
  )
}