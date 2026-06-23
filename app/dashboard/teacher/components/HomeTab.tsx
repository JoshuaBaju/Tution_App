"use client"
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface TeacherSession {
  id: string
  session_date: string
  session_time: string
  status: string
  subject: string
  topic: string | null
  student_name: string
  session_type: 'regular' | 'demo'
}

export default function HomeTab({ teacherId }: { teacherId: string }) {
  const router = useRouter()
  const [upcomingSessions, setUpcomingSessions] = useState<TeacherSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!teacherId) return

    async function loadTeacherUpcomingSchedule() {
      setLoading(true)

      const isoNowString = new Date().toISOString()
      const currentDateString = isoNowString.split('T')[0]

      // Query A: Fetch regular structured sessions assigned to this teacher
      const { data: regularData, error: regularError } = await supabase
        .from('sessions')
        .select(`
          id,
          session_date,
          session_time,
          status,
          topic,
          bookings!inner (
            subject,
            students ( name )
          )
        `)
        .eq('bookings.teacher', teacherId)
        .gte('session_date', currentDateString)

      // Query B: Fetch live trial demo blocks requested from bookings
      const { data: demoData, error: demoError } = await supabase
        .from('bookings')
        .select(`
          id,
          subject,
          demo_booking_date,
          demo_time_slot,
          status,
          students ( name )
        `)
        .eq('teacher', teacherId)
        .eq('status', 'demo_pending')

      if (regularError) {
        console.error("Error fetching teacher regular classes:", regularError.message)
      }
      if (demoError) {
        console.error("Error fetching teacher trial bookings:", demoError.message)
      }

      // Format standard sessions cleanly
      const formattedRegulars: TeacherSession[] = (regularData || []).map((s: any) => ({
        id: s.id,
        session_date: s.session_date,
        session_time: s.session_time,
        status: s.status,
        subject: s.bookings?.subject || 'Academic Lesson',
        topic: s.topic || 'General Curriculum',
        student_name: s.bookings?.students?.name || 'Student Profile',
        session_type: 'regular'
      }))

      // Format trial bookings
      const formattedDemos: TeacherSession[] = (demoData || []).map((d: any) => ({
        id: d.id,
        session_date: d.demo_booking_date,
        session_time: d.demo_time_slot,
        status: 'pending',
        subject: d.subject || 'Introductory Trial',
        topic: 'Initial Assessment & Evaluation',
        student_name: d.students?.name || 'Prospective Student',
        session_type: 'demo'
      }))

      // Merge and sort chronologically (closest date/time first)
      const unifiedSchedule = [...formattedRegulars, ...formattedDemos]
        .filter(s => s.status === 'pending')
        .sort((a, b) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime())

      setUpcomingSessions(unifiedSchedule)
      setLoading(false)
    }

    loadTeacherUpcomingSchedule()
  }, [teacherId])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-2 bg-white border border-slate-200 rounded-3xl">
        <span className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400">Syncing live roster schedules...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Educator Dashboard</h1>
        <p className="text-xs text-slate-500">Launch and manage your live interactive whiteboards and student channels.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="border-b pb-3 flex justify-between items-center">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">🗓️ Upcoming Scheduled Classes</h3>
          <span className="bg-blue-50 text-blue-700 font-bold text-[10px] px-2 py-0.5 rounded-md">
            {upcomingSessions.length} Total Batches
          </span>
        </div>

        {upcomingSessions.length === 0 ? (
          <div className="text-center py-12 text-slate-400 font-medium text-xs italic">
            No upcoming lessons or live evaluation demos registered on your calendar.
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingSessions.map((session) => {
              const isDemo = session.session_type === 'demo'
              return (
                <div 
                  key={session.id} 
                  className={`p-4 border rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition hover:shadow-xs ${
                    isDemo 
                      ? 'bg-amber-50/40 border-amber-200/60' 
                      : 'bg-slate-50/40 border-slate-200/70'
                  }`}
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider border ${
                        isDemo 
                          ? 'bg-amber-100 border-amber-200 text-amber-800' 
                          : 'bg-blue-50 border-blue-100 text-blue-600'
                      }`}>
                        {session.subject}
                      </span>
                      {isDemo && (
                        <span className="bg-rose-50 border border-rose-100 text-rose-700 text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-widest animate-pulse">
                          Trial Demo
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-black text-slate-800 tracking-tight truncate">
                      {session.topic}
                    </h4>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium flex-wrap">
                      <p>Student: <span className="text-slate-600 font-semibold">🧒 {session.student_name}</span></p>
                      <span className="text-slate-300">•</span>
                      <p>📅 {session.session_date}</p>
                      <span className="text-slate-300">•</span>
                      <p>⏰ {session.session_time}</p>
                    </div>
                  </div>

                  {/* Universal Workspace Entry Gateway */}
                  <button
                    type="button"
                    onClick={() => router.push(`/meeting/${session.id}`)}
                    className={`w-full md:w-auto text-center font-black text-xs px-5 py-2.5 rounded-xl transition shadow-xs shrink-0 ${
                      isDemo 
                        ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    🚀 Launch Session
                  </button>

                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}