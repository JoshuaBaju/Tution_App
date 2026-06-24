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
  session_type: 'regular' | 'demo'
  proposed_topic?: string // Major Topic from bookings
  topic?: string          // Minor Topic from sessions
}

export default function Schedule({ teacherId }: { teacherId: string }) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [sessions, setSessions] = useState<BookingSession[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // Track today's timestamp normalized to midnight to reliably mark "until yesterday" classes
  const todayStr = new Date().toISOString().split('T')[0]

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
          topic,
          bookings!inner (
            subject,
            teacher,
            proposed_topic,
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
          proposed_topic,
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
        proposed_topic: s.bookings?.proposed_topic || 'N/A',
        topic: s.topic || 'N/A',
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
        proposed_topic: d.proposed_topic || 'Trial',
        topic: 'Trial Intro',
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
          <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Master Timetable</p>
        </div>
        <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 font-black text-xs px-3 py-1 rounded-full uppercase">
          Total: {sessions.length} Sessions This Month
        </span>
      </div>

      {/* Days of the Week Header Row */}
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
          
          const formattedDay = String(currentDayNumber).padStart(2, '0')
          const formattedMonth = String(month + 1).padStart(2, '0')
          const currentDateString = `${year}-${formattedMonth}-${formattedDay}`
          
          // Determine day status matrices
          const isPastDay = currentDateString < todayStr
          const containsDemo = daySessions.some(s => s.session_type === 'demo')

          const currentColumnIndex = (firstDayOfMonth + idx) % 7
          const isLeftEdgeColumn = currentColumnIndex === 0

          // Day box theme styling logic (Special green color styling removed completely)
          let dayStyle = 'bg-slate-100/60 border-slate-200/40 text-slate-400 opacity-40'
          let tagColor = 'text-slate-400'
          let badgeStyle = 'text-blue-600 bg-blue-100/70'

          if (hasBookings) {
            if (isPastDay) {
              dayStyle = 'bg-slate-100 border-slate-200 text-slate-500 opacity-60 hover:bg-white hover:opacity-100 hover:shadow-xl cursor-pointer'
              tagColor = 'text-slate-500'
              badgeStyle = 'text-slate-600 bg-slate-200'
            } else if (containsDemo) {
              dayStyle = 'bg-amber-50/40 border-amber-200 hover:bg-white hover:border-amber-500 hover:shadow-xl cursor-pointer'
              tagColor = 'text-amber-700'
              badgeStyle = 'text-amber-800 bg-amber-100'
            } else {
              dayStyle = 'bg-blue-50/40 border-blue-200 hover:bg-white hover:border-blue-600 hover:shadow-xl cursor-pointer'
              tagColor = 'text-blue-600'
              badgeStyle = 'text-blue-600 bg-blue-100/70'
            }
          }

          return (
            <div key={`day-${currentDayNumber}`} className={`relative rounded-xl p-2 border flex flex-col justify-between transition-all duration-150 group ${dayStyle}`}>
              
              {/* Date Indicator Tag Line */}
              <div className="flex justify-between items-center">
                <span className={`text-xs font-black ${tagColor}`}>
                  {currentDayNumber}
                </span>
                {hasBookings && (
                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${badgeStyle}`}>
                    {daySessions.length} Cls
                  </span>
                )}
              </div>

              {/* Standard Inline Flat TextBox Listing Representation Area */}
              <div className="flex-1 mt-1.5 space-y-1 overflow-hidden group-hover:opacity-0 transition-opacity">
                {daySessions.slice(0, 2).map((s) => {
                  const isDemoRow = s.session_type === 'demo'
                  const isDone = s.status === 'completed'
                  
                  let rowBoxStyle = 'bg-blue-100/40 text-slate-700 border-blue-100'
                  if (isPastDay) rowBoxStyle = 'bg-slate-200/50 text-slate-400 border-slate-200 line-through'
                  else if (isDemoRow) rowBoxStyle = 'bg-amber-100/50 text-amber-900 border-amber-100'

                  return (
                    <div key={s.id} className={`text-[9px] font-bold px-1 py-0.5 border rounded-md truncate ${rowBoxStyle}`}>
                      {isDone ? '✅' : isDemoRow ? '🔸' : '📚'} {s.subject.split(' ')[0]} @ {s.session_time.split(' - ')[0].replace(':00', '')}
                    </div>
                  )
                })}
                {daySessions.length > 2 && (
                  <p className={`text-[9px] font-black pl-1 ${isPastDay ? 'text-slate-400' : containsDemo ? 'text-amber-700' : 'text-blue-600'}`}>
                    +{daySessions.length - 2} more...
                  </p>
                )}
              </div>

              {/* MINIFIED HOVER OVERLAY DISPLAY BLOCK */}
              {hasBookings && (
                <div className={`absolute hidden group-hover:flex flex-col z-50 bottom-full mb-2 w-72 bg-white border-2 p-2 rounded-xl shadow-2xl space-y-1 animate-in fade-in zoom-in-95 duration-100 ${
                  isPastDay ? 'border-slate-400' : containsDemo ? 'border-amber-500' : 'border-blue-600'
                } ${
                  isLeftEdgeColumn ? 'left-0 translate-x-0' : 'left-1/2 -translate-x-1/2'
                }`}>
                  <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5">
                    {daySessions.map((session) => {
                      const isItemDone = session.status === 'completed'
                      const isItemDemo = session.session_type === 'demo'

                      let popupItemStyle = 'bg-slate-50 border-slate-200 text-slate-900'
                      if (isItemDemo) popupItemStyle = 'bg-amber-50/60 border-amber-200 text-amber-950'

                      return (
                        <div key={session.id} className={`border p-2 rounded-lg text-left text-[11px] ${popupItemStyle}`}>
                          {/* Line 1: Student Name - Subject & Time */}
                          <div className="flex justify-between items-center font-bold">
                            <span className="truncate max-w-[170px] flex items-center gap-1">
                              {isItemDone && <span className="text-emerald-600">✓</span>}
                              {session.student_name} - {session.subject}
                            </span>
                            <span className="text-[10px] font-mono font-medium opacity-80">
                              {session.session_time.split(' - ')[0]}
                            </span>
                          </div>
                          
                          {/* Line 2: Major Topic - Minor Topic */}
                          <p className="opacity-70 text-[10px] truncate font-medium mt-0.5">
                            {session.proposed_topic} - {session.topic}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                  {/* Tail Indicator placement code */}
                  <div className={`absolute top-full w-3 h-3 bg-white border-r-2 border-b-2 rotate-45 -mt-1.5 ${
                    isPastDay ? 'border-slate-400' : containsDemo ? 'border-amber-500' : 'border-blue-600'
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