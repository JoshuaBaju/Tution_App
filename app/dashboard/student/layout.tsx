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
import NotificationCenter from '@/components/NotificationCenter'

// ---------------------------------------------------------------------------
// 🏛️ Shared tab identity — single source of truth for the whole Student view
// ---------------------------------------------------------------------------
export type TabID = 'home' | 'schedule' | 'reports' | 'locker' | 'chat' | 'workspace'

const VALID_TABS: TabID[] = ['home', 'schedule', 'reports', 'locker', 'chat', 'workspace']

interface StudentContextValue {
  studentId: string
  studentName: string
  studentGrade: string
  activeTab: TabID
  handleTabChange: (tab: TabID) => void
}

const StudentContext = createContext<StudentContextValue | null>(null)

// Named export hook (kept as a plain named function per Turbopack mapping requirement)
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
  const searchParams = useSearchParams() // 🔗 Safely extracted inside the Suspense Boundary

  const [activeTab, setActiveTab] = useState<TabID>('home')
  const [studentId, setStudentId] = useState<string>('')
  const [studentName, setStudentName] = useState<string>('')
  const [studentGrade, setStudentGrade] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // 🎯 URL -> STATE: handles direct links, refreshes, and browser back/forward pops
  useEffect(() => {
    const incomingTab = searchParams.get('tab') as TabID | null

    if (incomingTab && VALID_TABS.includes(incomingTab)) {
      setActiveTab(incomingTab)
    } else {
      setActiveTab('home') // Safe default layout configuration fallback
    }
  }, [searchParams, pathname])

  // 🎯 STATE -> URL: pushed from clicks, keeps other query params intact, no history lock
  const handleTabChange = (tab: TabID) => {
    setActiveTab(tab) // optimistic update so the UI feels instant

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
        .eq('email', session.user.email)
        .maybeSingle()

      if (dbError || !profile) return router.push('/login')

      setStudentId(profile.id)
      setStudentName(profile.name || 'Academic Student')
      setStudentGrade(profile.grade || 'Enrolled Pro')
      setLoading(false)
    }
    checkSecuritySession()
  }, [router])

  if (loading) {
    return (
      <div className="w-screen h-screen bg-slate-50 flex items-center justify-center">
        <span className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <StudentContext.Provider value={{ studentId, studentName, studentGrade, activeTab, handleTabChange }}>
      <div className="w-screen h-screen flex flex-col sm:flex-row bg-slate-50 text-slate-900 overflow-hidden">
        {/* SIDEBAR SHELL — the page portals its nav buttons into #student-sidebar-nav */}
        <aside className="w-full sm:w-64 bg-white border-b sm:border-b-0 sm:border-r border-slate-200 flex flex-col justify-between shrink-0 z-20">
          <div className="p-5 sm:p-6">
            <div className="mb-6 hidden sm:block">
              <h2 className="text-xl font-black text-blue-600 tracking-tight">Tuition Hero</h2>
              <p className="text-[11px] text-slate-400 mt-0.5 font-semibold">Student Portal</p>
            </div>

            {/* 🎨 Portal target: page.tsx injects nav buttons built from navItems here */}
            <nav
              id="student-sidebar-nav"
              className="flex flex-row sm:flex-col gap-1 overflow-x-auto sm:overflow-x-visible pb-2 sm:pb-0"
            />
          </div>

          <div className="p-4 border-t border-slate-100 hidden sm:block">
            <button
              type="button"
              onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
              className="w-full py-2.5 text-xs font-black uppercase tracking-wider text-red-500 hover:bg-red-50 rounded-xl transition"
            >
              Sign Out
            </button>
          </div>
        </aside>

        {/* DASHBOARD VIEWPORT MATRIX */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <header className="h-16 bg-white border-b border-slate-200 px-6 sm:px-8 flex items-center justify-between shrink-0">
            <span className="text-xs font-bold text-slate-400">
              Welcome back, <span className="text-slate-700">{studentName}</span>
            </span>
            <div className="flex items-center gap-4">
              <NotificationCenter userId={studentId} />
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black text-slate-800">{studentName}</p>
                <p className="text-[9px] font-bold text-blue-600 uppercase tracking-wider">{studentGrade}</p>
              </div>
            </div>
          </header>

          {/* 🎨 Portal target: page.tsx projects the active tab's content here */}
          <main className="flex-1 overflow-y-auto p-6 sm:p-8 max-w-5xl w-full mx-auto">
            <div id="student-main-viewport" />
          </main>
        </div>
      </div>

      {/* The Page (App Router's `children`) renders here */}
      {children}
    </StudentContext.Provider>
  )
}

// 📦 Safe Export Root Wrapped in a Next.js Client Suspense Boundary Container
export default function StudentDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={
      <div className="w-screen h-screen bg-slate-50 flex items-center justify-center">
        <span className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <StudentDashboardLayoutContent>{children}</StudentDashboardLayoutContent>
    </Suspense>
  )
}