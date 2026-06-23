"use client"
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface HomeSession {
  id: string
  subject: string
  topic: string | null
  lesson_date: string
  lesson_time: string
  teacher_name: string
  session_type: 'regular' | 'demo'
}

export default function HomeTab({ studentId }: { studentId: string }) {
  const router = useRouter()
  const [weeklyClasses, setWeeklyClasses] = useState<HomeSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadWeeklySchedule() {
      if (!studentId) return
      try {
        setLoading(true)
        
        // Calculate the one-week timeline windows
        const today = new Date()
        const oneWeekFromNow = new Date()
        oneWeekFromNow.setDate(today.getDate() + 7)

        const todayStr = today.toISOString().split('T')[0]
        const nextWeekStr = oneWeekFromNow.toISOString().split('T')[0]

        // Query A: Get regular sessions scheduled within the 7-day window
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
          .gte('session_date', todayStr)
          .lte('session_date', nextWeekStr)

        // Query B: Get pending trial slots
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
          .gte('demo_booking_date', todayStr)
          .lte('demo_booking_date', nextWeekStr)

        if (regularError) console.error("Error query group regular:", regularError.message)
        if (demoError) console.error("Error query group demo:", demoError.message)

        // Format and flatten the streams
        const formattedRegulars: HomeSession[] = (regularData || []).map((s: any) => ({
          id: s.id,
          subject: s.bookings?.subject || 'Academic Lesson',
          topic: s.topic || 'Core Curriculum Study',
          lesson_date: s.session_date,
          lesson_time: s.session_time,
          teacher_name: s.bookings?.teachers?.name || 'Staff Instructor',
          session_type: 'regular'
        }))

        const formattedDemos: HomeSession[] = (demoData || []).map((d: any) => ({
          id: d.id,
          subject: d.subject || 'Introductory Trial',
          topic: 'Initial Placement & Core Evaluation',
          lesson_date: d.demo_booking_date,
          lesson_time: d.demo_time_slot,
          teacher_name: d.teachers?.name || 'Evaluating Educator',
          session_type: 'demo'
        }))

        // Merge and sort everything chronologically
        const combinedSorted = [...formattedRegulars, ...formattedDemos]
          .sort((a, b) => new Date(a.lesson_date).getTime() - new Date(b.lesson_date).getTime())

        setWeeklyClasses(combinedSorted)
      } catch (err) {
        console.error("Home launchpad timeline initialization failure:", err)
      } finally {
        setLoading(false)
      }
    }

    loadWeeklySchedule()
  }, [studentId])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-2">
        <span className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Syncing Launchpad Timelines...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">🏠 Home Base</h1>
        <p className="text-xs text-slate-400">Welcome back! Here is a review of your scheduled operations for the next 7 days.</p>
      </div>

      {weeklyClasses.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
          <p className="text-sm text-slate-400 font-medium italic">No active workspace targets mapped to your calendar this week.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">🗓️ 7-Day Quick Launch Queue</h3>
            <span className="bg-indigo-50 text-indigo-700 font-bold text-[10px] px-2 py-0.5 rounded-md">
              {weeklyClasses.length} Sessions Total
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {weeklyClasses.map((cls) => {
              const isDemo = cls.session_type === 'demo'
              return (
                <div 
                  key={cls.id} 
                  className={`p-5 rounded-2xl border transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isDemo 
                      ? 'bg-amber-50/30 border-amber-200/60' 
                      : 'bg-white border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider border ${
                        isDemo 
                          ? 'bg-amber-100 border-amber-200 text-amber-800' 
                          : 'bg-indigo-50 border-indigo-100 text-indigo-600'
                      }`}>
                        {cls.subject}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">
                        Instructor: <span className="text-slate-600 font-extrabold">{cls.teacher_name}</span>
                      </span>
                    </div>

                    <h3 className="text-sm font-black text-slate-800 tracking-tight">
                      {cls.topic}
                    </h3>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                      <span>📅 {cls.lesson_date}</span>
                      <span>•</span>
                      <span>⏰ {cls.lesson_time}</span>
                    </div>
                  </div>

                  {/* Access Controller */}
                  <div className="shrink-0 pt-1 sm:pt-0">
                    {isDemo ? (
                      <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-100/60 border border-amber-200/50 rounded-xl">
                        <span className="text-xs">🔒</span>
                        <span className="text-[10px] text-amber-900 font-black uppercase tracking-wider">
                          Join using Parent Account
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => router.push(`/meeting/${cls.id}`)}
                        className="w-full sm:w-auto text-center bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-black text-xs px-5 py-2.5 rounded-xl transition shadow-2xs whitespace-nowrap"
                      >
                        🚀 Enter Classroom
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}