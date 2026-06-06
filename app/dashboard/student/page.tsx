"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import FileDirectory from '@/app/meeting/FileDirectory'

type Tab = 'launchpad' | 'history' | 'locker'

export default function StudentDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('launchpad')
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Data States
  const [student, setStudent] = useState<any>(null)
  const [upcomingClasses, setUpcomingClasses] = useState<any[]>([])
  const [completedClasses, setCompletedClasses] = useState<any[]>([])

  async function loadStudentData(userEmail: string) {
    try {
      setLoading(true)

      // 1. Fetch student profile row matching the verified Auth Email
      const { data: profile, error: profileError } = await supabase
        .from('students')
        .select('*')
        .eq('email', userEmail)
        .single()

      if (profileError || !profile) {
        console.error("Student profile match error:", profileError)
        return
      }
      setStudent(profile)

      // 2. Fetch UPCOMING confirmed classes
      const { data: upcoming } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          subject,
          meeting_link,
          teachers (name)
        `)
        .eq('student_id', profile.id)
        .eq('status', 'confirmed')
        .order('booking_date', { ascending: true })

      setUpcomingClasses(upcoming || [])

      // 3. Fetch PREVIOUS completed classes
      const { data: completed } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          subject,
          teacher_notes,
          teachers (name)
        `)
        .eq('student_id', profile.id)
        .eq('status', 'completed')
        .order('booking_date', { ascending: false })

      setCompletedClasses(completed || [])

    } catch (err) {
      console.error("Error running student data pipeline:", err)
    } finally {
      setLoading(false)
    }
  }

  // Handle initialization and browser reloads safely
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user?.email) {
        await loadStudentData(session.user.email)
      } else {
        router.push('/login')
      }
      setCheckingAuth(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  // Isolate the immediate next class if one exists
  const nextClass = upcomingClasses[0]

  // Guard screen checking identity statuses on reload
  if (checkingAuth || (loading && !student)) {
    return <div className="h-screen w-screen flex items-center justify-center text-slate-400 font-medium animate-pulse bg-slate-50">Opening Student Hub...</div>
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      
      {/* SIDEBAR NAVIGATION */}
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
          <SidebarItem icon="🏠" label="Launchpad" active={activeTab === 'launchpad'} collapsed={!sidebarOpen} onClick={() => setActiveTab('launchpad')} />
          <SidebarItem icon="📜" label="Previous Classes" active={activeTab === 'history'} collapsed={!sidebarOpen} onClick={() => setActiveTab('history')} />
          <SidebarItem icon="📂" label="Homework Locker" active={activeTab === 'locker'} collapsed={!sidebarOpen} onClick={() => setActiveTab('locker')} />
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-slate-400 hover:text-red-500 transition rounded-xl">
            <span>🚪</span> {sidebarOpen && "Sign Out"}
          </button>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        <header className="h-16 px-8 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 md:hidden">
              ☰
            </button>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">{activeTab} View</h2>
          </div>
          <div className="text-right">
            <p className="text-xs font-black text-slate-800">{student?.name}</p>
            <p className="text-[9px] font-bold text-blue-600 uppercase tracking-wider">{student?.grade}</p>
          </div>
        </header>

        <div className="p-8 flex-1 overflow-y-auto max-w-4xl w-full mx-auto">
          
          {/* TAB 1: LAUNCHPAD */}
          {activeTab === 'launchpad' && (
            <div className="space-y-6">
              {nextClass ? (
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black tracking-widest uppercase bg-white/20 px-2.5 py-1 rounded-md">Next Session Up</span>
                    <h1 className="text-xl font-black tracking-tight pt-1">{nextClass.subject || "Academic Mentoring Session"}</h1>
                    <p className="text-xs text-blue-100 font-medium">with {nextClass.teachers?.name || "Your Instructor"}</p>
                    <p className="text-xs text-blue-200 font-mono pt-1">⏱️ {new Date(nextClass.booking_date).toLocaleString([], { dateStyle: 'long', timeStyle: 'short' })}</p>
                  </div>
                  <div>
                    {nextClass.meeting_link ? (
                      <a 
                        href={nextClass.meeting_link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-block px-6 py-3 bg-white text-blue-600 font-black text-xs uppercase tracking-wider rounded-xl hover:bg-slate-50 transition shadow-lg text-center whitespace-nowrap"
                      >
                        🎥 Enter Live Classroom
                      </a>
                    ) : (
                      <button disabled className="px-6 py-3 bg-white/20 text-white/70 font-black text-xs uppercase tracking-wider rounded-xl cursor-not-allowed whitespace-nowrap">
                        Link Pending
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center border border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                  <p className="text-xs text-slate-400 font-medium italic">No classes scheduled on your calendar right now.</p>
                </div>
              )}

              {/* REMAINDER OF UPCOMING SCHEDULE LIST */}
              <div className="space-y-3 pt-2">
                <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Future Class Schedule</h3>
                {upcomingClasses.slice(1).length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic pl-1">No additional upcoming sessions mapped out.</p>
                ) : (
                  upcomingClasses.slice(1).map((b: any) => (
                    <div key={b.id} className="p-4 border border-slate-100 rounded-2xl bg-white flex items-center justify-between hover:bg-slate-50 transition shadow-xs">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{b.subject}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Instructor: {b.teachers?.name || "Staff"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500 font-mono font-bold">{new Date(b.booking_date).toLocaleDateString()}</p>
                        <p className="text-[9px] text-slate-400 font-mono">{new Date(b.booking_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <h1 className="text-xl font-black tracking-tight">Previously Completed Classes</h1>
              <p className="text-xs text-slate-400">Review lesson logs and summary guidance compiled by your educators.</p>
              
              <div className="space-y-3 pt-2">
                {completedClasses.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-10 border border-dashed rounded-2xl bg-slate-50/50">
                    No historical completions tracked on your profile yet.
                  </p>
                ) : (
                  completedClasses.map((b: any) => (
                    <div key={b.id} className="p-4 border border-slate-100 rounded-2xl bg-white space-y-3 shadow-xs">
                      <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                        <div>
                          <span className="text-[9px] font-black uppercase bg-slate-100 px-2 py-0.5 rounded text-slate-500 tracking-wider">
                            {b.subject || "General Session"}
                          </span>
                          <p className="text-[11px] font-bold text-slate-400 mt-1">Instructor: <span className="text-slate-700">{b.teachers?.name || "Staff Tutor"}</span></p>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                          🗓️ {new Date(b.booking_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Lesson Summary & Review Notes:</span>
                        <div className="bg-slate-50 p-3 rounded-xl text-xs text-slate-600 border border-slate-100 italic leading-relaxed">
                          "{b.teacher_notes || "Session successfully executed. Materials mastered cleanly across runtime constraints."}"
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: LOCKER */}
          {activeTab === 'locker' && (
            <div className="space-y-4 h-[550px] flex flex-col">
              <div>
                <h1 className="text-xl font-black tracking-tight">Personal Homework Locker</h1>
                <p className="text-xs text-slate-400">Retrieve assigned course materials and reference resources.</p>
              </div>
              
              <div className="flex-1 border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex flex-col bg-white mt-2">
                {student?.id ? (
                  <FileDirectory folderPath={`student_${student.id}`} />
                ) : (
                  <p className="text-xs text-slate-400 italic text-center py-20 bg-slate-50/50">Locker initialization error. Please re-authenticate.</p>
                )}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
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