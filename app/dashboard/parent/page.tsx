// app/dashboard/parent/page.tsx
"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import FileDirectory from '@/app/meeting/components/FileDirectory'

type Tab = 'overview' | 'children' | 'billing'

export default function ParentDashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [parentId, setParentId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Core Data States
  const [parent, setParent] = useState<any>(null)
  const [children, setChildren] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [pastClasses, setPastClasses] = useState<any[]>([])
  
  // Interaction and Modal States
  const [selectedChildFilter, setSelectedChildFilter] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [childName, setChildName] = useState('')
  const [childEmail, setChildEmail] = useState('')
  const [childGrade, setChildGrade] = useState('')
  const [addingChild, setAddingChild] = useState(false)
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState<string | null>(null)
  const [selectedChildLocker, setSelectedChildLocker] = useState('')

  async function loadParentData(userId: string) {
    try {
      setLoading(true)
      const { data: profile } = await supabase
        .from('parents')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      
      if (!profile) {
        setParent({ name: 'Guardian Account', id: userId })
        return
      }
      setParent(profile)

      const { data: students } = await supabase
        .from('students')
        .select('*')
        .eq('parent', profile.id)
      
      if (students) {
        setChildren(students)
        if (students.length > 0) {
          setSelectedChildLocker(`student_${students[0].id}`)
        }
      }

      const { data: upcomingData } = await supabase
        .from('bookings')
        .select('id, booking_date, status, subject, student_id, students (name), teachers (name)')
        .eq('parent', profile.id)
        .eq('status', 'confirmed')
        .order('booking_date', { ascending: true })
        
      setBookings(upcomingData || [])

      const { data: historicalData } = await supabase
        .from('bookings')
        .select('id, booking_date, subject, student_id, teacher_notes, teachers (name)')
        .eq('parent', profile.id)
        .eq('status', 'completed')
        .order('booking_date', { ascending: false })

      setPastClasses(historicalData || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    async function syncSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setParentId(session.user.id)
        await loadParentData(session.user.id)
      }
    }
    syncSession()
  }, [])

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!parent?.id || !childName || !childEmail || !childGrade) return
    
    setAddingChild(true)
    const { error: dbError } = await supabase
      .from('students')
      .insert([{ name: childName, email: childEmail, grade: childGrade, parent: parent.id }])

    if (dbError) {
      alert("Failed to register child profile: " + dbError.message)
      setAddingChild(false)
    } else {
      const inviteUrl = `${window.location.origin}/signup?token=student&email=${encodeURIComponent(childEmail)}`
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

  if (!parentId) return null

  const displayedBookings = selectedChildFilter 
    ? bookings.filter(b => b.student_id === selectedChildFilter)
    : bookings

  return (
    <>
      {/* 1. PORTAL SLOT PASSING RIGHT INTO INTERACTIVE LAYOUT SIDEBAR ELEMENT BLOCK */}
      <nav className="flex flex-row sm:flex-col gap-1 overflow-x-auto sm:overflow-x-visible pb-2 sm:pb-0">
        <button
          onClick={() => setActiveTab('overview')}
          className={`w-full whitespace-nowrap flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeTab === 'overview' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          🏠 Overview
        </button>
        <button
          onClick={() => setActiveTab('children')}
          className={`w-full whitespace-nowrap flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeTab === 'children' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          🧒 Manage Children
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`w-full whitespace-nowrap flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeTab === 'billing' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          💳 Billing & Invoices
        </button>
      </nav>

      {/* 2. RENDERING PIPELINE TARGETED INTO CENTRAL CANVAS ATTACHMENT VIEWPORT */}
      {typeof window !== 'undefined' && document.getElementById('parent-main-viewport') ? (
        require('react-dom').createPortal(
          <div className="space-y-6 animate-in fade-in duration-150">
            {loading ? (
              <div className="py-20 text-center text-slate-400 font-medium text-xs uppercase tracking-widest animate-pulse">
                Syncing Database Metrics...
              </div>
            ) : (
              <>
                {/* TAB 1: OVERVIEW TIMELINE */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
                      <div>
                        <h1 className="text-xl font-black tracking-tight">Family Schedule Blueprint</h1>
                        <p className="text-xs text-slate-500 mt-0.5">Track live virtual classrooms and manage appointment windows.</p>
                      </div>
                      <button
                        onClick={() => router.push('/dashboard/parent/booking')}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider px-5 py-3 rounded-xl transition shadow-md flex items-center justify-center gap-2 self-start sm:self-auto"
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
                                        <span className="text-slate-400 font-mono text-[9px]">{new Date(historyItem.booking_date).toLocaleDateString()}</span>
                                      </div>
                                      <p className="text-slate-400 text-[9px]">Taught by: {historyItem.teachers?.name || 'Staff'}</p>
                                      <div className="bg-white p-1.5 rounded border border-slate-100 text-slate-600 text-[10px] italic mt-1">
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
              </>
            )}
          </div>,
          document.getElementById('parent-main-viewport')!
        )
      ) : null}

      {/* MODAL POPUP COMPONENT (Kept in standard component tree loop) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            {!generatedInviteUrl ? (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Add New Child Profile</h3>
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
                    <button type="submit" disabled={addingChild} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition">
                      {addingChild ? 'CREATING...' : 'SAVE CHILD'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="text-center space-y-4 py-2">
                <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto text-xl">🎉</div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Account Initialized!</h3>
                  <p className="text-[10px] text-slate-400 mt-1">Share this one-time link with <strong>{childName}</strong> to build profile setup parameters.</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl select-all break-all font-mono text-[10px] text-slate-600 text-left">
                  {generatedInviteUrl}
                </div>
                <button onClick={handleCloseModal} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black rounded-xl transition">
                  DONE & CLOSE
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}