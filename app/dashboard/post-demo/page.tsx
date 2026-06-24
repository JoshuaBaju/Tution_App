"use client"
import { useState, useEffect, Suspense, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  getDay, 
  isSameDay, 
  addMonths, 
  subMonths,
  isBefore,
  startOfDay,
  parseISO
} from 'date-fns'

interface ConflictSession {
  date: string
  time: string
}

function UnifiedPostDemoContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const bookingId = searchParams.get('booking')

  // Auth & Database States
  const [userId, setUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<'parent' | 'teacher' | null>(null)
  const [booking, setBooking] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Calendar Engine Local Component States
  const [currentMonth, setCurrentMonth] = useState(new Date()) 
  const [teacherTimeSlots, setTeacherTimeSlots] = useState<string[]>([])
  const [teacherBaseDays, setTeacherBaseDays] = useState<string[]>([])
  
  // Master overlap arrays compiled from DB
  const [busyScheduleSlots, setBusyScheduleSlots] = useState<ConflictSession[]>([])

  // Form Processing States (Parent Input States)
  const [isSatisfied, setIsSatisfied] = useState<boolean | null>(null)
  const [wishToContinue, setWishToContinue] = useState<boolean | null>(null)
  const [proposedTopic, setProposedTopic] = useState('')
  const [totalSessions, setTotalSessions] = useState<number>(10)
  const [proposedTimeslot, setProposedTimeslot] = useState('')
  const [selectedDates, setSelectedDates] = useState<Date[]>([])
  
  // Teacher Review & Revision States
  const [changeComment, setChangeComment] = useState('')
  const [showRejectBox, setShowRejectBox] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Final Phase State: Syllabus mapping dictionary
  const [sessionTopics, setSessionTopics] = useState<{ [key: string]: string }>({})

  const weekDaysHeader = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const today = startOfDay(new Date()) 

  // Core Data Fetch Function (Can be cleanly re-called by real-time stream updates)
  const loadWorkflowContext = useCallback(async (uid: string) => {
    if (!bookingId) {
      setLoading(false)
      return
    }

    // 1. Fetch main booking context
    const { data, error } = await supabase
      .from('bookings')
      .select('*, parent, teacher')
      .eq('id', bookingId)
      .single()

    if (error) {
      console.error("Error downloading workflow context:", error.message)
      setLoading(false)
      return
    }

    if (data) {
      setBooking(data)
      
      if (uid === data.parent) setUserRole('parent')
      else if (uid === data.teacher) setUserRole('teacher')

      if (data.proposed_topic) setProposedTopic(data.proposed_topic)
      if (data.total_sessions) setTotalSessions(data.total_sessions || 10)
      if (data.proposed_timeslot) setProposedTimeslot(data.proposed_timeslot)
      
      if (data.proposed_dates) {
        const parsedDates = data.proposed_dates.map((dStr: string) => parseISO(dStr))
        setSelectedDates(parsedDates)
        
        const initialTopics: { [key: string]: string } = {}
        data.proposed_dates.forEach((dateStr: string) => {
          initialTopics[dateStr] = ''
        })
        setSessionTopics(initialTopics)
      }
      if (data.is_satisfied !== null) setIsSatisfied(data.is_satisfied)

      // 2. Fetch Assigned Teacher catalogs
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('time_slots, available_days')
        .eq('id', data.teacher)
        .single()

      if (teacherData) {
        setTeacherTimeSlots(teacherData.time_slots || [])
        setTeacherBaseDays(teacherData.available_days || [])
      }

      // 3. COMPILE TEACHER CONFLICTS (Both active bookings and generated sessions)
      const parsedConflicts: ConflictSession[] = []

      // Query A: Conflict dates from bookings table
      const { data: conflictingBookings } = await supabase
        .from('bookings')
        .select('proposed_dates, proposed_timeslot')
        .eq('teacher', data.teacher)
        .neq('id', bookingId) // Ignore current record mapping
        .in('status', ['waiting_teacher_confirmation', 'payment_pending', 'booked', 'active'])

      conflictingBookings?.forEach(b => {
        if (b.proposed_dates && b.proposed_timeslot) {
          b.proposed_dates.forEach((dStr: string) => {
            parsedConflicts.push({ date: dStr, time: b.proposed_timeslot })
          })
        }
      })

      // Query B: Conflict slots from structural running live sessions table
      const { data: conflictingSessions } = await supabase
        .from('sessions')
        .select('session_date, session_time, bookings!inner(teacher)')
        .eq('bookings.teacher', data.teacher)
        .neq('booking_id', bookingId)

      conflictingSessions?.forEach((s: any) => {
        if (s.session_date && s.session_time) {
          parsedConflicts.push({ date: s.session_date, time: s.session_time })
        }
      })

      setBusyScheduleSlots(parsedConflicts)
    }
    setLoading(false)
  }, [bookingId])

  // Initial Auth hook & Real-Time Sync Channel Initialization
  useEffect(() => {
    let activeUser: string | null = null

    async function setupWorkflow() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      activeUser = session.user.id
      setUserId(activeUser)
      await loadWorkflowContext(activeUser)
    }

    setupWorkflow()

    // Realtime channel stream configuration mapping updates dynamically
    const channel = supabase
      .channel(`booking-sync-${bookingId}`)
      .on(
        'postgres_changes',
        { event: '*', filter: `id=eq.${bookingId}`, schema: 'public', table: 'bookings' },
        () => {
          if (activeUser) loadWorkflowContext(activeUser)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [bookingId, router, loadWorkflowContext])

  // Clear dates safely if parent alters selected operational hours setup
  const handleTimeslotChange = (newSlot: string) => {
    setProposedTimeslot(newSlot)
    setSelectedDates([])
  }

  // --- INTERACTIVE CALENDAR UTILITIES WITH TIMING GUARD OVERLAPS ---
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startOffset = getDay(monthStart) 

  // Central validation tracking utility checking if a date has an active teacher block
  const isTimeSlotOverlapping = (dateString: string) => {
    if (!proposedTimeslot) return false
    return busyScheduleSlots.some(
      slot => slot.date === dateString && slot.time === proposedTimeslot
    )
  }

  const getDateStatus = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd')
    const dayName = format(date, 'EEEE') 

    if (isBefore(startOfDay(date), today)) {
      return 'bg-slate-100 text-slate-300 cursor-not-allowed line-through'
    }
    if (selectedDates.some(d => isSameDay(d, date))) {
      return 'bg-blue-600 text-white font-black scale-95 shadow-sm'
    }
    if (isTimeSlotOverlapping(dateString)) {
      return 'bg-rose-100/70 border border-rose-200 text-rose-400 line-through cursor-not-allowed'
    }
    if (teacherBaseDays.includes(dayName)) {
      return 'bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-500 hover:text-white cursor-pointer font-bold'
    }
    return 'bg-slate-50 text-slate-300 cursor-not-allowed' 
  }

  const handleDayClick = (date: Date) => {
    if (isBefore(startOfDay(date), today)) return

    const dayName = format(date, 'EEEE')
    const dateString = format(date, 'yyyy-MM-dd')
    if (!teacherBaseDays.includes(dayName) || isTimeSlotOverlapping(dateString)) return

    if (selectedDates.some(d => isSameDay(d, date))) {
      setSelectedDates(prev => prev.filter(d => !isSameDay(d, date)))
    } else {
      if (selectedDates.length >= totalSessions) {
        alert(`You have already matched your exact layout limit allocation of ${totalSessions} days.`)
        return
      }
      setSelectedDates(prev => [...prev, date].sort((a, b) => a.getTime() - b.getTime()))
    }
  }

  const handleHeaderClick = (dayIndex: number) => {
    if (!proposedTimeslot) {
      alert("Please configure your layout preferred time slot before using automatic column assignment.")
      return
    }

    const targetDayName = weekDaysHeader[dayIndex] 
    const fullDayNames: Record<string, string> = { 'Mon': 'Monday', 'Tue': 'Tuesday', 'Wed': 'Wednesday', 'Thu': 'Thursday', 'Fri': 'Friday', 'Sat': 'Saturday', 'Sun': 'Sunday' }
    const targetFullName = fullDayNames[targetDayName]

    const matchingMonthDays = daysInMonth.filter(date => {
      const isPast = isBefore(startOfDay(date), today) 
      const isDay = format(date, 'EEEE') === targetFullName
      const isNotConflict = !isTimeSlotOverlapping(format(date, 'yyyy-MM-dd'))
      return !isPast && isDay && isNotConflict
    })

    setSelectedDates(prev => {
      const cleanedPrev = prev.filter(d => format(d, 'EEEE') !== targetFullName)
      const combined = [...cleanedPrev, ...matchingMonthDays].sort((a, b) => a.getTime() - b.getTime())
      return combined.slice(0, totalSessions)
    })
  }

  // Transaction submission handlers (Automatic local reloading is removed as Realtime triggers update)
  const handleParentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSatisfied === false || wishToContinue === false) {
      setSubmitting(true)
      await supabase.from('bookings').update({ status: 'cancelled', is_satisfied: isSatisfied }).eq('id', bookingId)
      setSubmitting(false)
      return
    }

    if (!proposedTopic || !proposedTimeslot || selectedDates.length !== totalSessions) {
      alert(`Validation failure: Ensure you select exactly ${totalSessions} dates.`)
      return
    }

    setSubmitting(true)
    const formattedDatesArray = selectedDates.map(d => format(d, 'yyyy-MM-dd'))

    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'waiting_teacher_confirmation',
        is_satisfied: isSatisfied,
        proposed_topic: proposedTopic,
        total_sessions: totalSessions,
        proposed_dates: formattedDatesArray,
        proposed_timeslot: proposedTimeslot
      })
      .eq('id', bookingId)

    setSubmitting(false)
    if (error) alert(error.message)
  }

  const handleTeacherApprove = async () => {
    setSubmitting(true)
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'payment_pending', confirmed_at: new Date() })
      .eq('id', bookingId)

    setSubmitting(false)
    if (error) alert(error.message)
  }

  const handleTeacherRequestChange = async () => {
    if (!changeComment.trim()) {
      alert("Please provide change request details.")
      return
    }
    setSubmitting(true)
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'parent_approval_pending', teacher_notes: changeComment.trim() })
      .eq('id', bookingId)

    setSubmitting(false)
    if (error) alert(error.message)
  }

  const handleSimulatePayment = async () => {
    setSubmitting(true)
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'booked', paid_at: new Date() })
      .eq('id', bookingId)

    setSubmitting(false)
    if (error) alert(error.message)
  }

  const handleGenerateSessions = async (e: React.FormEvent) => {
    e.preventDefault()
    const structuralTopicsList = Object.entries(sessionTopics)
    const isIncomplete = structuralTopicsList.some(([_, topicText]) => !topicText.trim())
    
    if (isIncomplete) {
      alert("Please write a focal syllabus lesson subtopic for each row.")
      return
    }

    setSubmitting(true)
    const bulkSessionsPayload = structuralTopicsList.map(([dateString, topicText]) => ({
      booking_id: bookingId,
      status: 'pending',
      session_date: dateString,
      session_time: booking.proposed_timeslot,
      topic: topicText.trim()
    }))

    const { error: sessionError } = await supabase.from('sessions').insert(bulkSessionsPayload)

    if (sessionError) {
      alert(`Transaction aborted: ${sessionError.message}`)
      setSubmitting(false)
      return
    }

    const { error: bookingError } = await supabase.from('bookings').update({ status: 'active' }).eq('id', bookingId)
    setSubmitting(false)

    if (bookingError) alert(`Configuration error: ${bookingError.message}`)
  }

  if (loading) return <div className="p-12 text-center text-xs font-bold text-slate-400 animate-pulse tracking-widest">SYNCHRONIZING RECURRING LIFECYCLE INTERFACE...</div>
  if (!booking || !userRole) return <div className="p-12 text-center text-xs font-bold text-rose-500">❌ SYSTEM ERROR: WORKSPACE REFERENCE TIMED OUT.</div>

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white border border-slate-200 rounded-3xl shadow-sm my-8">
      
      {/* HEADER CONTROLS */}
      <div className="border-b border-slate-100 pb-4 mb-6 flex justify-between items-start">
        <div>
          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider">
            Status: {booking.status.replace(/_/g, ' ')}
          </span>
          <h2 className="text-xl font-black text-slate-900 tracking-tight mt-1">Course Contract Blueprint</h2>
          <p className="text-xs text-slate-400 mt-0.5">Subject Focus: <span className="font-bold text-slate-600">{booking.subject}</span></p>
        </div>
        <span className="text-xs font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-xl uppercase tracking-wider">
          {userRole} view
        </span>
      </div>

      {/* PHASE 1: PARENT PIPELINE MANAGEMENT */}
      {booking.status === 'parent_approval_pending' && userRole === 'parent' && (
        <form onSubmit={handleParentSubmit} className="space-y-6">
          {booking.teacher_notes && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 space-y-1">
              <p className="font-black uppercase tracking-wider">⚠️ Tutor Revision Instructions:</p>
              <p className="font-medium italic text-slate-700">"{booking.teacher_notes}"</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700">1. Are you satisfied with the teacher's class?</label>
            <div className="grid grid-cols-2 gap-4">
              <button type="button" onClick={() => setIsSatisfied(true)} className={`p-4 border rounded-2xl font-bold text-xs transition ${isSatisfied === true ? 'border-green-500 bg-green-50/30 text-green-700' : 'border-slate-200 hover:bg-slate-50'}`}>🎯 Yes, fully satisfied</button>
              <button type="button" onClick={() => setIsSatisfied(false)} className={`p-4 border rounded-2xl font-bold text-xs transition ${isSatisfied === false ? 'border-rose-500 bg-rose-50/30 text-rose-700' : 'border-slate-200 hover:bg-slate-50'}`}>🤔 No, request alternative</button>
            </div>
          </div>

          {isSatisfied && (
            <div className="space-y-2 animate-fadeIn">
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700">2. Do you wish to continue to book sessions for this teacher?</label>
              <div className="grid grid-cols-2 gap-4">
                <button type="button" onClick={() => setWishToContinue(true)} className={`p-4 border rounded-2xl font-bold text-xs transition ${wishToContinue === true ? 'border-blue-500 bg-blue-50/30 text-blue-700' : 'border-slate-200 hover:bg-slate-50'}`}>🚀 Yes, let's book</button>
                <button type="button" onClick={() => setWishToContinue(false)} className={`p-4 border rounded-2xl font-bold text-xs transition ${wishToContinue === false ? 'border-slate-400 bg-slate-50 text-slate-600' : 'border-slate-200 hover:bg-slate-50'}`}>✕ No, cancel layout</button>
              </div>
            </div>
          )}

          {isSatisfied && wishToContinue && (
            <div className="space-y-6 pt-4 border-t border-slate-100">
              
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700">3. No. of sessions to book (as per your discussion with the teacher)</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="number" min={5} 
                    value={totalSessions} 
                    onChange={(e) => {
                      const val = Math.max(5, parseInt(e.target.value) || 5);
                      setTotalSessions(val);
                      setSelectedDates([]);
                    }} 
                    className="w-24 p-2.5 border border-slate-200 rounded-xl text-sm font-black bg-slate-50 text-center text-blue-600" 
                  />
                  <span className="text-xs text-slate-400 font-bold">(Minimum 5 entry matrix blocks required)</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700">4. Topic to be taken (as per discussion with the teacher)</label>
                <input type="text" required placeholder="e.g., Target Foundations of Geometry blocks" value={proposedTopic} onChange={(e) => setProposedTopic(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-medium bg-slate-50" />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700">5. Preferred Timeslot</label>
                <select 
                  required
                  className="w-full p-2.5 border border-slate-200 bg-slate-50 font-semibold rounded-xl text-xs"
                  value={proposedTimeslot}
                  onChange={e => handleTimeslotChange(e.target.value)}
                >
                  <option value="">-- Choose an operational hour slot from the tutor's catalog --</option>
                  {teacherTimeSlots.map(slot => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>

              {/* INTEGRATED FULL CALENDAR ENGINE */}
              <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700">6. Choose Your {totalSessions} Course Calendar Dates</label>
                  <span className="text-xs font-mono font-bold text-blue-600 bg-blue-100/70 px-2 py-0.5 rounded">Selected: {selectedDates.length}/{totalSessions}</span>
                </div>

                {!proposedTimeslot && (
                  <p className="text-[11px] text-amber-600 font-bold text-center bg-amber-50 border border-amber-200 rounded-lg p-2">⚠️ Please select a timeslot first to evaluate teacher calendar availability matrices.</p>
                )}

                <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-100">
                  <button type="button" onClick={() => setCurrentMonth(prev => subMonths(prev, 1))} className="p-1.5 text-[11px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-md">← Prev</button>
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wide">{format(currentMonth, 'MMMM yyyy')}</span>
                  <button type="button" onClick={() => setCurrentMonth(prev => addMonths(prev, 1))} className="p-1.5 text-[11px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-md">Next →</button>
                </div>

                <div>
                  <div className="grid grid-cols-7 gap-1 text-center mb-1">
                    {weekDaysHeader.map((day, idx) => (
                      <button 
                        key={day} type="button"
                        onClick={() => handleHeaderClick(idx)}
                        className="text-[10px] font-black uppercase text-slate-400 py-1 hover:bg-slate-200/50 rounded-md"
                        title={`Click to auto-select available ${day}s`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: startOffset }).map((_, idx) => (
                      <div key={`offset-${idx}`} className="aspect-square"></div>
                    ))}
                    {daysInMonth.map((date) => (
                      <button
                        key={date.toString()} type="button"
                        onClick={() => handleDayClick(date)}
                        className={`aspect-square rounded-lg flex items-center justify-center text-xs font-semibold transition-all ${getDateStatus(date)}`}
                      >
                        {format(date, 'd')}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-4 justify-center items-center text-[10px] font-bold pt-1 text-slate-400">
                  <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-50 border border-blue-100 block"/> Available</div>
                  <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-600 block"/> Selected</div>
                  <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-rose-100 block"/> Overlap Conflict</div>
                </div>
              </div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={submitting || (isSatisfied === true && wishToContinue === true && selectedDates.length !== totalSessions)} 
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-md"
          >
            {submitting ? "Processing..." : isSatisfied === false || wishToContinue === false ? "Confirm Stop Request" : "🚀 Send for Teacher Confirmation"}
          </button>
        </form>
      )}

      {/* PHASE 2: TUTOR INTERVIEW CONTROLS */}
      {booking.status === 'waiting_teacher_confirmation' && userRole === 'teacher' && (
        <div className="space-y-6">
          <div className="bg-slate-50 border rounded-2xl p-4 space-y-3 text-xs text-slate-700">
            <h4 className="font-black uppercase tracking-wider text-slate-900">Review Parent Requirements Block</h4>
            <p><strong>Topic Focus Scope:</strong> {booking.proposed_topic}</p>
            <p><strong>Requested Timeslot Routine:</strong> <span className="font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{booking.proposed_timeslot}</span></p>
            <p><strong>Volume:</strong> {booking.total_sessions} Sessions Package</p>
            <div>
              <strong className="block mb-1">Proposed Course Calendars Array:</strong>
              <div className="flex flex-wrap gap-1.5">
                {booking.proposed_dates?.map((d: string) => <span key={d} className="bg-white border px-2 py-0.5 rounded-md font-mono font-bold text-slate-600">{d}</span>)}
              </div>
            </div>
          </div>
          {!showRejectBox ? (
            <div className="grid grid-cols-2 gap-4">
              <button onClick={handleTeacherApprove} disabled={submitting} className="py-3 bg-green-600 hover:bg-green-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition">Acknowledge & Approve Layout</button>
              <button onClick={() => setShowRejectBox(true)} className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider rounded-xl transition">Request Revisions</button>
            </div>
          ) : (
            <div className="space-y-3 p-4 bg-rose-50/50 border border-rose-100 rounded-2xl">
              <textarea rows={3} value={changeComment} onChange={(e) => setChangeComment(e.target.value)} placeholder="Specify timeline details..." className="w-full p-3 border rounded-xl text-xs bg-white" />
              <div className="flex gap-2">
                <button onClick={handleTeacherRequestChange} disabled={submitting} className="px-4 py-2 bg-rose-600 text-white text-xs font-black uppercase tracking-wider rounded-xl">Transmit Change Request</button>
                <button onClick={() => setShowRejectBox(false)} className="px-4 py-2 bg-slate-200 text-xs font-black uppercase tracking-wider rounded-xl">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FALLBACK SYSTEM VIEWS */}
      {booking.status === 'parent_approval_pending' && userRole === 'teacher' && (
        <div className="p-8 text-center border border-dashed rounded-2xl text-slate-400 font-medium text-xs">⏳ Waiting for the parent to select schedule entries using the monthly calendar interface grid...</div>
      )}
      {booking.status === 'waiting_teacher_confirmation' && userRole === 'parent' && (
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-xs text-blue-800 font-bold animate-pulse">⏳ Your proposed calendar metrics and hourly parameters are under review by your tutor.</div>
      )}

      {/* PHASE 3: BILLING SYSTEM GATEWAY (PARENT SEES THIS) */}
      {booking.status === 'payment_pending' && userRole === 'parent' && (
        <div className="text-center p-6 bg-slate-50 border rounded-2xl space-y-4">
          <div className="text-3xl">💳</div>
          <div>
            <h4 className="text-sm font-black text-slate-900 uppercase">Schedule Confirmed! Settle Invoice</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">Your tutor locked in your layout request at <span className="font-bold text-slate-700">{booking.proposed_timeslot}</span>.</p>
          </div>
          <button onClick={handleSimulatePayment} disabled={submitting} className="w-full max-w-xs mx-auto py-2.5 bg-blue-600 text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-md">💳 Simulate Checkout Settle</button>
        </div>
      )}

      {/* PHASE 3 (TEACHER VIEW STATUS) */}
      {booking.status === 'payment_pending' && userRole === 'teacher' && (
        <div className="p-8 text-center border border-dashed rounded-2xl text-slate-400 font-medium text-xs">💳 Schedule approved! Waiting for parent to settle invoice calculations at checkout...</div>
      )}

      {/* MID-WAY CHECKPOINT: PAID BUT NO SYLLABUS (PARENT ONLY VIEWS STATE) */}
      {booking.status === 'booked' && userRole === 'parent' && (
        <div className="p-8 text-center border border-dashed rounded-2xl text-slate-400 font-medium text-xs bg-slate-50/50 space-y-4">
          <div className="text-green-500 font-bold">🎉 Payment Received Successfully!</div>
          <p className="max-w-xs mx-auto text-[11px]">Your teacher is now filling in the dynamic day-by-day lesson topics.</p>
          <div className="pt-2">
            <Link href="/dashboard/parent" className="px-4 py-2 bg-slate-900 text-white font-black text-xs uppercase tracking-wider rounded-xl transition">
              Go back to Dashboard
            </Link>
          </div>
        </div>
      )}

      {/* PHASE 4: CHARGED STATUS / TOPIC ALLOCATION (TEACHER SEES THIS) */}
      {booking.status === 'booked' && userRole === 'teacher' && (
        <form onSubmit={handleGenerateSessions} className="space-y-6">
          <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 text-xs text-blue-900">
            <h4 className="font-black uppercase tracking-wider">📦 Course Syllabus Configuration Engine</h4>
            <p className="mt-1">Invoice cleared! Assign curriculum focus topics for the recurring timeslot (<span className="font-bold">{booking.proposed_timeslot}</span>) to spawn live workspace entries.</p>
          </div>
          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
            {(booking.proposed_dates || []).map((dateStr: string, idx: number) => (
              <div key={dateStr} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="shrink-0">
                  <span className="bg-slate-200 text-slate-700 font-mono text-[10px] font-black px-2 py-0.5 rounded mr-2">SESSION {idx + 1}</span>
                  <span className="text-xs font-mono font-bold text-slate-600">{dateStr}</span>
                </div>
                <input 
                  type="text" required
                  placeholder={`Topics for Session ${idx + 1}`}
                  value={sessionTopics[dateStr] || ''}
                  onChange={(e) => setSessionTopics({ ...sessionTopics, [dateStr]: e.target.value })}
                  className="w-full sm:flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium bg-white"
                />
              </div>
            ))}
          </div>
          <button type="submit" disabled={submitting} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-md">
            {submitting ? "Spawning Dynamic Session Blocks..." : "✔️ Lock Syllabus & Generate Live Rows"}
          </button>
        </form>
      )}

      {/* FINAL LIFECYCLE COMPLETED SUMMARY SCREEN (BOTH ROLES) */}
      {booking.status === 'active' && (
        <div className="p-8 text-center bg-green-50 border border-green-200 rounded-3xl text-green-800 space-y-4 animate-fadeIn">
          <span className="text-3xl">🚀</span>
          <h4 className="text-sm font-black uppercase tracking-wide">Course Is Active & Operational</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">This course setup workflow is complete. Main monitoring tables and active timeline components are fully configured.</p>
          
          <div className="pt-2">
            {userRole === 'parent' ? (
              <Link href="/dashboard/parent" className="inline-block px-5 py-2.5 bg-green-700 hover:bg-green-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-sm">
                Return to Parent Dashboard
              </Link>
            ) : (
              <Link href="/dashboard/teacher" className="inline-block px-5 py-2.5 bg-green-700 hover:bg-green-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-sm">
                Return to Teacher Dashboard
              </Link>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

export default function UnifiedPostDemoWorkflow() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs font-bold text-slate-400 animate-pulse tracking-widest">LOADING CONTENT CONTAINER STAGE...</div>}>
      <UnifiedPostDemoContent />
    </Suspense>
  )
}