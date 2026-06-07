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

interface Student {
  id: string
  name: string
}

const AVAILABLE_SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Geography', 'Computer Science']

export default function BookingProcedure() {
  const router = useRouter()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // Filtering States
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('')
  const [maxRateFilter, setMaxRateFilter] = useState<number>(150) 

  useEffect(() => {
    async function initializeBookingSecurityAndData() {
      setLoading(true)

      // 1. Core Auth Guard Check
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        router.push('/login')
        return
      }

      // Query the actual parent table directly to verify the active role
      const { data: parentProfile, error: parentError } = await supabase
        .from('parents')
        .select('id')
        .eq('email', user.email)
        .maybeSingle()

      if (parentError || !parentProfile) {
        console.warn("Access denied: User record not found in Parents database.")
        router.push('/login')
        return
      }

      // Fetch children managed by this parent profile to handle room booking allocations
      const { data: childrenData } = await supabase
        .from('students')
        .select('id, name')
        .eq('parent_id', parentProfile.id)

      if (childrenData) {
        setStudents(childrenData)
        if (childrenData.length > 0) setSelectedStudent(childrenData[0].id)
      }

      // 2. Fetch Active Teacher Directory Feeds
      const { data, error } = await supabase
        .from('teachers')
        .select('id, name, bio, subjects, rate, photo_url')

      if (error) {
        console.error("Database query failed:", error.message)
      } else if (data) {
        setTeachers(data as Teacher[])
        
        if (data.length > 0) {
          const highestRate = Math.max(...data.map(t => t.rate || 0))
          setMaxRateFilter(highestRate > 0 ? highestRate : 150)
        }
      }
      setLoading(false)
    }

    initializeBookingSecurityAndData()
  }, [router])

  const filteredTeachers = teachers.filter(teacher => {
    const matchesName = teacher.name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSubject = selectedSubjectFilter === '' || teacher.subjects?.includes(selectedSubjectFilter)
    const matchesRate = (teacher.rate || 0) <= maxRateFilter

    return matchesName && matchesSubject && matchesRate
  })

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 sm:p-10">
      <div className="max-w-5xl mx-auto">
        
        {/* Header Ribbon Row Layout */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Find an Educator</h1>
            <p className="text-sm text-slate-500">Search, filter, and discover your perfect live tutor match</p>
          </div>
          
          <button 
            type="button"
            onClick={() => router.push('/dashboard/parent')} 
            className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 uppercase tracking-wider rounded-xl hover:bg-slate-100 transition shadow-xs"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Filters and Selection Parameters Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6 space-y-5">
          
          {/* Linked Context Student Selection Block */}
          {students.length > 0 && (
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-black uppercase text-blue-800 tracking-wide">Assign Lesson Target</h4>
                <p className="text-xs text-slate-500">Select the student profile to associate with this booking entry.</p>
              </div>
              <select 
                className="p-2 border border-blue-200 rounded-lg bg-white text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[200px]"
                value={selectedStudent}
                onChange={e => setSelectedStudent(e.target.value)}
              >
                {students.map(student => (
                  <option key={student.id} value={student.id}>Student: {student.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Text Search Inputs */}
          <div className="relative">
            <input 
              type="text"
              placeholder="Search teachers by name..."
              className="w-full p-3.5 pl-4 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition font-medium"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Parameter Customization Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
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
            </div>
          </div>
        </div>

        {/* Dynamic Catalog Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-slate-500">Syncing database parameters...</p>
          </div>
        ) : filteredTeachers.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 p-6">
            <p className="text-slate-400 font-medium">No educators match your active search filters.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredTeachers.map((teacher) => (
              <div 
                key={teacher.id}
                className="flex flex-col sm:flex-row items-center bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition gap-6 w-full"
              >
                {/* Profile Image Avatar */}
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 relative flex items-center justify-center">
                  {teacher.photo_url ? (
                    <img src={teacher.photo_url} alt={teacher.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-black text-blue-600 uppercase">
                      {teacher.name?.charAt(0) || "T"}
                    </span>
                  )}
                </div>

                {/* Info Text Meta Columns */}
                <div className="flex-1 text-center sm:text-left min-w-0">
                  <h2 className="text-xl font-bold text-slate-900 truncate">{teacher.name}</h2>
                  <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                    {teacher.bio ? (teacher.bio.length > 140 ? teacher.bio.substring(0, 140) + "..." : teacher.bio) : "No bio description provided."}
                  </p>
                  
                  <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start mt-3">
                    {teacher.subjects?.map((sub) => (
                      <span key={sub} className="bg-slate-100 text-slate-700 text-[10px] px-2.5 py-1 rounded-md font-bold border border-slate-200 uppercase tracking-wide">
                        {sub}
                      </span>
                    )) || <span className="text-xs text-slate-400 italic">General Studies</span>}
                  </div>
                </div>

                {/* Pricing & Forward Redirection Action Buttons */}
                <div className="sm:border-l border-slate-100 sm:pl-6 flex flex-col items-center sm:items-end justify-center min-w-[140px] gap-2">
                  <div className="text-center sm:text-right">
                    <span className="text-2xl font-black text-slate-900">${teacher.rate}</span>
                    <span className="text-xs text-slate-400 font-bold block">/ hour</span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedStudent && students.length > 0) {
                        alert("Please select a student profile before scheduling lessons.")
                        return
                      }
                      // Forwards both the target teacher ID and student parameter contexts downstream
                      router.push(`/booking/teacher/${teacher.id}?student=${selectedStudent}`)
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider py-3 px-4 rounded-xl transition active:scale-95 text-center whitespace-nowrap shadow-sm"
                  >
                    Select Tutor
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