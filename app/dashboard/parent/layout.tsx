"use client"

import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

// Tab Component Layout Registrations
import OverviewTab from './components/HomeTab' 
import ManageChildrenTab from './components/ManageChildrenTab'
import BookingProcedureTab from './components/BookingProcedureTab'
import ProfileTab from './components/ProfileTab'
import BillingTab from './components/BillingTab'
import ChatRoom from './components/ChatRoomTab' 
import NotificationCenter from '@/components/NotificationCenter'

type TabID = 'home' | 'children' | 'book' | 'chat' | 'profile' | 'billing'

function ParentDashboardLayoutContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams() // 🔗 Safely extracted inside the Suspense Boundary
  
  const [activeTab, setActiveTab] = useState<TabID>('home') 
  const [parentId, setParentId] = useState<string>('')
  const [parentName, setParentName] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // 🎯 UNIVERSAL PARAM WORKSPACE HANDLER:
  useEffect(() => {
    if (pathname?.includes('/booking')) {
      setActiveTab('book')
      return
    }

    const incomingTab = searchParams.get('tab') as TabID | null
    const validTabs: TabID[] = ['home', 'children', 'book', 'chat', 'profile', 'billing']

    if (incomingTab && validTabs.includes(incomingTab)) {
      setActiveTab(incomingTab)
    } else if (!pathname?.includes('/booking')) {
      setActiveTab('home') // Safe default layout configuration fallback
    }
  }, [searchParams, pathname])

  useEffect(() => {
    async function checkSecuritySession() {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) return router.push('/login')

      const { data: profile, error: dbError } = await supabase
        .from('parents')
        .select('id, name')
        .eq('id', user.id)
        .maybeSingle()

      if (dbError || !profile) return router.push('/login')

      setParentId(profile.id)
      setParentName(profile.name)
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

  const tabs: { id: TabID; label: string; icon: string; hideMobile?: boolean }[] = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'children', label: 'Children', icon: '🧒' },
    { id: 'book', label: 'Book Tutor', icon: '🔍' },
    { id: 'chat', label: 'Messages', icon: '💬' },
    { id: 'billing', label: 'Billing', icon: '💳' },
    { id: 'profile', label: 'Settings', icon: '⚙️', hideMobile: true }
  ]

  return (
    <div className="w-screen h-screen flex flex-col sm:flex-row bg-slate-50 text-slate-900 overflow-hidden">
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full sm:w-64 bg-white border-b sm:border-b-0 sm:border-r border-slate-200 flex flex-col justify-between shrink-0 z-20">
        <div className="p-5 sm:p-6">
          <div className="mb-6 hidden sm:block">
            <h2 className="text-xl font-black text-blue-600 tracking-tight">Tuition Hero</h2>
            <p className="text-[11px] text-slate-400 mt-0.5 font-semibold">Parent Console</p>
          </div>

          <nav className="flex flex-row sm:flex-col gap-1 overflow-x-auto sm:overflow-x-visible pb-2 sm:pb-0">
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${tab.hideMobile ? 'sm:hidden' : ''} ${activeTab === tab.id ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <span>{tab.icon}</span> {tab.label}
              </button>
            ))}
          </nav>
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
            Welcome back, <span className="text-slate-700">{parentName}</span>
          </span>
          <div className="flex items-center gap-4">
            <NotificationCenter userId={parentId} />
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`w-8 h-8 rounded-full border transition flex items-center justify-center font-bold text-xs shadow-2xs ${activeTab === 'profile' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-100 text-slate-600 border-slate-200'}`}
            >
              {parentName ? parentName.charAt(0).toUpperCase() : 'P'}
            </button>
          </div>
        </header>

        {/* COMPONENT CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-8 max-w-5xl w-full mx-auto">
          {activeTab === 'home' && <OverviewTab parentId={parentId} />}
          {activeTab === 'children' && <ManageChildrenTab parentId={parentId} />}
          {activeTab === 'book' && <BookingProcedureTab parentId={parentId} />}
          {activeTab === 'profile' && <ProfileTab parentId={parentId} />}
          {activeTab === 'billing' && <BillingTab />}
          {activeTab === 'chat' && <ChatRoom parentId={parentId} />}
        </main>
      </div>
    </div>
  )
}

// 📦 Safe Export Root Wrapped in a Next.js Client Suspense Boundary Container
export default function ParentDashboardLayout() {
  return (
    <Suspense fallback={
      <div className="w-screen h-screen bg-slate-50 flex items-center justify-center">
        <span className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ParentDashboardLayoutContent />
    </Suspense>
  )
}