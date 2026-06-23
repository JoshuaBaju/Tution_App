"use client"
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function ReportsTab({ studentId }: { studentId: string }) {
  const [completedClasses, setCompletedClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCompletionsReport() {
      if (!studentId) return
      const { data } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          subject,
          teacher_notes,
          teachers (name)
        `)
        .eq('student_id', studentId)
        .eq('status', 'completed')
        .order('booking_date', { ascending: false })

      setCompletedClasses(data || [])
      setLoading(false)
    }
    loadCompletionsReport()
  }, [studentId])

  if (loading) return <div className="text-xs text-slate-400 font-bold animate-pulse">Assembling Progress Metrics...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">📜 Progress Reports & Notes</h1>
        <p className="text-xs text-slate-400">Review class log archives and summary evaluations completed by your instructors.</p>
      </div>

      <div className="space-y-3">
        {completedClasses.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-12 border border-dashed rounded-2xl bg-slate-50/50">
            No historical session completions tracked on your student profile yet.
          </p>
        ) : (
          completedClasses.map((b: any) => (
            <div key={b.id} className="p-4 border border-slate-100 rounded-2xl bg-white space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                <div>
                  <span className="text-[9px] font-black uppercase bg-slate-100 px-2 py-0.5 rounded text-slate-500 tracking-wider">
                    {b.subject || "General Mentoring"}
                  </span>
                  <p className="text-[11px] font-bold text-slate-400 mt-1">Instructor: <span className="text-slate-700">{b.teachers?.name || "Staff Tutor"}</span></p>
                </div>
                <span className="text-[10px] text-slate-400 font-mono bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                  🗓️ {new Date(b.booking_date).toLocaleDateString()}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Lesson Summary & Homework Targets:</span>
                <div className="bg-slate-50 p-3 rounded-xl text-xs text-slate-600 border border-slate-100 italic leading-relaxed">
                  "{b.teacher_notes || "Session completed successfully. Core targets met across runtime parameters."}"
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}