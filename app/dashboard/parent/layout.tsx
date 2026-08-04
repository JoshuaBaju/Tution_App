"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  Suspense,
  type ReactNode
} from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import DashboardShell, { type NavItem } from '@/components/dashboard/DashboardShell'

// ---------------------------------------------------------------------------
// 🏛️ Shared Tab Identity
// ---------------------------------------------------------------------------
export type TabID = 'home' | 'children' | 'book' | 'chat' | 'profile' | 'billing'

const VALID_TABS: TabID[] = ['home', 'children', 'book', 'chat', 'profile', 'billing']

export const NAV_ITEMS: NavItem<TabID>[] = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'children', label: 'Children', icon: '🧒' },
  { id: 'book', label: 'Book Tutor', icon: '🔍' },
  { id: 'chat', label: 'Messages', icon: '💬' },
  { id: 'billing', label: 'Billing', icon: '💳' },
  { id: 'profile', label: 'Settings', icon: '⚙️', hideMobile: true }
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
// 🎯 Layout Content Component
// ---------------------------------------------------------------------------
function ParentDashboardLayoutContent({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [activeTab, setActiveTab] = useState<TabID>('home')
  const [parentId, setParentId] = useState<string>('')
  const [parentName, setParentName] = useState<string>('')
  const [parentPhotoUrl, setParentPhotoUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // Sync URL -> State
  useEffect(() => {
    if (pathname?.includes('/booking')) {
      setActiveTab('book')
      return
    }

    const incomingTab = searchParams.get('tab') as TabID | null

    if (incomingTab && VALID_TABS.includes(incomingTab)) {
      setActiveTab(incomingTab)
    } else {
      setActiveTab('home')
    }
  }, [searchParams, pathname])

  // Sync State -> URL
  const handleTabChange = (tab: TabID) => {
    setActiveTab(tab)

    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  // Session & Security Check
  useEffect(() => {
    async function checkSecuritySession() {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) return router.push('/login')

      const { data: profile, error: dbError } = await supabase
        .from('parents')
        .select('id, name, avatar_url')
        .eq('id', user.id)
        .maybeSingle()

      if (dbError || !profile) return router.push('/login')

      setParentId(profile.id)
      setParentName(profile.name || 'Parent')
      if (profile.avatar_url) setParentPhotoUrl(profile.avatar_url)
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
      <div className="w-screen h-screen bg-slate-900 flex flex-col items-center justify-center gap-3">
        <span className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400 font-medium">Loading Workspace...</p>
      </div>
    )
  }

  return (
    <ParentContext.Provider value={{ parentId, parentName, activeTab, handleTabChange }}>
      <DashboardShell<TabID>
        appTitle="METIS"
        roleTitle="Parent Portal"
        userDisplayName={parentName}
        userPhotoUrl={parentPhotoUrl}
        userId={parentId}
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

export default function ParentDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={
      <div className="w-screen h-screen bg-slate-900 flex items-center justify-center">
        <span className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ParentDashboardLayoutContent>{children}</ParentDashboardLayoutContent>
    </Suspense>
  )
}