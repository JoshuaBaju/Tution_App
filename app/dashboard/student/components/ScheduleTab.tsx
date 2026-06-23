"use client"
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface ClassSession {
  id: string
  subject: string
  topic: string | null
  lesson_date: string
  lesson_time: string
  teacher_name: string
  session_type: 'regular' | 'demo'
}

export default function ScheduleTab({ studentId }: { studentId: string }) {
  const router = useRouter()
  const [upcomingClasses, setUpcomingClasses] = useState<ClassSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadScheduleTrack() {
      if (!studentId) return
      try {
        setLoading(true)
        
        const isoNowString = new Date().toISOString()
        const currentDateString = isoNowString.split('T')[0]

        // 1. Fetch regular structural session channels assigned to the student
        const { data: regularData, error: regularError } = await supabase
          .from('sessions')
          .select(`
            id,
            session_date,
            session_time,
            topic,
            status,
            bookings!inner (
              student,
              subject,
              teachers ( name )
            )
          `)
          .eq('bookings.student', studentId)
          .gte('session_date', currentDateString)

        // 2. Fetch any trial demo bookings where the student profile is tied
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
          .eq('student', studentId)
          .eq('status', 'demo_pending')

        if (regularError) {
          console.error("Error matching student regular schedule streams:", regularError.message)
        }
        if (demoError) {
          console.error("Error tracking student demo slots:", demoError.message)
        }

        // Format standard rows
        const formattedRegulars: ClassSession[] = (regularData || []).map((session: any) => ({
          id: session.id,
          subject: session.bookings?.subject || 'General Mentoring',
          topic: session.topic || 'Core Curriculum Study',
          lesson_date: session.session_date,
          lesson_time: session.session_time,
          teacher_name: session.bookings?.teachers?.name || 'Staff Instructor',
          session_type: 'regular'
        }))

        // Format trial rows
        const formattedDemos: ClassSession[] = (demoData || []).map((demo: any) => ({
          id: demo.id,
          subject: demo.subject || 'Introductory Trial',
          topic: 'Initial Course Placement Assessment',
          lesson_date: demo.demo_booking_date,
          lesson_time: demo.demo_time_slot,
          teacher_name: demo.teachers?.name || 'Evaluating Educator',
          session_type: 'demo'
        }))

        // Combine streams and sort chronologically 
        const unifiedDataset = [...formattedRegulars, ...formattedDemos]
          .sort((a, b) => new Date(a.lesson_date).getTime() - new Date(b.lesson_date).getTime())
        
        setUpcomingClasses(unifiedDataset)

      } catch (err) {
        console.error("Critical scheduling component runtime crash:", err)
      } finally {
        setLoading(false)
      }
    }

    loadScheduleTrack()
  }, [studentId])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-2">
        <span className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mapping Live Schedule Vectors...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">📅 My Schedule</h1>
        <p className="text-xs text-slate-400">Track upcoming syllabus topics, calendar alignments, and digital entry portals.</p>
      </div>

      <div className="space-y-3">
        {upcomingClasses.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-slate-400 font-medium text-xs">
            No future assignments or target lessons mapped to your roster calendar.
          </div>
        ) : (
          upcomingClasses.map((cls) => {
            const isDemo = cls.session_type === 'demo'
            return (
              <div 
                key={cls.id} 
                className={`p-4 border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:shadow-xs ${
                  isDemo 
                    ? 'bg-amber-50/30 border-amber-200/60' 
                    : 'bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider border ${
                      isDemo 
                        ? 'bg-amber-100 border-amber-200 text-amber-800' 
                        : 'bg-blue-50 border-blue-100 text-blue-600'
                    }`}>
                      {cls.subject}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">
                      Instructor: <span className="text-slate-600 font-extrabold">{cls.teacher_name}</span>
                    </span>
                  </div>
                  
                  <h3 className="text-sm font-black text-slate-800 tracking-tight pt-0.5">
                    {cls.topic || 'No custom lesson parameters declared'}
                  </h3>
                  
                  <p className="text-[11px] text-slate-400 font-medium flex items-center gap-3">
                    <span>📅 {cls.lesson_date}</span>
                    <span>⏰ {cls.lesson_time}</span>
                  </p>
                </div>

                {/* 🔒 THE SECURITY ACCESS SWITCH FOOTER CONTAINER */}
                <div className="shrink-0 pt-1 sm:pt-0">
                  {isDemo ? (
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-100/60 border border-amber-200/50 rounded-xl max-w-max">
                      <span className="text-xs">🔒</span>
                      <span className="text-[10px] text-amber-900 font-black uppercase tracking-wider">
                        Join using Parent Account
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => router.push(`/meeting/${cls.id}`)}
                      className="w-full sm:w-auto text-center bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-xs px-4 py-2.5 rounded-xl transition shadow-2xs whitespace-nowrap"
                    >
                      🚀 Launch Classroom
                    </button>
                  )}
                </div>

              </div>
            )
          })
        )}
      </div>

    </div>
  )
}