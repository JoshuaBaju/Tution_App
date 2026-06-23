// app/dashboard/parent/children/page.tsx
"use client"
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Student {
  id: string
  name: string
  grade?: string | number
}

interface ClassroomSession {
  id: string
  booking_id: string
  session_date: string
  session_time: string
  status: string 
  meeting_link: string | null
  feedback: string | null
  assignments: any | null
  subject: string
  teacher_name: string
  session_type: 'regular' | 'demo' // Added to distinctively handle styling flags
}

export default function ManageChildrenTab({ parentId }: { parentId: string }) {
  const [students, setStudents] = useState<Student[]>([])
  const [activeStudentId, setActiveStudentId] = useState<string>('')
  const [sessions, setSessions] = useState<ClassroomSession[]>([])
  
  // Loading States
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [submittingChild, setSubmittingChild] = useState(false)

  // Modal & Invitation Control States
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newChildName, setNewChildName] = useState('')
  const [newChildEmail, setNewChildEmail] = useState('')
  const [newChildGrade, setNewChildGrade] = useState('1')
  const [generatedInviteLink, setGeneratedInviteLink] = useState('')
  const [copied, setCopied] = useState(false)

  // 1. Fetch children tied to this parent profile
  async function loadChildren() {
    setLoadingStudents(true)
    const { data, error } = await supabase
      .from('students')
      .select('id, name, grade')
      .eq('parent', parentId)

    if (error) {
      console.error("Error loading children:", error.message)
    } else if (data && data.length > 0) {
      setStudents(data)
      if (!activeStudentId) {
        setActiveStudentId(data[0].id)
      }
    }
    setLoadingStudents(false)
  }

  useEffect(() => {
    if (parentId) {
      loadChildren()
    }
  }, [parentId])

  // 2. Dual-Query Aggregating Workspace Feeds
  useEffect(() => {
    if (!activeStudentId) return

    async function loadStudentSessions() {
      setLoadingSessions(true)
      
      // Query A: Regular established structural lessons
      const { data: regularData, error: regularError } = await supabase
        .from('sessions')
        .select(`
          id,
          booking_id,
          session_date,
          session_time,
          status,
          meeting_link,
          feedback,
          assignments,
          bookings!inner (
            subject,
            student,
            teachers ( name )
          )
        `)
        .eq('bookings.student', activeStudentId)

      // Query B: Live tracking temporary virtual trial evaluations
      const { data: demoData, error: demoError } = await supabase
        .from('bookings')
        .select(`
          id,
          subject,
          demo_booking_date,
          demo_time_slot,
          status,
          teachers ( name )
        `)
        .eq('student', activeStudentId)
        .eq('status', 'demo_pending')

      if (regularError) {
        console.error("Error loading operational regular sessions:", regularError.message)
      }
      if (demoError) {
        console.error("Error loading evaluation ledger items:", demoError.message)
      }

      // Format arrays uniformly
      const formattedRegulars: ClassroomSession[] = (regularData || []).map((s: any) => ({
        id: s.id,
        booking_id: s.booking_id,
        session_date: s.session_date,
        session_time: s.session_time,
        status: s.status,
        meeting_link: s.meeting_link,
        feedback: s.feedback,
        assignments: s.assignments,
        subject: s.bookings?.subject || 'Academic Lesson',
        teacher_name: s.bookings?.teachers?.name || 'Assigned Tutor',
        session_type: 'regular'
      }))

      const formattedDemos: ClassroomSession[] = (demoData || []).map((d: any) => ({
        id: d.id, // Using booking ID directly as item index unique reference
        booking_id: d.id,
        session_date: d.demo_booking_date,
        session_time: d.demo_time_slot,
        status: 'Trial Pending', // Readable client fallback label override
        meeting_link: null, // Initial entry links handled dynamically or added down down-stream
        feedback: null,
        assignments: null,
        subject: d.subject || 'Introductory Trial',
        teacher_name: d.teachers?.name || 'Evaluating Educator',
        session_type: 'demo'
      }))

      // Merge tables & arrange sequentially based on calendar parameters
      const combinedTimeline = [...formattedRegulars, ...formattedDemos].sort((a, b) => {
        return new Date(a.session_date).getTime() - new Date(b.session_date).getTime()
      })

      setSessions(combinedTimeline)
      setLoadingSessions(false)
    }

    loadStudentSessions()
  }, [activeStudentId])

  // 3. Submit handler to create profile row & generate dynamic invite token link
  const handleCreateChildSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newChildName.trim() || !newChildEmail.trim() || !parentId) return

    setSubmittingChild(true)
    
    const { data, error } = await supabase
      .from('students')
      .insert([
        {
          name: newChildName.trim(),
          email: newChildEmail.trim().toLowerCase(),
          grade: parseInt(newChildGrade, 10),
          parent: parentId
        }
      ])
      .select()

    if (error) {
      alert(`Failed to register profile: ${error.message}`)
    } else if (data && data.length > 0) {
      const targetStudent = data[0]
      const origin = window.location.origin
      const inviteUrl = `${origin}/signup?student_id=${targetStudent.id}&email=${encodeURIComponent(targetStudent.email)}`
      
      setGeneratedInviteLink(inviteUrl)
      await loadChildren()
    }
    setSubmittingChild(false)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedInviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const closeAndResetModal = () => {
    setIsModalOpen(false)
    setNewChildName('')
    setNewChildEmail('')
    setNewChildGrade('1')
    setGeneratedInviteLink('')
    setCopied(false)
  }

  if (loadingStudents) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-2">
        <span className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400">Loading student rosters...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 relative">
      
      {/* HEADER CONTROLS VIEW */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Manage Children</h1>
          <p className="text-sm text-slate-500">Track real-time session progress, video classrooms, and evaluation schedules</p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="self-start sm:self-center px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-xs transition whitespace-nowrap"
        >
          ➕ Add Child Profile
        </button>
      </div>

      {students.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center shadow-xs space-y-4">
          <div className="text-center">
            <span className="text-3xl block mb-2">⚠️</span>
            <h3 className="text-sm font-bold text-amber-900">No Linked Profiles Found</h3>
            <p className="text-xs text-amber-600 mt-1 max-w-sm mx-auto">
              We couldn't locate any children registered to this parent profile ID. Get started by establishing a roster link.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition"
          >
            Register & Invite First Child
          </button>
        </div>
      ) : (
        <>
          {/* WINDOW TABS SELECTOR */}
          <div className="flex border-b border-slate-200 overflow-x-auto bg-slate-50 p-1.5 rounded-xl gap-1">
            {students.map((student) => {
              const isActive = student.id === activeStudentId
              return (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => setActiveStudentId(student.id)}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-blue-600 shadow-xs border border-slate-200/60'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  🧒 {student.name} {student.grade ? `(Grade ${student.grade})` : ''}
                </button>
              )
            })}
          </div>

          {/* SESSIONS TIMETABLE CARD VIEW */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            {loadingSessions ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-2">
                <span className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-slate-400">Syncing database workspaces...</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <span className="text-2xl block">🗓️</span>
                <h4 className="text-sm font-bold text-slate-700">No Live Sessions Active</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  This student doesn't have any pending classroom sessions or demo requests active right now.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border-b pb-3 flex justify-between items-center">
                  <h3 className="text-sm font-black uppercase text-slate-400 tracking-wider">
                    Classroom & Operational Diary
                  </h3>
                  <span className="bg-blue-50 border border-blue-100 text-blue-700 font-bold text-[10px] px-2 py-0.5 rounded-full uppercase">
                    {sessions.length} Items Listed
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {sessions.map((session) => {
                    const isDemo = session.session_type === 'demo'
                    const isPending = session.status === 'pending'
                    const isCompleted = session.status === 'completed'
                    
                    return (
                      <div 
                        key={session.id} 
                        className={`border p-5 rounded-2xl flex flex-col space-y-4 shadow-2xs hover:shadow-xs transition ${
                          isDemo 
                            ? 'border-amber-200 bg-amber-50/20' 
                            : 'border-slate-200 bg-slate-50/30'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 font-black text-xs flex items-center justify-center rounded-xl uppercase ${
                              isDemo ? 'bg-amber-600 text-white' : 'bg-slate-900 text-white'
                            }`}>
                              {session.subject.slice(0, 2)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-slate-800">{session.subject}</h4>
                                {isDemo && (
                                  <span className="bg-amber-100 border border-amber-200 text-amber-800 text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider">
                                    demo
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400">Tutor: <span className="font-semibold text-slate-600">{session.teacher_name}</span></p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-center">
                            <div className="text-right">
                              <span className="text-xs font-bold text-slate-700 block">📅 {session.session_date}</span>
                              <span className="text-[11px] text-slate-400 block">🕒 {session.session_time}</span>
                            </div>
                            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md tracking-wide border ${
                              isDemo
                                ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                                : isCompleted 
                                ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                                : session.status === 'absent'
                                ? 'bg-rose-50 border-rose-100 text-rose-700'
                                : 'bg-blue-50 border-blue-100 text-blue-700'
                            }`}>
                              {session.status}
                            </span>
                          </div>
                        </div>

                        <div className="bg-white border border-slate-100 rounded-xl p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div className="text-xs text-slate-500 font-medium">
                            {isDemo 
                              ? "⏳ Awaiting educator initialization. Once complete, full syllabus strategy options open up here." 
                              : isPending 
                              ? "🔗 Live classroom link configured." 
                              : "📝 Lesson completed. Reviews saved below."
                            }
                          </div>
                          {!isDemo && isPending && session.meeting_link && (
                            <a href={session.meeting_link} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto text-center px-4 py-2 bg-blue-600 text-white font-black text-xs uppercase tracking-wider rounded-lg transition">
                              Launch Video Call 🚀
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* MULTI-STAGE POPUP INVITE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            
            {!generatedInviteLink ? (
              <>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Create & Invite Child</h3>
                  <p className="text-xs text-slate-400">Add information details below to build an account claim invitation link.</p>
                </div>

                <form onSubmit={handleCreateChildSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase font-black tracking-wider text-slate-400 block">Child's Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Jason Doe"
                      value={newChildName}
                      onChange={(e) => setNewChildName(e.target.value)}
                      className="w-full text-sm font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-blue-500 bg-slate-50/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] uppercase font-black tracking-wider text-slate-400 block">Child's Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. jason@school.com"
                      value={newChildEmail}
                      onChange={(e) => setNewChildEmail(e.target.value)}
                      className="w-full text-sm font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-blue-500 bg-slate-50/50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] uppercase font-black tracking-wider text-slate-400 block">Grade Level</label>
                    <select
                      value={newChildGrade}
                      onChange={(e) => setNewChildGrade(e.target.value)}
                      className="w-full text-sm font-bold border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-hidden focus:border-blue-500 bg-white"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                        <option key={g} value={g}>Grade {g}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <button type="button" onClick={closeAndResetModal} className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition">
                      Cancel
                    </button>
                    <button type="submit" disabled={submittingChild} className="px-4 py-2 text-xs font-black uppercase tracking-wide text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl transition">
                      {submittingChild ? "Generating..." : "Generate Invite Link 🔗"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="text-center py-2 space-y-1">
                  <span className="text-3xl block">🎉</span>
                  <h3 className="text-lg font-black text-slate-900">Invite Code Ready!</h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Share this custom link with <span className="font-bold text-slate-700">{newChildName}</span>. They can use it to set their password.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 p-2 rounded-xl">
                  <input
                    type="text"
                    readOnly
                    value={generatedInviteLink}
                    className="bg-transparent text-xs text-slate-500 overflow-x-auto select-all font-mono px-1 flex-1 outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    className={`px-3 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-lg transition ${
                      copied ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'
                    }`}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block text-center">Or dispatch directly via:</span>
                  <div className="grid grid-cols-3 gap-2">
                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Hey! Here is your workspace profile activation link: ${generatedInviteLink}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-center p-2 border border-slate-100 bg-emerald-50/40 rounded-xl flex flex-col items-center gap-1 transition hover:scale-105"
                    >
                      💬 
                      <span className="text-[10px] font-bold text-slate-600">WhatsApp</span>
                    </a>

                    <a
                      href={`https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent("Your Tutoring Workspace Activation Link")}&body=${encodeURIComponent(`Hi,\n\nYour profile has been built. Open this link to claim your profile and set a security password:\n\n${generatedInviteLink}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-center p-2 border border-slate-100 bg-rose-50/40 rounded-xl flex flex-col items-center gap-1 transition hover:scale-105"
                    >
                      ✉️ 
                      <span className="text-[10px] font-bold text-slate-600">Gmail</span>
                    </a>

                    <a
                      href={`https://www.facebook.com/dialog/send?link=${encodeURIComponent(generatedInviteLink)}&app_id=123456789&redirect_uri=${encodeURIComponent(generatedInviteLink)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-center p-2 border border-slate-100 bg-blue-50/40 rounded-xl flex flex-col items-center gap-1 transition hover:scale-105"
                    >
                      ⚡ 
                      <span className="text-[10px] font-bold text-slate-600">Messenger</span>
                    </a>
                  </div>
                </div>

                <div className="border-t pt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={closeAndResetModal}
                    className="w-full sm:w-auto px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition hover:bg-slate-200"
                  >
                    Done & Close
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  )
}