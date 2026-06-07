"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import FileDirectory from '@/app/meeting/FileDirectory'

type Tab = 'overview' | 'children' | 'billing'

export default function ParentDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  
  // Data States
  const [parent, setParent] = useState<any>(null)
  const [children, setChildren] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [pastClasses, setPastClasses] = useState<any[]>([])
  
  // Interaction States
  const [selectedChildFilter, setSelectedChildFilter] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // "+ Add Child" Form States
  const [childName, setChildName] = useState('')
  const [childEmail, setChildEmail] = useState('')
  const [childGrade, setChildGrade] = useState('')
  const [addingChild, setAddingChild] = useState(false)
  
  // Post-Creation Share States
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState<string | null>(null)

  // Asset Monitoring States
  const [selectedChildLocker, setSelectedChildLocker] = useState('')

  async function loadParentData(userId: string) {
    try {
      setLoading(true)

      // 1. Fetch parent profile row
      const { data: profile, error: profileError } = await supabase
        .from('parents')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (profileError || !profile) {
        console.error("Parent profile match error:", profileError)
        return
      }
      setParent(profile)

      // 2. Fetch children linked to this parent
      const { data: students, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('parent', profile.id)
      
      if (!studentError && students) {
        setChildren(students)
        if (students.length > 0) {
          setSelectedChildLocker(`student_${students[0].id}`)
        }
      }

      // 3. Fetch upcoming bookings
      const { data: upcomingData } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          status,
          subject,
          student_id,
          students (name),
          teachers (name)
        `)
        .eq('parent', profile.id)
        .eq('status', 'confirmed')
        .order('booking_date', { ascending: true })
        
      setBookings(upcomingData || [])

      // 4. Fetch past history items
      const { data: historicalData } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          subject,
          student_id,
          teacher_notes,
          teachers (name)
        `)
        .eq('parent', profile.id)
        .eq('status', 'completed')
        .order('booking_date', { ascending: false })

      setPastClasses(historicalData || [])

    } catch (err) {
      console.error("Unexpected pipeline execution error:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await loadParentData(session.user.id)
      } else {
        router.push('/login')
      }
      setCheckingAuth(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault()
    // Safety guard protects from null parent calls safely
    if (!parent?.id || !childName || !childEmail || !childGrade) return
    
    setAddingChild(true)
    const { error: dbError } = await supabase
      .from('students')
      .insert([{
        name: childName,
        email: childEmail,
        grade: childGrade,
        parent: parent.id
      }])

    if (dbError) {
      alert("Failed to register child profile: " + dbError.message)
      setAddingChild(false)
    } else {
      const inviteUrl = `${window.location.origin}/signup?token=student&email=${encodeURIComponent(childEmail)}`
      
      // Fixed: State setter function correctly utilized here
      setGeneratedInviteUrl(inviteUrl)
      
      await loadParentData(parent.id)
      setAddingChild(false)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setGeneratedInviteUrl(null)
    setChildName('')
    setChildEmail('')
    setChildGrade('')
  }

  const displayedBookings = selectedChildFilter 
    ? bookings.filter(b => b.student_id === selectedChildFilter)
    : bookings

  if (checkingAuth || (loading && !parent)) {
    return <div className="h-screen w-screen flex items-center justify-center text-slate-400 font-medium animate-pulse bg-slate-50">Verifying Parent Credentials...</div>
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      
      {/* SIDEBAR NAVIGATION PANEL */}
      <aside className={`border-r border-slate-200 flex flex-col bg-white transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-0 -translate-x-full md:w-20 md:translate-x-0'}`}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100">
          {sidebarOpen && (
            <div className="flex items-center gap-2 font-black text-blue-600 text-xs tracking-tighter uppercase">
              <span>🎓</span> Parent Portal
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 text-sm hidden md:block">
            ☰
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <SidebarItem icon="🏠" label="Overview" active={activeTab === 'overview'} collapsed={!sidebarOpen} onClick={() => setActiveTab('overview')} />
          <SidebarItem icon="🧒" label="Manage Children" active={activeTab === 'children'} collapsed={!sidebarOpen} onClick={() => setActiveTab('children')} />
          <SidebarItem icon="💳" label="Billing & Invoices" active={activeTab === 'billing'} collapsed={!sidebarOpen} onClick={() => setActiveTab('billing')} />
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-slate-400 hover:text-red-500 transition rounded-xl">
            <span>🚪</span> {sidebarOpen && "Sign Out"}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT VIEWPORT */}
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        <header className="h-16 px-8 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 md:hidden">
              ☰
            </button>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">{activeTab} Hub</h2>
          </div>
          <div className="text-right">
            <p className="text-xs font-black text-slate-800">{parent?.name}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase">Account Manager</p>
          </div>
        </header>

        <div className="p-8 flex-1 overflow-y-auto max-w-5xl w-full mx-auto">
          
          {/* TAB 1: OVERVIEW TIMELINE */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h1 className="text-xl font-black tracking-tight">Family Schedule Blueprint</h1>
                  <p className="text-xs text-slate-500 mt-0.5">Track live virtual classrooms and manage appointment windows.</p>
                </div>
                
                <button
                  onClick={() => router.push('/booking')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider px-5 py-3 rounded-xl transition active:scale-95 shadow-md flex items-center justify-center gap-2 self-start sm:self-auto"
                >
                  🗓️ Schedule a New Lesson
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      {selectedChildFilter ? "Filtered Schedule View" : "All Upcoming Family Sessions"}
                    </span>
                    {selectedChildFilter && (
                      <button onClick={() => setSelectedChildFilter(null)} className="text-[10px] text-blue-600 font-bold hover:underline">
                        Reset Filter (Clear)
                      </button>
                    )}
                  </div>

                  {displayedBookings.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-6 border border-dashed rounded-2xl text-center">No matching upcoming slots scheduled.</p>
                  ) : (
                    displayedBookings.map((b: any) => (
                      <div key={b.id} className="p-4 border border-slate-100 rounded-2xl bg-white shadow-xs space-y-2 hover:border-slate-200 transition">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[9px] uppercase font-black bg-slate-100 px-2 py-0.5 rounded-md text-slate-500 tracking-wider">
                              {b.subject || "Academic Mentorship"}
                            </span>
                            <h3 className="text-xs font-black text-slate-800 mt-1.5">
                              Student: <span className="text-blue-600">{b.students?.name || "Unassigned"}</span>
                            </h3>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ⏱️ {new Date(b.booking_date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-4 pt-1 border-t border-slate-50">
                          <p>🧑‍🏫 Instructor: <span className="font-bold text-slate-700">{b.teachers?.name || "Staff Tutor"}</span></p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* SELECTABLE FILTER ROSTER */}
                <div className="space-y-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Filter By Child Profile</span>
                  <div className="bg-slate-50 p-4 rounded-2xl space-y-2 border border-slate-100">
                    <button 
                      onClick={() => setSelectedChildFilter(null)}
                      className={`w-full text-left p-2 rounded-xl text-xs font-bold transition ${!selectedChildFilter ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-200/50 text-slate-700'}`}
                    >
                      🌟 Show All Sessions
                    </button>
                    {children.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedChildFilter(c.id)}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-bold transition text-left ${selectedChildFilter === c.id ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-slate-200/50 text-slate-700 bg-white border border-slate-200/40'}`}
                      >
                        <span>🧒 {c.name}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${selectedChildFilter === c.id ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-400'}`}>{c.grade}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ROSTER REGISTRY */}
          {activeTab === 'children' && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
              
              <div className="md:col-span-2 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Roster Registry</span>
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black rounded-lg transition"
                  >
                    + Add Child
                  </button>
                </div>

                <div className="space-y-4">
                  {children.length === 0 ? (
                    <div className="p-6 text-center border border-dashed rounded-xl text-xs text-slate-400 bg-slate-50/50">
                      No student profiles discovered. Click the button above to register a child.
                    </div>
                  ) : (
                    children.map(c => (
                      <div key={c.id} className="p-4 border border-slate-200 rounded-2xl bg-white space-y-3 shadow-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <div>
                            <p className="font-black text-slate-800 text-xs">{c.name}</p>
                            <p className="text-[9px] text-slate-400 truncate max-w-[140px]">{c.email}</p>
                          </div>
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">{c.grade}</span>
                        </div>

                        <div className="space-y-1.5">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Recent Progress Reports</p>
                          {pastClasses.filter(p => p.student_id === c.id).length === 0 ? (
                            <p className="text-[10px] text-slate-400 italic pl-1">No past reports submitted yet.</p>
                          ) : (
                            pastClasses.filter(p => p.student_id === c.id).map((historyItem: any) => (
                              <div key={historyItem.id} className="p-2 bg-slate-50 rounded-xl border border-slate-100 text-[11px] space-y-1">
                                <div className="flex items-center justify-between text-slate-700 font-bold text-[10px]">
                                  <span>📘 {historyItem.subject}</span>
                                  <span className="text-slate-400 font-mono text-[9px]">
                                    {new Date(historyItem.booking_date).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-slate-400 text-[9px]">Taught by: {historyItem.teachers?.name || 'Staff'}</p>
                                <div className="bg-white p-1.5 rounded border border-slate-100 text-slate-600 text-[10px] leading-relaxed italic mt-1">
                                  "{historyItem.teacher_notes || "Lesson successfully delivered. Performance metrics normal."}"
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="md:col-span-3 space-y-4 h-[550px] flex flex-col">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Review Shared Homework Lockers</label>
                  <select 
                    value={selectedChildLocker} 
                    onChange={e => setSelectedChildLocker(e.target.value)}
                    className="p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
                  >
                    {children.map(c => (
                      <option key={c.id} value={`student_${c.id}`}>{c.name}'s Homework Vault ({c.grade})</option>
                    ))}
                  </select>
                </div>

                <div className="flex-1 border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex flex-col bg-white">
                  {selectedChildLocker && children.length > 0 ? (
                    <FileDirectory folderPath={selectedChildLocker} />
                  ) : (
                    <p className="text-xs text-slate-400 italic text-center py-20 bg-slate-50/50">Add a child to activate homework vault directories.</p>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: BILLING */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              <h1 className="text-xl font-black tracking-tight">Tuition & Billing Hub</h1>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Tuition Cleared (This Month)</span>
                  <p className="text-2xl font-black text-slate-800 mt-1">$420.00</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl">
                  <span className="text-[9px] font-black text-blue-600 uppercase tracking-wider">Upcoming Auto-Invoice Balance</span>
                  <p className="text-2xl font-black text-blue-800 mt-1">$140.00</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* MODAL POPUP FORM COMPONENT */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            
            {!generatedInviteUrl ? (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Add New Child Profile</h3>
                    <p className="text-[10px] text-slate-400">Provisions standalone platform access parameters.</p>
                  </div>
                  <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1">✕</button>
                </div>

                <form onSubmit={handleAddChild} className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase">Full Name</label>
                    <input type="text" required value={childName} onChange={e => setChildName(e.target.value)} placeholder="Emma Johnson" className="p-2.5 border border-slate-200 rounded-xl text-xs bg-white outline-none focus:border-blue-500" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase">Student Login Email ID</label>
                    <input type="email" required value={childEmail} onChange={e => setChildEmail(e.target.value)} placeholder="emma@student.com" className="p-2.5 border border-slate-200 rounded-xl text-xs bg-white outline-none focus:border-blue-500" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase">Grade / Year Level</label>
                    <input type="text" required value={childGrade} onChange={e => setChildGrade(e.target.value)} placeholder="Grade 9" className="p-2.5 border border-slate-200 rounded-xl text-xs bg-white outline-none focus:border-blue-500" />
                  </div>
                  
                  <div className="flex items-center gap-2 pt-2">
                    <button type="button" onClick={handleCloseModal} className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs font-black rounded-xl transition">CANCEL</button>
                    <button type="submit" disabled={addingChild || !parent?.id} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition disabled:bg-slate-300">
                      {addingChild ? 'CREATING...' : 'SAVE CHILD'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="text-center space-y-4 py-2 animate-fadeIn">
                <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto text-xl shadow-xs">
                  🎉
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Account Initialized!</h3>
                  <p className="text-[10px] text-slate-400 mt-1">Share this one-time link with <strong>{childName}</strong> to configure password configurations.</p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl select-all break-all font-mono text-[10px] text-slate-600 text-left">
                  {generatedInviteUrl}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedInviteUrl || '')
                      alert("Link captured on your clipboard!")
                    }}
                    className="py-2 px-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black rounded-lg transition"
                  >
                    📋 Copy Link
                  </button>
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Hi! Here is your setup link for the portal: ${generatedInviteUrl}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black rounded-lg transition flex items-center justify-center"
                  >
                    💬 WhatsApp
                  </a>
                  <a
                    href={`mailto:${childEmail}?subject=Setup your Student Portal Account&body=${encodeURIComponent(`Hi ${childName},\n\nYour parent has initialized your profile. Use this link to finish setting up your student account:\n\n${generatedInviteUrl}`)}`}
                    className="py-2 px-1 bg-slate-700 hover:bg-slate-800 text-white text-[10px] font-black rounded-lg transition flex items-center justify-center"
                  >
                    ✉️ Email
                  </a>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <button 
                    onClick={handleCloseModal}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black rounded-xl transition"
                  >
                    DONE & CLOSE
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

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