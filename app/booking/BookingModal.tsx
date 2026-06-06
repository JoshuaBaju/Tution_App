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
}

export default function BookingModal({ 
  isOpen, 
  onClose, 
  teacherId, 
  teacherName, 
  baseAvailableDays, 
  timeSlots, 
  rate,
  subject
}: BookingModalProps) {
  
  const [currentMonth, setCurrentMonth] = useState(new Date()) 
  const [maxLessons, setMaxLessons] = useState<number>(4) 
  const [selectedDates, setSelectedDates] = useState<Date[]>([]) 
  const [existingBookings, setExistingBookings] = useState<string[]>([]) 
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  const weekDaysHeader = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const today = startOfDay(new Date()) // Get the baseline for today's midnight date context

  useEffect(() => {
    if (!isOpen) return
    async function fetchBookedDates() {
      const { data, error } = await supabase
        .from('bookings')
        .select('booking_date')
        .eq('teacher_id', teacherId)
        .eq('status', 'confirmed')

      if (data) {
        setExistingBookings(data.map(b => b.booking_date))
      }
    }
    fetchBookedDates()
  }, [isOpen, teacherId])

  if (!isOpen) return null

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startOffset = getDay(monthStart) 

  // Core Color-State Classification Rule Engine
  const getDateStatus = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd')
    const dayName = format(date, 'EEEE') 

    // 1. Is the date before today? -> GRAY (Force block immediately)
    if (isBefore(startOfDay(date), today)) {
      return 'bg-slate-100 text-slate-300 cursor-not-allowed lines-through'
    }

    // 2. Is it currently selected? -> RED
    if (selectedDates.some(d => isSameDay(d, date))) return 'bg-red-500 text-white font-bold'
    
    // 3. Is it already taken in DB? -> GREEN
    if (existingBookings.includes(dateString)) return 'bg-emerald-500 text-white font-bold cursor-not-allowed'
    
    // 4. Does the teacher work this weekday? -> BLUE (Yes) or GRAY (No)
    if (baseAvailableDays.includes(dayName)) {
      return 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-500 hover:text-white cursor-pointer'
    }
    
    return 'bg-slate-100 text-slate-300 cursor-not-allowed' 
  }

  const handleDayClick = (date: Date) => {
    // Block clicks on past dates
    if (isBefore(startOfDay(date), today)) return

    const dayName = format(date, 'EEEE')
    const dateString = format(date, 'yyyy-MM-dd')
    
    if (!baseAvailableDays.includes(dayName) || existingBookings.includes(dateString)) return

    if (selectedDates.some(d => isSameDay(d, date))) {
      setSelectedDates(prev => prev.filter(d => !isSameDay(d, date)))
    } else {
      if (selectedDates.length >= maxLessons) {
        alert(`You can only select up to ${maxLessons} lessons.`)
        return
      }
      setSelectedDates(prev => [...prev, date])
    }
  }

  // Column Header Multi-Selector
  const handleHeaderClick = (dayIndex: number) => {
    const targetDayName = weekDaysHeader[dayIndex] 
    const fullDayNames: Record<string, string> = { 'Mon': 'Monday', 'Tue': 'Tuesday', 'Wed': 'Wednesday', 'Thu': 'Thursday', 'Fri': 'Friday', 'Sat': 'Saturday', 'Sun': 'Sunday' }
    const targetFullName = fullDayNames[targetDayName]

    const matchingMonthDays = daysInMonth.filter(date => {
      const isPast = isBefore(startOfDay(date), today) // Ensure header ignores history days
      const isDay = format(date, 'EEEE') === targetFullName
      const isNotBooked = !existingBookings.includes(format(date, 'yyyy-MM-dd'))
      return !isPast && isDay && isNotBooked
    })

    setSelectedDates(prev => {
      const cleanedPrev = prev.filter(d => format(d, 'EEEE') !== targetFullName)
      const combined = [...cleanedPrev, ...matchingMonthDays]
      return combined.slice(0, maxLessons)
    })
  }

  const handleFinalize = async () => {
    if (selectedDates.length === 0) return alert("Please select at least 1 lesson date.")
    if (!selectedTimeSlot) return alert("Please choose a class timing window.")
    
    setSubmitting(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return alert("Authentication error. Please re-login.")

    const insertionRows = selectedDates.map(date => ({
      teacher_id: teacherId,
      parent_id: user.id, // Successfully writes because parent_id points to authenticated id now
      booking_date: format(date, 'yyyy-MM-dd'),
      time_slot: selectedTimeSlot,
      subject: subject,
      status: 'confirmed'
    }))

    const { error } = await supabase.from('bookings').insert(insertionRows)

    if (error) {
      alert("Booking Transaction Aborted: " + error.message)
    } else {
      alert(`Success! Successfully booked ${selectedDates.length} lessons with ${teacherName}!`)
      onClose()
    }
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg p-6 border border-slate-200 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto space-y-5">
        
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-slate-900">Booking Setup</h3>
            <p className="text-xs text-slate-400">Scheduling application for {teacherName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-xl">✕</button>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
          <label className="text-xs font-black uppercase tracking-wider text-slate-500">Number of Lessons Required:</label>
          <input 
            type="number" 
            min="1" 
            max="30"
            className="w-16 p-1.5 border border-slate-200 bg-white rounded-lg text-center font-bold text-blue-600 focus:ring-2 focus:ring-blue-500 outline-none"
            value={maxLessons}
            onChange={e => {
              const val = Number(e.target.value)
              setMaxLessons(val)
              if(selectedDates.length > val) setSelectedDates(prev => prev.slice(0, val))
            }}
          />
        </div>

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

        <div>
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {weekDaysHeader.map((day, idx) => (
              <button 
                key={day}
                type="button"
                onClick={() => handleHeaderClick(idx)}
                className="text-[11px] font-black uppercase text-slate-400 py-1.5 hover:bg-slate-100 rounded-md transition cursor-pointer"
                title={`Click to auto-select all available ${day}s`}
              >
                {day}
              </button>
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

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-black uppercase tracking-wider text-slate-400">Select Session Time Window:</label>
          <select 
            className="w-full p-3 border border-slate-200 bg-slate-50 font-medium rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm cursor-pointer"
            value={selectedTimeSlot}
            onChange={e => setSelectedTimeSlot(e.target.value)}
          >
            <option value="">-- Choose an operational hour slot --</option>
            {timeSlots?.map(slot => (
              <option key={slot} value={slot}>{slot}</option>
            ))}
          </select>
        </div>

        <div className="pt-2 space-y-3">
          <div className="flex justify-between text-xs font-bold text-slate-500 px-1">
            <span>Selected Count: <span className="text-red-500 font-black">{selectedDates.length}</span> / {maxLessons}</span>
            <span>Total Cost: <span className="text-slate-900 font-black">${selectedDates.length * rate}</span></span>
          </div>

          <button
            onClick={handleFinalize}
            disabled={submitting}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-black text-base rounded-xl transition shadow-md shadow-blue-100"
          >
            {submitting ? 'Committing Reservation Rows...' : `Finalize & Book (${selectedDates.length} Days)`}
          </button>
        </div>

      </div>
    </div>
  )
}