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
// 🏛️ Shared tab identity — single source of truth for the whole Teacher view
// ---------------------------------------------------------------------------
export type TabID = 'home' | 'schedule' | 'workspace' | 'locker' | 'reports' | 'chat' | 'profile'

const VALID_TABS: TabID[] = ['home', 'schedule', 'workspace', 'locker', 'reports', 'chat', 'profile']

export const NAV_ITEMS: NavItem<TabID>[] = [
  { id: 'home', label: 'Home Overview', icon: '🏠' },
  { id: 'schedule', label: 'My Schedule', icon: '🗓️' },
  { id: 'workspace', label: 'Board Workspace', icon: '🎨' },
  { id: 'locker', label: 'Manage Students', icon: '🎒' },
  { id: 'reports', label: 'Student Reports', icon: '📊' },
  { id: 'chat', label: 'Messages Hub', icon: '💬' },
  { id: 'profile', label: 'Profile Settings', icon: '⚙️', hideMobile: true }
]

interface TeacherContextValue {
  teacherId: string
  teacherName: string
  activeTab: TabID
  handleTabChange: (tab: TabID) => void
}

const TeacherContext = createContext<TeacherContextValue | null>(null)

export function useTeacher() {
  const ctx = useContext(TeacherContext)
  if (!ctx) {
    throw new Error('useTeacher() must be called from within TeacherDashboardLayout')
  }
  return ctx
}

// ---------------------------------------------------------------------------
// 🎯 Layout content — auth guard, profile fetch, context + URL sync, shell
// ---------------------------------------------------------------------------
function TeacherDashboardLayoutContent({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [activeTab, setActiveTab] = useState<TabID>('home')
  const [teacherId, setTeacherId] = useState<string>('')
  const [teacherName, setTeacherName] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // 🎯 URL -> STATE
  useEffect(() => {
    const incomingTab = searchParams.get('tab') as TabID | null

    if (incomingTab && VALID_TABS.includes(incomingTab)) {
      setActiveTab(incomingTab)
    } else {
      setActiveTab('home')
    }
  }, [searchParams, pathname])

  // 🎯 STATE -> URL
  const handleTabChange = (tab: TabID) => {
    setActiveTab(tab)

    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  // 🔐 Session & profile guarding
  useEffect(() => {
    async function checkSecuritySession() {
      const { data: { session }, error: authError } = await supabase.auth.getSession()
      if (authError || !session?.user) return router.push('/login')

      const { data: profile, error: dbError } = await supabase
        .from('teachers')
        .select('id, name')
        .eq('id', session.user.id)
        .maybeSingle()

      if (dbError || !profile) return router.push('/login')

      setTeacherId(profile.id)
      setTeacherName(profile.name || 'Educator')
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
    <TeacherContext.Provider value={{ teacherId, teacherName, activeTab, handleTabChange }}>
      <DashboardShell<TabID>
        userDisplayName={teacherName}
        userId={teacherId}
        userSubtext={
          teacherId ? (
            <p className="text-[10px] font-mono text-slate-300 truncate">
              ID: {teacherId.slice(0, 8)}...
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
    </TeacherContext.Provider>
  )
}

// 📦 Safe Export Root Wrapped in a Next.js Client Suspense Boundary Container
export default function TeacherDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="w-screen h-screen bg-[#1A2D48] flex items-center justify-center">
          <span className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <TeacherDashboardLayoutContent>{children}</TeacherDashboardLayoutContent>
    </Suspense>
  )
}