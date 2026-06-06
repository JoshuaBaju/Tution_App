"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import EditableFileDirectory from '@/app/dashboard/teacher/components/EditableFileDirectory'

type Tab = 'schedule' | 'resources' | 'progress' | 'settings'

export default function TeacherDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('schedule')
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  
  // Teacher Data States
  const [teacher, setTeacher] = useState<any>(null)
  const [bookings, setBookings] = useState<any[]>([])
  const [selectedLocker, setSelectedLocker] = useState<string>('')
  const [lockerType, setLockerType] = useState<'master' | 'student'>('master')

  // Profile Edit States
  const [editName, setEditName] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editRate, setEditRate] = useState('')
  const [editSubjects, setEditSubjects] = useState<string[]>([])

  async function loadTeacherData(userId: string) {
    try {
      setLoading(true)
      const { data: profile } = await supabase.from('teachers').select('*').eq('id', userId).single()
      const { data: classes } = await supabase.from('bookings').select('*').eq('teacher', userId).order('booking_date', { ascending: false })

      if (profile) {
        setTeacher(profile)
        setEditName(profile.name || '')
        setEditBio(profile.bio || '')
        setEditRate(profile.rate?.toString() || '0')
        setEditSubjects(profile.subjects || [])
      }
      
      setBookings(classes || [])
      if (classes && classes.length > 0) {
        setSelectedLocker(`${userId}_${classes[0].parent}`)
      }
    } catch (err) {
      console.error("Error executing teacher data pipeline:", err)
    } finally {
      setLoading(false)
    }
  }

  // Handle initialization and browser reloads safely
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await loadTeacherData(session.user.id)
      } else {
        router.push('/login')
      }
      setCheckingAuth(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  if (checkingAuth || (loading && !teacher)) {
    return <div className="h-screen w-screen flex items-center justify-center text-slate-400 font-medium animate-pulse bg-slate-50">Entering Command Center...</div>
  }

  // Math Metrics calculations
  const rate = teacher?.rate || 0
  const completedClasses = bookings.filter(b => b.status === 'completed')
  const creditedAmount = completedClasses.filter(b => b.payment_status === 'credited').length * rate
  const amountToBeCredited = completedClasses.filter(b => b.payment_status !== 'credited').length * rate

  const handleUpdateProfile = async () => {
    const { error } = await supabase
      .from('teachers')
      .update({
        name: editName,
        bio: editBio,
        rate: parseFloat(editRate) || 0,
        subjects: editSubjects
      })
      .eq('id', teacher.id)

    if (error) alert("Error saving profile settings: " + error.message)
    else alert("Profile configurations saved completely!")
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      
      {/* 1. COLLAPSIBLE SIDEBAR */}
      <aside className={`border-r border-slate-200 flex flex-col bg-white transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-0 -translate-x-full md:w-20 md:translate-x-0'}`}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100">
          {sidebarOpen && (
            <div className="flex items-center gap-2 font-black text-blue-600 text-xs tracking-tighter uppercase">
              <span>🎓</span> Tuition Hero
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 text-sm hidden md:block">
            ☰
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <SidebarItem icon="🗓️" label="Schedule" active={activeTab === 'schedule'} collapsed={!sidebarOpen} onClick={() => setActiveTab('schedule')} />
          <SidebarItem icon="📂" label="Resources" active={activeTab === 'resources'} collapsed={!sidebarOpen} onClick={() => setActiveTab('resources')} />
          <SidebarItem icon="📈" label="Progress" active={activeTab === 'progress'} collapsed={!sidebarOpen} onClick={() => setActiveTab('progress')} />
          <SidebarItem icon="👤" label="Settings" active={activeTab === 'settings'} collapsed={!sidebarOpen} onClick={() => setActiveTab('settings')} />
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-slate-400 hover:text-red-500 transition rounded-xl">
            <span>🚪</span> {sidebarOpen && "Sign Out"}
          </button>
        </div>
      </aside>

      {/* MAIN VIEWPORT LAYOUT */}
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        <header className="h-16 px-8 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 md:hidden">
              ☰
            </button>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">{activeTab} Hub</h2>
          </div>
          <div className="flex items-center gap-3">
             <span className="text-[11px] font-black text-slate-500">{teacher?.name}</span>
             <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                {teacher?.photo_url && <img src={teacher.photo_url} className="w-full h-full object-cover" alt="" />}
             </div>
          </div>
        </header>

        <div className="p-8 flex-1 overflow-y-auto max-w-5xl w-full mx-auto">
          
          {/* TAB 1: SCHEDULE */}
          {activeTab === 'schedule' && (
            <div className="space-y-6">
              <h1 className="text-xl font-black tracking-tight">Active Classroom Registry</h1>
              <div className="grid grid-cols-1 gap-2.5">
                {bookings.filter(b => b.status === 'confirmed').map(b => (
                  <div key={b.id} className="p-4 border border-slate-200/60 rounded-2xl flex items-center justify-between hover:bg-slate-50/50 transition shadow-xs">
                     <div>
                        <p className="text-xs font-bold text-slate-800">1-on-1 Personalized Session</p>
                        <p className="text-[10px] text-slate-400 uppercase font-mono mt-1">🗓️ {new Date(b.booking_date).toLocaleString()}</p>
                     </div>
                     <button onClick={() => router.push(`/meeting/${b.id}`)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black rounded-xl transition">LAUNCH PORTAL</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: RESOURCES */}
          {activeTab === 'resources' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start h-[600px]">
              <div className="space-y-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Storage Path</span>
                <div className="flex flex-col gap-1.5">
                   <button onClick={() => setLockerType('master')} className={`text-left px-4 py-3 rounded-xl text-xs font-bold transition ${lockerType === 'master' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600'}`}>💾 Master Library</button>
                   <button onClick={() => setLockerType('student')} className={`text-left px-4 py-3 rounded-xl text-xs font-bold transition ${lockerType === 'student' ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-600'}`}>👥 Student Lockers</button>
                </div>
                {lockerType === 'student' && (
                   <select value={selectedLocker} onChange={e => setSelectedLocker(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none">
                      {Array.from(new Set(bookings.map(b => b.parent))).map(pId => (
                        <option key={pId as string} value={`${teacher.id}_${pId}`}>Student Locker ({ (pId as string).slice(0,8) })</option>
                      ))}
                   </select>
                )}
              </div>
              <div className="md:col-span-3 h-full border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex flex-col">
                <EditableFileDirectory folderPath={lockerType === 'master' ? `master_${teacher.id}` : selectedLocker} />
              </div>
            </div>
          )}

          {/* TAB 3: PROGRESS */}
          {activeTab === 'progress' && (
            <div className="space-y-6">
              <h1 className="text-xl font-black tracking-tight">Up-to-Date Progress Tracking</h1>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl">
                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-wider">Credited Amount</span>
                  <p className="text-2xl font-black text-emerald-800 mt-1">${creditedAmount.toFixed(2)}</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl">
                  <span className="text-[9px] font-black text-amber-600 uppercase tracking-wider">Amount To Be Credited</span>
                  <p className="text-2xl font-black text-amber-800 mt-1">${amountToBeCredited.toFixed(2)}</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-3">Archived Completed Classes Matrix</span>
                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                  {completedClasses.map((item) => (
                    <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-800">1-on-1 Class Handled</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{new Date(item.booking_date).toLocaleDateString()}</p>
                      </div>
                      <span className={`text-[9px] px-2.5 py-1 rounded-md font-black uppercase ${item.payment_status === 'credited' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {item.payment_status === 'credited' ? 'Credited' : 'Pending Credit'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="max-w-xl space-y-5">
              <h1 className="text-xl font-black tracking-tight">Full Profile Parameters</h1>
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Public Identity Name</label>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="p-3 border border-slate-200 rounded-xl text-xs font-medium focus:outline-blue-600 bg-white" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Hourly Pay Rate ($)</label>
                  <input type="number" value={editRate} onChange={e => setEditRate(e.target.value)} className="p-3 border border-slate-200 rounded-xl text-xs font-medium focus:outline-blue-600 bg-white" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Acregated Specialty Subjects (Comma Separated)</label>
                  <input 
                    type="text" 
                    value={editSubjects.join(', ')} 
                    onChange={e => setEditSubjects(e.target.value.split(',').map(s => s.trim()))} 
                    className="p-3 border border-slate-200 rounded-xl text-xs font-medium focus:outline-blue-600 bg-white" 
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Teacher Biography Portfolio</label>
                  <textarea rows={4} value={editBio} onChange={e => setEditBio(e.target.value)} className="p-3 border border-slate-200 rounded-xl text-xs font-medium focus:outline-blue-600 bg-white" />
                </div>
                <button onClick={handleUpdateProfile} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl shadow-md transition">
                  SAVE ALL PARAMETERS
                </button>
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