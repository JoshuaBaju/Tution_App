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
// 🏛️ Shared tab identity — single source of truth for the whole Student view
// ---------------------------------------------------------------------------
export type TabID = 'home' | 'schedule' | 'reports' | 'locker' | 'chat' | 'workspace' | 'profile'

const VALID_TABS: TabID[] = ['home', 'schedule', 'reports', 'locker', 'chat', 'workspace', 'profile']

export const NAV_ITEMS: NavItem<TabID>[] = [
  { id: 'home', label: 'Home Base', icon: '🏠' },
  { id: 'schedule', label: 'My Schedule', icon: '📅' },
  { id: 'reports', label: 'Progress Reports', icon: '📜' },
  { id: 'workspace', label: 'My Workspaces', icon: '💻' },
  { id: 'locker', label: 'Locker Rooms', icon: '📂' },
  { id: 'chat', label: 'Study Chat', icon: '💬' },
  { id: 'profile', label: 'Profile', icon: '⚙️', hideMobile: true }
]

interface StudentContextValue {
  studentId: string
  studentName: string
  studentGrade: string
  activeTab: TabID
  handleTabChange: (tab: TabID) => void
}

const StudentContext = createContext<StudentContextValue | null>(null)

export function useStudent() {
  const ctx = useContext(StudentContext)
  if (!ctx) {
    throw new Error('useStudent() must be called from within StudentDashboardLayout')
  }
  return ctx
}

// ---------------------------------------------------------------------------
// 🎯 Layout content — auth guard, profile fetch, context + URL sync, shell
// ---------------------------------------------------------------------------
function StudentDashboardLayoutContent({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [activeTab, setActiveTab] = useState<TabID>('home')
  const [studentId, setStudentId] = useState<string>('')
  const [studentName, setStudentName] = useState<string>('')
  const [studentGrade, setStudentGrade] = useState<string>('')
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
        .from('students')
        .select('id, name, grade')
        .eq('id', session.user.id)
        .maybeSingle()

      if (dbError || !profile) return router.push('/login')

      setStudentId(profile.id)
      setStudentName(profile.name || 'Student')
      setStudentGrade(profile.grade || 'Learner')
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
    <StudentContext.Provider value={{ studentId, studentName, studentGrade, activeTab, handleTabChange }}>
      <DashboardShell<TabID>
        userDisplayName={studentName}
        userId={studentId}
        userSubtext={
          studentGrade ? (
            <div className="text-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-300 bg-blue-900/50 px-2 py-0.5 rounded-full">
                {studentGrade}
              </span>
            </div>
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
    </StudentContext.Provider>
  )
}

// 📦 Safe Export Root Wrapped in a Next.js Client Suspense Boundary Container
export default function StudentDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="w-screen h-screen bg-[#1A2D48] flex items-center justify-center">
          <span className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <StudentDashboardLayoutContent>{children}</StudentDashboardLayoutContent>
    </Suspense>
  )
}