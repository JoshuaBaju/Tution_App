"use client"
import { useEffect, useState, createContext, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Shared context matrix to pass profile details down to pages and child tabs easily
// 💡 Added 'chat' to the allowed activeTab types here
const StudentContext = createContext<{ student: any; activeTab: string; setActiveTab: (tab: any) => void }>({
  student: null,
  activeTab: 'home',
  setActiveTab: () => {},
})

export const useStudent = () => useContext(StudentContext)

export default function StudentDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  // 💡 Updated the state type array to safely include 'chat'
  const [activeTab, setActiveTab] = useState<'home' | 'schedule' | 'reports' | 'locker' | 'chat'>('home')
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [student, setStudent] = useState<any>(null)

  useEffect(() => {
    let isMounted = true

    async function verifyRosterAccess() {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!isMounted) return

      if (session?.user?.email) {
        const { data: profile, error: profileError } = await supabase
          .from('students')
          .select('*')
          .eq('email', session.user.email)
          .maybeSingle()

        if (profileError || !profile) {
          console.error("Student portfolio resolve failure:", profileError)
          setCheckingAuth(false)
          return
        }
        
        setStudent(profile)
        setCheckingAuth(false)
      } else {
        router.push('/login')
      }
    }

    verifyRosterAccess()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (!isMounted) return
      if (event === 'SIGNED_OUT') {
        router.push('/login')
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [router])

  if (checkingAuth) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center text-slate-400 font-medium animate-pulse bg-slate-50 gap-2">
        <span className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Syncing Secure Student Node...</p>
      </div>
    )
  }

  return (
    <StudentContext.Provider value={{ student, activeTab, setActiveTab }}>
      <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
        
        {/* SIDEBAR NAVIGATION FRAMEWORK */}
        <aside className={`border-r border-slate-200 flex flex-col bg-white transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-0 -translate-x-full md:w-20 md:translate-x-0'}`}>
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100">
            {sidebarOpen && (
              <div className="flex items-center gap-2 font-black text-blue-600 text-xs tracking-tighter uppercase">
                <span>🚀</span> Student Portal
              </div>
            )}
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 text-sm hidden md:block">
              ☰
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            <SidebarItem icon="🏠" label="Home Base" active={activeTab === 'home'} collapsed={!sidebarOpen} onClick={() => setActiveTab('home')} />
            <SidebarItem icon="📅" label="My Schedule" active={activeTab === 'schedule'} collapsed={!sidebarOpen} onClick={() => setActiveTab('schedule')} />
            <SidebarItem icon="📜" label="Progress Reports" active={activeTab === 'reports'} collapsed={!sidebarOpen} onClick={() => setActiveTab('reports')} />
            <SidebarItem icon="📂" label="Locker Rooms" active={activeTab === 'locker'} collapsed={!sidebarOpen} onClick={() => setActiveTab('locker')} />
            
            {/* 💬 NEW: Chat Navigation Row Link Item */}
            <SidebarItem icon="💬" label="Study Chat" active={activeTab === 'chat'} collapsed={!sidebarOpen} onClick={() => setActiveTab('chat')} />
          </nav>

          <div className="p-4 border-t border-slate-100">
            <button 
              onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }} 
              className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-slate-400 hover:text-red-500 transition rounded-xl"
            >
              <span>🚪</span> {sidebarOpen && "Sign Out"}
            </button>
          </div>
        </aside>

        {/* DATA CONTAINER AREA */}
        <main className="flex-1 flex flex-col min-w-0 bg-white">
          <header className="h-16 px-8 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 md:hidden">
                ☰
              </button>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">{activeTab} Deck</h2>
            </div>
            <div className="text-right">
              <p className="text-xs font-black text-slate-800">{student?.name || 'Academic Student'}</p>
              <p className="text-[9px] font-bold text-blue-600 uppercase tracking-wider">{student?.grade || 'Enrolled Pro'}</p>
            </div>
          </header>

          <div className="p-8 flex-1 overflow-y-auto max-w-5xl w-full mx-auto">
            {children}
          </div>
        </main>
      </div>
    </StudentContext.Provider>
  )
}

function SidebarItem({ icon, label, active, collapsed, onClick }: { icon: string, label: string, active: boolean, collapsed: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-black transition-all ${
        active ? 'bg-slate-100 text-blue-600 shadow-xs' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
      } ${collapsed ? 'justify-center' : ''}`}
    >
      <span className="text-sm">{icon}</span>
      {!collapsed && <span>{label}</span>}
    </button>
  )
}