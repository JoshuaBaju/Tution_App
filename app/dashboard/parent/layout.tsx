"use client"
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'

// Tab Component Layout Registrations
import ManageChildrenTab from './components/ManageChildrenTab'
import BookingProcedureTab from './components/BookingProcedureTab'
import ProfileTab from './components/ProfileTab'
import BillingTab from './components/BillingTab'

type TabID = 'children' | 'book' | 'profile' | 'billing'

export default function ParentDashboardLayout() {
  const router = useRouter()
  const pathname = usePathname()
  const [activeTab, setActiveTab] = useState<TabID>('children')
  const [parentId, setParentId] = useState<string>('')
  const [parentName, setParentName] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // Sync tab active states visually if a user deep-links into sub-routes
  useEffect(() => {
    if (pathname?.includes('/booking')) {
      setActiveTab('book')
    }
  }, [pathname])

  useEffect(() => {
    async function checkSecuritySession() {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        router.push('/login')
        return
      }

      const { data: parentProfile, error: dbError } = await supabase
        .from('parents')
        .select('id, name')
        .eq('id', user.id)
        .maybeSingle()

      if (dbError || !parentProfile) {
        console.error("Access Refused: Non-parent authorization token.")
        router.push('/login')
        return
      }

      setParentId(parentProfile.id)
      setParentName(parentProfile.name)
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
    <div className="w-screen h-screen flex flex-col sm:flex-row bg-slate-50 text-slate-900 overflow-hidden">
      
      {/* SIDEBAR NAVIGATION CONTROL */}
      <aside className="w-full sm:w-64 bg-white border-b sm:border-b-0 sm:border-r border-slate-200 flex flex-col justify-between shrink-0 z-20">
        <div className="p-5 sm:p-6">
          <div className="mb-6 hidden sm:block">
            <h2 className="text-xl font-black text-blue-600 tracking-tight">Tuition Hero</h2>
            <p className="text-[11px] text-slate-400 mt-0.5 font-semibold truncate">Parent Console</p>
          </div>

          <nav className="flex flex-row sm:flex-col gap-1 overflow-x-auto sm:overflow-x-visible pb-2 sm:pb-0">
            <button
              type="button"
              onClick={() => setActiveTab('children')}
              className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
                activeTab === 'children' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span>🧒</span> Children
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('book')}
              className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
                activeTab === 'book' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span>🔍</span> Book Tutor
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('billing')}
              className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
                activeTab === 'billing' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span>💳</span> Billing
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`whitespace-nowrap sm:hidden px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'profile' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <span>⚙️</span> Settings
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-100 hidden sm:block">
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut()
              router.push('/login')
            }}
            className="w-full text-center py-2.5 text-xs font-black uppercase tracking-wider text-red-500 hover:bg-red-50 rounded-xl transition"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* DASHBOARD VIEWPORT MATRIX */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* UPPER STATUS RIBBON */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 sm:px-8 flex items-center justify-between shrink-0">
          <span className="text-xs font-bold text-slate-400">Welcome back, <span className="text-slate-700">{parentName}</span></span>
          
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`w-8 h-8 rounded-full border transition flex items-center justify-center font-bold text-xs shadow-2xs ${
              activeTab === 'profile' 
                ? 'bg-blue-600 border-blue-600 text-white' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
            }`}
            title="Open Account Profile Settings"
          >
            {parentName ? parentName.charAt(0).toUpperCase() : 'P'}
          </button>
        </header>

        {/* COMPONENT CONDITIONAL RENDERING CONTAINER */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-8">
          {activeTab === 'children' && <ManageChildrenTab parentId={parentId} />}
          {activeTab === 'book' && <BookingProcedureTab parentId={parentId} />}
          {activeTab === 'profile' && <ProfileTab parentId={parentId} />}
          {activeTab === 'billing' && <BillingTab />}
        </main>
      </div>

    </div>
  )
}