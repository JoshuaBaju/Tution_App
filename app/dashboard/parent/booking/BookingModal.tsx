"use client"
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
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
  startOfDay
} from 'date-fns'

interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
  teacherId: string
  teacherName: string
  baseAvailableDays: string[]
  timeSlots: string[]        
  rate: number
  subject: string
  studentId: string 
  parentId: string   
}

interface ConfirmedDemoBooking {
  demo_booking_date: string
  demo_time_slot: string
}

export default function BookingModal({ 
  isOpen, 
  onClose, 
  teacherId, 
  teacherName, 
  baseAvailableDays, 
  timeSlots, 
  rate,
  subject,
  studentId, 
  parentId   
}: BookingModalProps) {
  
  const [currentMonth, setCurrentMonth] = useState(new Date()) 
  const [selectedDates, setSelectedDates] = useState<Date[]>([]) 
  const [existingBookings, setExistingBookings] = useState<ConfirmedDemoBooking[]>([]) 
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('')
  const [demoTopic, setDemoTopic] = useState<string>('')
  const [studentName, setStudentName] = useState<string>('Loading Profile...')
  const [submitting, setSubmitting] = useState(false)

  const weekDaysHeader = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const today = startOfDay(new Date()) 
  const maxLessons = 1 // Hardcoded strict constraint for initial demo phase

  // Fetch booked slots for teacher using updated demographic criteria
  useEffect(() => {
    if (!isOpen) return
    async function fetchBookedDates() {
      const { data } = await supabase
        .from('bookings')
        .select('demo_booking_date, demo_time_slot')
        .eq('teacher', teacherId)
        .in('status', ['demo_pending', 'parent_approval_pending', 'waiting_teacher_confirmation', 'payment_pending', 'booked', 'active'])

      if (data) {
        setExistingBookings(data as any[])
      }
    }
    fetchBookedDates()
  }, [isOpen, teacherId])

  // Reset selected dates when the parent changes the time slot selection
  useEffect(() => {
    setSelectedDates([])
  }, [selectedTimeSlot])

  // Fetch student profile text display name
  useEffect(() => {
    if (!isOpen || !studentId) return
    async function fetchActiveStudentDetails() {
      const { data } = await supabase
        .from('students')
        .select('name')
        .eq('id', studentId)
        .maybeSingle()

      if (data?.name) {
        setStudentName(data.name)
      }
    }
    fetchActiveStudentDetails()
  }, [isOpen, studentId])

  if (!isOpen) return null

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startOffset = getDay(monthStart) 

  const isSlotAlreadyBooked = (dateString: string) => {
    if (!selectedTimeSlot) return false
    return existingBookings.some(
      b => b.demo_booking_date === dateString && b.demo_time_slot === selectedTimeSlot
    )
  }

  const getDateStatus = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd')
    const dayName = format(date, 'EEEE') 

    if (isBefore(startOfDay(date), today)) {
      return 'bg-slate-100 text-slate-300 cursor-not-allowed line-through'
    }

    if (selectedDates.some(d => isSameDay(d, date))) return 'bg-red-500 text-white font-bold'
    
    if (selectedTimeSlot && isSlotAlreadyBooked(dateString)) {
      return 'bg-emerald-500 text-white font-bold cursor-not-allowed'
    }
    
    if (baseAvailableDays.includes(dayName)) {
      return selectedTimeSlot 
        ? 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-500 hover:text-white cursor-pointer'
        : 'bg-blue-50/40 text-blue-400 border border-blue-100 cursor-pointer'
    }
    
    return 'bg-slate-100 text-slate-300 cursor-not-allowed' 
  }

  const handleDayClick = (date: Date) => {
    if (!selectedTimeSlot) {
      alert("Please select a session time window first before mapping dates.")
      return
    }
    if (isBefore(startOfDay(date), today)) return

    const dayName = format(date, 'EEEE')
    const dateString = format(date, 'yyyy-MM-dd')
    
    if (!baseAvailableDays.includes(dayName) || isSlotAlreadyBooked(dateString)) return

    if (selectedDates.some(d => isSameDay(d, date))) {
      setSelectedDates([])
    } else {
      setSelectedDates([date]) // Enforces singular selection assignment overrides
    }
  }

  const initializeClassroomFolder = async (tId: string, sId: string) => {
    const folderName = `${tId}_${sId}`
    const placeholderPath = `${folderName}/.keep`
    const blankFile = new Blob([''], { type: 'text/plain' })

    const { error: storageError } = await supabase.storage
      .from('classroom-files')
      .upload(placeholderPath, blankFile, {
        cacheControl: '3600',
        upsert: true 
      })

    if (storageError) {
      console.error(`❌ Bucket folder entry initialization failed:`, storageError.message)
    }
  }

  // 🚀 DISPATCH CHANNEL: Dispatches live alert mapped directly to the NotificationCenter interface
  const sendDemoBookingNotification = async (newBookingId: string) => {
    try {
      const formattedDate = format(selectedDates[0], 'MMMM d, yyyy')

      // Verify if the teacher is currently viewing the incoming lifecycle link 
      const { data: presenceMatch } = await supabase
        .from('status_presence')
        .select('id')
        .eq('user_id', teacherId)
        .eq('active_viewing_id', newBookingId)
        .maybeSingle()

      await supabase.from('notifications').insert({
        user_id: teacherId,
        title: "New Demo Trial Booked! 🗓️",
        description: `A parent booked a ${subject} trial demo with student ${studentName} for ${formattedDate} at ${selectedTimeSlot}.`,
        category: 'session',                                       // Spawns calendar item layout icon
        link_to: `/dashboard/teacher?tab=schedule`,   // Direct routing linkage
        is_read: !!presenceMatch                                   // Silent read if already tracking layout row
      })
    } catch (err) {
      console.error("Failed to distribute notification telemetry entry:", err)
    }
  }

  const handleFinalize = async () => {
    if (!studentId) return alert("System reference fault: Target student context lost.")
    if (selectedDates.length === 0) return alert("Please select a trial lesson date on the grid calendar.")
    if (!selectedTimeSlot) return alert("Please choose a class timing window.")
    if (!demoTopic.trim()) return alert("Please clarify what topic needs overview focus coverage during this demo session.")
    if (!parentId) return alert("Context error: Parent identity is missing.")
    
    setSubmitting(true)

    // Building the structure layout row for state engine entry initialization
    const entryPayload = {
      teacher: teacherId,
      parent: parentId, 
      student: studentId, 
      demo_booking_date: format(selectedDates[0], 'yyyy-MM-dd'),
      demo_time_slot: selectedTimeSlot,
      demo_topic: demoTopic.trim(),
      subject: subject,
      status: 'demo_pending' // Pipeline sequence initialized
    }

    const { data: bookingResult, error } = await supabase
      .from('bookings')
      .insert([entryPayload])
      .select('id')
      .single()

    if (error) {
      alert("Booking Transaction Aborted: " + error.message)
    } else if (bookingResult) {
      await initializeClassroomFolder(teacherId, studentId)
      
      // 🚀 TRIGGER ENGINE: Transmit row details right out to the assigned teacher profile
      await sendDemoBookingNotification(bookingResult.id)
      
      alert(`Success! Your trial demo class request for ${studentName} has been initialized inside the dashboard pipeline loop.`)
      onClose()
    }
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg p-6 border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto space-y-5">
        
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-slate-900">Book a Demo Class</h3>
            <p className="text-xs text-slate-400">Schedule an introductory handshake evaluation with {teacherName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-xl">✕</button>
        </div>

        <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3.5 flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-blue-700">Student Prospect:</span>
          <span className="text-sm font-black text-slate-800">🧒 {studentName}</span>
        </div>

        {/* INPUT: TIME WINDOW SELECTOR */}
        <div className="flex flex-col gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-3">
          <label className="text-xs font-black uppercase tracking-wider text-slate-500">1. Select Demo Session Time Window:</label>
          <select 
            className="w-full p-2.5 border border-slate-200 bg-white font-bold rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm cursor-pointer text-blue-600"
            value={selectedTimeSlot}
            onChange={e => setSelectedTimeSlot(e.target.value)}
          >
            <option value="" className="text-slate-700">-- Choose timing window --</option>
            {timeSlots?.map(slot => (
              <option key={slot} value={slot} className="text-slate-700">{slot}</option>
            ))}
          </select>
        </div>

        {/* INPUT: NEW TARGET DEMO TOPIC FOCUS FIELD */}
        <div className="flex flex-col gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-3">
          <label className="text-xs font-black uppercase tracking-wider text-slate-500">2. Target Evaluation Topic:</label>
          <input 
            type="text"
            required
            placeholder="e.g., Intro to Fractions / Quadratic Equation Assessment"
            value={demoTopic}
            onChange={e => setDemoTopic(e.target.value)}
            className="w-full p-2.5 border border-slate-200 bg-white text-xs font-medium rounded-xl outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 text-slate-800"
          />
        </div>

        {/* CALENDAR CONTROLS SECTION */}
        <div className="flex justify-between items-center bg-white px-1">
          <button 
            type="button"
            onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
            className="p-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            ← Prev Month
          </button>
          <span className="text-sm font-black text-slate-800 uppercase tracking-wide">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button 
            type="button"
            onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
            className="p-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            Next Month →
          </button>
        </div>

        <div className={!selectedTimeSlot ? "opacity-40 pointer-events-none" : ""}>
          <div className="grid grid-cols-7 gap-1 text-center mb-1 border-b border-slate-100 pb-2">
            {weekDaysHeader.map((day) => (
              <span key={day} className="text-[11px] font-black uppercase text-slate-400 py-1">
                {day}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: startOffset }).map((_, idx) => (
              <div key={`empty-${idx}`} className="aspect-square"></div>
            ))}

            {daysInMonth.map((date) => (
              <button
                key={date.toString()}
                type="button"
                onClick={() => handleDayClick(date)}
                className={`aspect-square rounded-lg flex items-center justify-center text-xs font-semibold transition-all ${getDateStatus(date)}`}
              >
                {format(date, 'd')}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 space-y-3">
          <div className="flex justify-between text-xs font-bold text-slate-500 px-1">
            <span>Selected Trial Slots: <span className="text-blue-600 font-black">{selectedDates.length} / 1</span></span>
            <span>Trial Base Rate: <span className="text-slate-900 font-black">${rate}</span></span>
          </div>

          <button
            type="button"
            onClick={handleFinalize}
            disabled={submitting || selectedDates.length === 0 || !selectedTimeSlot || !demoTopic.trim()}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black text-base rounded-xl transition shadow-md"
          >
            {submitting ? 'Initializing State Machine Record...' : `Request Trial Class Entry`}
          </button>
        </div>

      </div>
    </div>
  )
}