"use client"
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import BookingModal from '@/app/booking/BookingModal'

interface TeacherProfile {
  id: string
  name: string
  bio: string
  subjects: string[]
  rate: number
  available_days: string[]
  time_slots: string[]
  photo_url: string
}

export default function TeacherProfileView() {
  const router = useRouter()
  const params = useParams()
  const { id } = params // Grabs the dynamic user ID straight from the browser URL

  const [teacher, setTeacher] = useState<TeacherProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    if (!id) return

    async function fetchDetailedProfile() {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('teachers')
        .select('id, name, bio, subjects, rate, available_days, time_slots, photo_url')
        .eq('id', id)
        .maybeSingle() // Fetches only the single row matching this ID string

      if (error) {
        console.error("Error loading profile details:", error.message)
      } else if (data) {
        setTeacher(data as TeacherProfile)
      }
      setLoading(false)
    }

    fetchDetailedProfile()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-500">Loading educator profile...</p>
      </div>
    )
  }

  if (!teacher) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <p className="text-xl font-bold text-slate-700">Profile Not Found</p>
        <p className="text-slate-500 mt-1 max-w-xs">The requested teacher directory record could not be found or has been modified.</p>
        <button onClick={() => router.push('/booking')} className="mt-6 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-sm">
          Return to Catalog
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 sm:p-10">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Navigation Action Hub */}
        <button 
          onClick={() => router.push('/booking')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-sm font-bold text-slate-600 rounded-xl hover:bg-slate-100 transition shadow-2xs"
        >
          ← Back to Search
        </button>

        {/* Master Profile Header Card Component */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            
            {/* Big Profile Photo Frame */}
            <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 flex-shrink-0 flex items-center justify-center relative">
              {teacher.photo_url ? (
                <img src={teacher.photo_url} alt={teacher.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-5xl font-black text-blue-600 uppercase">{teacher.name?.charAt(0)}</span>
              )}
            </div>

            {/* Core Identification and Pricing Data Rows */}
            <div className="flex-1 text-center sm:text-left space-y-2">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">{teacher.name}</h1>
              
              {/* Subjects Array Render Mapping (Rounded tag shapes) */}
              <div className="flex flex-wrap justify-center sm:justify-start gap-1.5">
                {teacher.subjects?.map(sub => (
                  <span key={sub} className="bg-blue-50 text-blue-700 text-xs px-3 py-1 rounded-full font-bold border border-blue-100 uppercase tracking-wide">
                    {sub}
                  </span>
                ))}
              </div>

              <div className="pt-2">
                <span className="text-3xl font-black text-slate-900">${teacher.rate}</span>
                <span className="text-sm font-bold text-slate-400"> / lesson hour</span>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Full Biography Content Section */}
          <div className="space-y-2">
            <h2 className="text-base font-black uppercase tracking-wider text-slate-400">Biography & Experience</h2>
            <p className="text-slate-700 text-base leading-relaxed whitespace-pre-wrap">
              {teacher.bio || "No description provided."}
            </p>
          </div>

          <hr className="border-slate-100" />

          {/* Scheduling Timetable Layout Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Available Operation Days */}
            <div className="space-y-3">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">Available Days</h2>
              <div className="flex flex-wrap gap-1.5">
                {teacher.available_days && teacher.available_days.length > 0 ? (
                  teacher.available_days.map(day => (
                    <span key={day} className="bg-slate-100 text-slate-800 text-xs px-3 py-1.5 rounded-lg font-bold border border-slate-200">
                      {day}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-slate-400 italic">No operational days selected.</p>
                )}
              </div>
            </div>

            {/* Available Custom Timetable Windows */}
            <div className="space-y-3">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">Available Hours</h2>
              <div className="flex flex-col gap-1.5">
                {teacher.time_slots && teacher.time_slots.length > 0 ? (
                  teacher.time_slots.map(slot => (
                    <div key={slot} className="bg-slate-50 text-slate-700 text-xs p-2.5 rounded-xl font-semibold border border-slate-200 flex items-center gap-2">
                      <span className="text-blue-600">🕒</span> {slot}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400 italic">No calendar time slots open.</p>
                )}
              </div>
            </div>

          </div>

          <hr className="border-slate-100 pt-2" />

          {/* Booking Action Trigger Panel */}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-lg py-4 px-6 rounded-2xl shadow-md transition"
            >
            Request Booking Schedule
          </button>

        </div>
      </div>
     <BookingModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        teacherId={teacher.id}
        teacherName={teacher.name}
        baseAvailableDays={teacher.available_days}
        timeSlots={teacher.time_slots}
        rate={teacher.rate}
        subject={teacher.subjects?.[0] || 'General'}
    />
    </div>
  )
}