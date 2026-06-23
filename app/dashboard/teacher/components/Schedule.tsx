// app/dashboard/teacher/components/Schedule.tsx
"use client"
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface BookingSession {
  id: string
  session_date: string 
  session_time: string
  status: string
  subject: string
  student_name: string
  session_type: 'regular' | 'demo' // Added flag to control conditional accent colors
}

export default function Schedule({ teacherId }: { teacherId: string }) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [sessions, setSessions] = useState<BookingSession[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    async function fetchTeacherSchedule() {
      setLoading(true)
      
      // Query A: Fetch standard structural session records
      const { data: regularData, error: regularError } = await supabase
        .from('sessions')
        .select(`
          id,
          session_date,
          session_time,
          status,
          bookings!inner (
            subject,
            teacher,
            students ( name )
          )
        `)
        .eq('bookings.teacher', teacherId)

      // Query B: Fetch standalone live evaluation trial bookings
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
        console.error("Error retrieving calendar profiles:", regularError.message)
      }
      if (demoError) {
        console.error("Error retrieving pending demos:", demoError.message)
      }

      // Process and format standard structural sessions
      const formattedRegulars: BookingSession[] = (regularData || []).map((s: any) => ({
        id: s.id,
        session_date: s.session_date,
        session_time: s.session_time,
        status: s.status,
        subject: s.bookings?.subject || 'Lesson',
        student_name: s.bookings?.students?.name || 'Student',
        session_type: 'regular'
      }))

      // Process and format un-instantiated demo records
      const formattedDemos: BookingSession[] = (demoData || []).map((d: any) => ({
        id: d.id,
        session_date: d.demo_booking_date,
        session_time: d.demo_time_slot,
        status: 'pending',
        subject: d.subject || 'Introductory Trial',
        student_name: d.students?.name || 'Student',
        session_type: 'demo'
      }))

      // Merge both datasets together into a single master timeline array
      setSessions([...formattedRegulars, ...formattedDemos])
      setLoading(false)
    }

    if (teacherId) fetchTeacherSchedule()
  }, [teacherId])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Sunday-to-Saturday calculation logic
  const firstDayOfMonth = new Date(year, month, 1).getDay() 
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const monthsList = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  const getSessionsForDate = (dayNumber: number): BookingSession[] => {
    const formattedDay = String(dayNumber).padStart(2, '0')
    const formattedMonth = String(month + 1).padStart(2, '0')
    return sessions.filter((s) => s.session_date === `${year}-${formattedMonth}-${formattedDay}`)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-3">
        <span className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Syncing Master Timetable...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      
      {/* Calendar Header Banner */}
      <div className="bg-slate-900 border border-slate-800 px-6 py-4 rounded-2xl flex justify-between items-center shadow-xs">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">{monthsList[month]} {year}</h2>
          <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Operational Master Timetable</p>
        </div>
        <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 font-black text-xs px-3 py-1 rounded-full uppercase">
          {sessions.length} Lessons Active
        </span>
      </div>

      {/* Days of the Week Header Row: SUNDAY TO SATURDAY */}
      <div className="grid grid-cols-7 gap-2 text-center border-b border-slate-100 pb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <span key={day} className="text-[10px] uppercase font-black tracking-widest text-slate-400">
            {day}
          </span>
        ))}
      </div>

      {/* Main Calendar Grid Matrix */}
      <div className="grid grid-cols-7 gap-2 auto-rows-[120px]">
        
        {/* Render empty initial space pads */}
        {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
          <div key={`empty-${idx}`} className="bg-slate-50 border border-dashed border-slate-200/60 rounded-xl" />
        ))}

        {/* Render active month dates */}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const currentDayNumber = idx + 1
          const daySessions = getSessionsForDate(currentDayNumber)
          const hasBookings = daySessions.length > 0
          
          // Detect if this specific day contains any live evaluation trials
          const containsDemo = daySessions.some(s => s.session_type === 'demo')

          const currentColumnIndex = (firstDayOfMonth + idx) % 7
          const isLeftEdgeColumn = currentColumnIndex === 0

          return (
            <div
              key={`day-${currentDayNumber}`}
              className={`relative rounded-xl p-2 border flex flex-col justify-between transition-all duration-150 group ${
                hasBookings
                  ? containsDemo
                    ? 'bg-amber-50/40 border-amber-200 hover:bg-white hover:border-amber-500 hover:shadow-xl cursor-pointer'
                    : 'bg-blue-50/40 border-blue-200 hover:bg-white hover:border-blue-600 hover:shadow-xl cursor-pointer'
                  : 'bg-slate-100/60 border-slate-200/40 text-slate-400 opacity-40'
              }`}
            >
              {/* Date Indicator Tag Line */}
              <div className="flex justify-between items-center">
                <span className={`text-xs font-black ${
                  hasBookings ? (containsDemo ? 'text-amber-700' : 'text-blue-600') : 'text-slate-400'
                }`}>
                  {currentDayNumber}
                </span>
                {hasBookings && (
                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                    containsDemo ? 'text-amber-800 bg-amber-100' : 'text-blue-600 bg-blue-100/70'
                  }`}>
                    {daySessions.length} Cls
                  </span>
                )}
              </div>

              {/* Standard Inline Flat Listing Representation Area */}
              <div className="flex-1 mt-1.5 space-y-1 overflow-hidden group-hover:opacity-0 transition-opacity">
                {daySessions.slice(0, 2).map((s) => {
                  const isDemoRow = s.session_type === 'demo'
                  return (
                    <p key={s.id} className={`text-[10px] font-bold truncate ${isDemoRow ? 'text-amber-800' : 'text-slate-700'}`}>
                      {isDemoRow ? '🔸' : '📚'} {s.subject.split(' ')[0]} @ {s.session_time.split(' - ')[0].replace(':00', '')}
                    </p>
                  )
                })}
                {daySessions.length > 2 && (
                  <p className={`text-[9px] font-black pl-1 ${containsDemo ? 'text-amber-700' : 'text-blue-600'}`}>
                    +{daySessions.length - 2} more...
                  </p>
                )}
              </div>

              {/* ENLARGED HOVER OVERLAY DISPLAY BLOCK */}
              {hasBookings && (
                <div className={`absolute hidden group-hover:flex flex-col z-50 bottom-full mb-2 w-64 bg-white border-2 p-4 rounded-2xl shadow-2xl space-y-2.5 animate-in fade-in zoom-in-95 duration-100 ${
                  containsDemo ? 'border-amber-500' : 'border-blue-600'
                } ${
                  isLeftEdgeColumn ? 'left-0 translate-x-0' : 'left-1/2 -translate-x-1/2'
                }`}>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                    <span className={`text-xs font-black ${containsDemo ? 'text-amber-700' : 'text-blue-600'}`}>
                      Date Matrix Day #{currentDayNumber}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">{monthsList[month].slice(0,3)}</span>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {daySessions.map((session) => {
                      const isItemDemo = session.session_type === 'demo'
                      return (
                        <div 
                          key={session.id} 
                          className={`border rounded-lg p-2 text-[11px] space-y-0.5 text-left ${
                            isItemDemo ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50 border border-slate-200'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1">
                              <span className="font-black text-slate-900 truncate max-w-[110px]">{session.subject}</span>
                              {isItemDemo && (
                                <span className="text-[8px] bg-amber-100 border border-amber-200 text-amber-800 px-1 py-0.2 rounded font-black uppercase tracking-wide">Demo</span>
                              )}
                            </div>
                            <span className={`text-[9px] font-mono font-bold px-1 rounded ${
                              isItemDemo ? 'text-amber-800 bg-white border border-amber-200' : 'text-blue-600 bg-blue-50'
                            }`}>
                              {session.session_time.split(' - ')[0]}
                            </span>
                          </div>
                          <p className="text-slate-500 text-xs font-medium">🧑‍🎓 Student: {session.student_name}</p>
                          <p className="text-[9px] text-slate-400 font-mono tracking-tight">{session.session_time}</p>
                        </div>
                      )
                    })}
                  </div>
                  {/* Tail Indicator placement code */}
                  <div className={`absolute top-full w-3 h-3 bg-white border-r-2 border-b-2 rotate-45 -mt-1.5 ${
                    containsDemo ? 'border-amber-500' : 'border-blue-600'
                  } ${
                    isLeftEdgeColumn ? 'left-6' : 'left-1/2 -translate-x-1/2'
                  }`} />
                </div>
              )}

            </div>
          )
        })}
      </div>

      {/* Base Navigation Control Bar Row */}
      <div className="flex justify-between items-center pt-4 border-t border-slate-100">
        <button
          onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-black uppercase tracking-wider rounded-xl transition"
        >
          ◀️ Previous Month
        </button>
        <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest bg-slate-50 border border-slate-200/60 px-4 py-2 rounded-xl">
          Sunday ➔ Saturday Grid
        </div>
        <button
          onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-black uppercase tracking-wider rounded-xl transition"
        >
          Next Month ▶️
        </button>
      </div>

    </div>
  )
}