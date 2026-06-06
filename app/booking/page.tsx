"use client"
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Teacher {
  id: string
  name: string
  bio: string
  subjects: string[]
  rate: number
  photo_url: string
}

// Master list matching your signup definitions
const AVAILABLE_SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Geography', 'Computer Science']

export default function BookingProcedure() {
  const router = useRouter()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)

  // Filtering States
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('')
  const [maxRateFilter, setMaxRateFilter] = useState<number>(150) // Default max range ceiling

  useEffect(() => {
    async function fetchCatalog() {
      setLoading(true)
      const { data, error } = await supabase
        .from('teachers')
        .select('id, name, bio, subjects, rate, photo_url')

      if (error) {
        console.error("Database query failed:", error.message)
      } else if (data) {
        setTeachers(data as Teacher[])
        
        // Dynamically calibrate the filter slider ceiling to match the highest rate in your database
        if (data.length > 0) {
          const highestRate = Math.max(...data.map(t => t.rate || 0))
          setMaxRateFilter(highestRate > 0 ? highestRate : 150)
        }
      }
      setLoading(false)
    }
    fetchCatalog()
  }, [])

  // 1. Core Real-Time Search & Filtering Logic
  const filteredTeachers = teachers.filter(teacher => {
    const matchesName = teacher.name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSubject = selectedSubjectFilter === '' || teacher.subjects?.includes(selectedSubjectFilter)
    const matchesRate = (teacher.rate || 0) <= maxRateFilter

    return matchesName && matchesSubject && matchesRate
  })

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 sm:p-10">
      <div className="max-w-5xl mx-auto">
        
        {/* Header Terminal */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Booking Procedure</h1>
            <p className="text-sm text-slate-500">Search, filter, and discover your perfect home tutor match</p>
          </div>
          <button 
            onClick={() => router.push('/')} 
            className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition"
          >
            Home
          </button>
        </div>

        {/* Control Panel: Search Bar & Filters Dashboard Container */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6 space-y-5">
          
          {/* A. Top Section: Text Search Bar */}
          <div className="relative">
            <input 
              type="text"
              placeholder="🔍 Search teachers by name..."
              className="w-full p-3.5 pl-11 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition font-medium"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* B. Grid Segment: Subject Filter & Hourly Price Slider */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            
            {/* Subject Dropdown Filter */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400">Filter By Subject</label>
              <select
                className="w-full p-3 border border-slate-200 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
                value={selectedSubjectFilter}
                onChange={e => setSelectedSubjectFilter(e.target.value)}
              >
                <option value="">All Subjects Combined</option>
                {AVAILABLE_SUBJECTS.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            {/* Price Budget Range Slider */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400">Maximum Hourly Budget</label>
                <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">${maxRateFilter}/hr</span>
              </div>
              <input 
                type="range"
                min="0"
                max="200"
                step="5"
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 mt-3"
                value={maxRateFilter}
                onChange={e => setMaxRateFilter(Number(e.target.value))}
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold px-1">
                <span>$0 / HR</span>
                <span>$200 / HR</span>
              </div>
            </div>

          </div>
        </div>

        {/* Dynamic Display Catalog Engine */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-slate-500">Syncing database feed...</p>
          </div>
        ) : filteredTeachers.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 p-6">
            <p className="text-slate-400 font-medium">No educators match your active search filter targets.</p>
          </div>
        ) : (
          /* Map List View Rows */
          <div className="flex flex-col gap-4">
            {filteredTeachers.map((teacher) => (
              <div 
                key={teacher.id}
                className="flex flex-col sm:flex-row items-center bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition gap-6 w-full"
              >
                {/* 1. Profile Image Component */}
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 relative flex items-center justify-center">
                  {teacher.photo_url ? (
                    <img src={teacher.photo_url} alt={teacher.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-black text-blue-600 uppercase">
                      {teacher.name?.charAt(0) || "T"}
                    </span>
                  )}
                </div>

                {/* 2. Text Content Block */}
                <div className="flex-1 text-center sm:text-left min-w-0">
                  <h2 className="text-xl font-bold text-slate-900 truncate">{teacher.name}</h2>
                  <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                    {teacher.bio ? (teacher.bio.length > 140 ? teacher.bio.substring(0, 140) + "..." : teacher.bio) : "No description bios provided."}
                  </p>
                </div>

                {/* 3. Subjects Box Tags (Small rounded edged boxes) */}
                <div className="flex flex-wrap gap-1.5 justify-center max-w-[200px] py-2">
                  {teacher.subjects && teacher.subjects.length > 0 ? (
                    teacher.subjects.map((sub) => (
                      <span 
                        key={sub} 
                        className="bg-slate-100 text-slate-700 text-[11px] px-2.5 py-1 rounded-md font-semibold border border-slate-200 tracking-wide shadow-2xs whitespace-nowrap"
                      >
                        {sub}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">General Studies</span>
                  )}
                </div>

                {/* 4. Pricing / Action Column Section Layout */}
                <div className="sm:border-l border-slate-100 sm:pl-6 flex flex-col items-center sm:items-end justify-center min-w-[140px] gap-2">
                  <div className="text-center sm:text-right">
                    <span className="text-2xl font-black text-slate-900">${teacher.rate}</span>
                    <span className="text-xs text-slate-400 font-bold block">/ hour</span>
                  </div>
                  
                  <button
                    onClick={() => router.push(`/booking/teacher/${teacher.id}`)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-2.5 px-4 rounded-xl shadow-sm hover:shadow transition active:scale-95 text-center whitespace-nowrap"
                  >
                    See More
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}