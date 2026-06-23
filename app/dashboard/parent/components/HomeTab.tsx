"use client"
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface OverviewSession {
  id: string
  session_date: string
  session_time: string
  status: string
  feedback: string | null
  assignments: any | null
  subject: string
  teacher_name: string
  student_name: string
  session_type: 'regular' | 'demo' // Flag to cleanly isolate styling setups
}

export default function HomeTab({ parentId }: { parentId: string }) {
  const router = useRouter()
  const [upcomingSessions, setUpcomingSessions] = useState<OverviewSession[]>([])
  const [pastFeedbacks, setPastFeedbacks] = useState<OverviewSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!parentId) return

    async function loadParentOverviewData() {
      setLoading(true)
      
      // Query A: Fetch standard structural sessions deep filtered by parent identifier
      const { data: regularData, error: regularError } = await supabase
        .from('sessions')
        .select(`
          id,
          session_date,
          session_time,
          status,
          feedback,
          assignments,
          bookings!inner (
            subject,
            students!inner (
              name,
              parent
            ),
            teachers ( name )
          )
        `)
        .eq('bookings.students.parent', parentId)

      // Query B: Fetch live trial blocks requested directly from bookings
      const { data: demoData, error: demoError } = await supabase
        .from('bookings')
        .select(`
          id,
          subject,
          demo_booking_date,
          demo_time_slot,
          status,
          students!inner (
            name,
            parent
          ),
          teachers ( name )
        `)
        .eq('students.parent', parentId)
        .eq('status', 'demo_pending')

      if (regularError) {
        console.error("Error loading dashboard regular records:", regularError.message)
      }
      if (demoError) {
        console.error("Error loading evaluation ledger info:", demoError.message)
      }

      // Format standard sessions cleanly
      const formattedRegulars: OverviewSession[] = (regularData || []).map((s: any) => ({
        id: s.id,
        session_date: s.session_date,
        session_time: s.session_time,
        status: s.status,
        feedback: s.feedback,
        assignments: s.assignments,
        subject: s.bookings?.subject || 'Academic Lesson',
        teacher_name: s.bookings?.teachers?.name || 'Assigned Tutor',
        student_name: s.bookings?.students?.name || 'Child Profile',
        session_type: 'regular'
      }))

      // Format trial bookings using a fallback object schema match
      const formattedDemos: OverviewSession[] = (demoData || []).map((d: any) => ({
        id: d.id,
        session_date: d.demo_booking_date,
        session_time: d.demo_time_slot,
        status: 'pending', // Keeps filter matching predictable for upcoming queues
        feedback: null,
        assignments: null,
        subject: d.subject || 'Introductory Trial',
        teacher_name: d.teachers?.name || 'Evaluating Educator',
        student_name: d.students?.name || 'Child Profile',
        session_type: 'demo'
      }))

      // Combine both streams together cleanly
      const unifiedDataset = [...formattedRegulars, ...formattedDemos]

      // Sort and separate upcoming items chronologically
      const upcoming = unifiedDataset
        .filter(s => s.status === 'pending')
        .sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime())

      // Filter and reverse chronological layout for past performance feedbacks
      const completedFeedback = formattedRegulars
        .filter(s => s.status === 'completed' && s.feedback)
        .sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime())

      setUpcomingSessions(upcoming)
      setPastFeedbacks(completedFeedback)
      setLoading(false)
    }

    loadParentOverviewData()
  }, [parentId])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-2 bg-white border border-slate-200 rounded-3xl">
        <span className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400">Compiling household timelines...</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Workspace Overview</h1>
        <p className="text-sm text-slate-500">A centralized review log monitoring academic progressions across your household</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* UPCOMING CLASSES */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="border-b pb-2.5 flex justify-between items-center">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">🗓️ Upcoming Live Classes</h3>
            <span className="bg-blue-50 text-blue-700 font-bold text-[10px] px-2 py-0.5 rounded-md">
              {upcomingSessions.length} Pending
            </span>
          </div>

          {upcomingSessions.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8 italic">No upcoming session blocks scheduled right now.</p>
          ) : (
            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {upcomingSessions.map((session) => {
                const isDemo = session.session_type === 'demo'
                return (
                  <div 
                    key={session.id} 
                    className={`border p-3.5 rounded-xl space-y-3 transition ${
                      isDemo 
                        ? 'bg-amber-50/40 border-amber-200/70 shadow-2xs' 
                        : 'bg-slate-50/50 border-slate-100'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-800">{session.subject}</h4>
                          {isDemo && (
                            <span className="bg-amber-100 border border-amber-200 text-amber-800 text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider scale-95">
                              demo
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">Student: <span className="font-semibold text-slate-600">🧒 {session.student_name}</span></p>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded border border-mono ${
                        isDemo 
                          ? 'text-amber-800 bg-white border-amber-200' 
                          : 'text-slate-700 bg-white border-slate-200/60'
                      }`}>
                        {session.session_time}
                      </span>
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-400 font-medium border-b border-slate-100/60 pb-2">
                      <span>Tutor: {session.teacher_name}</span>
                      <span className={isDemo ? "text-amber-700 font-bold" : "text-blue-600 font-bold"}>
                        📅 {session.session_date}
                      </span>
                    </div>

                    {/* ⚡ THE CONDITIONAL ACCESS CONTROLLER FOOTER BLOCK */}
                    <div className="pt-0.5">
                      {isDemo ? (
                        <button
                          type="button"
                          onClick={() => router.push(`/meeting/${session.id}`)}
                          className="w-full text-center py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-xs uppercase tracking-wider rounded-lg transition shadow-xs"
                        >
                          🚀 Launch Trial Lesson
                        </button>
                      ) : (
                        <div className="w-full flex items-center justify-between px-2.5 py-1.5 bg-slate-150/40 rounded-lg border border-slate-200/40">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">💻 Child Profile Workspace</span>
                          <span className="text-[10px] bg-slate-200/80 text-slate-500 font-mono font-black px-1.5 py-0.5 rounded uppercase">Student Only</span>
                        </div>
                      )}
                    </div>

                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ACADEMIC FEEDBACK */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="border-b pb-2.5 flex justify-between items-center">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">📝 Recent Academic Feedback</h3>
            <span className="bg-purple-50 text-purple-700 font-bold text-[10px] px-2 py-0.5 rounded-md">
              {pastFeedbacks.length} Reviews logged
            </span>
          </div>

          {pastFeedbacks.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8 italic">Completed lesson performance metrics haven't been published yet.</p>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {pastFeedbacks.map((report) => (
                <div key={report.id} className="border border-slate-100 bg-slate-50/30 p-4 rounded-xl space-y-2.5">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-100/60 px-2 py-0.5 rounded-md uppercase tracking-wide mr-2">
                        {report.subject}
                      </span>
                      <span className="text-xs font-black text-slate-800">🧒 {report.student_name}</span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-400">
                      Reviewed on {report.session_date}
                    </span>
                  </div>

                  <div className="bg-white border border-slate-100 p-3 rounded-lg">
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                      {report.feedback}
                    </p>
                  </div>

                  <p className="text-[10px] text-right text-slate-400 font-medium">
                    Submitted by Educator: <span className="text-slate-600 font-semibold">{report.teacher_name}</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}