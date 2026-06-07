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

export default function BookingProcedureTab({ parentId }: { parentId: string }) {
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
    async function loadMarketplaceData() {
      setLoading(true)
      
      // 1. Fetch children explicitly tied to this secure parentId instance
      const { data: children, error: studentError } = await supabase
        .from('students')
        .select('id, name')
        .eq('parent_id', parentId)

      if (!studentError && children) {
        setStudents(children)
        if (children.length > 0) {
          setSelectedStudent(children[0].id)
        }
      }

      // 2. Fetch Active Teacher Data
      const { data: educators, error: teacherError } = await supabase
        .from('teachers')
        .select('id, name, bio, subjects, rate, photo_url')

      if (!teacherError && educators) {
        setTeachers(educators as Teacher[])
        const highestRate = Math.max(...educators.map(t => t.rate || 0))
        setMaxRateFilter(highestRate > 0 ? highestRate : 150)
      }

      setLoading(false)
    }

    if (parentId) {
      loadMarketplaceData()
    }
  }, [parentId])

  const filteredTeachers = teachers.filter(teacher => {
    const matchesName = teacher.name?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSubject = selectedSubjectFilter === '' || teacher.subjects?.includes(selectedSubjectFilter)
    const matchesRate = (teacher.rate || 0) <= maxRateFilter
    return matchesName && matchesSubject && matchesRate
  })

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-2">
        <span className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400">Loading available educators...</p>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Book a Session</h1>
        <p className="text-xs text-slate-500">Select a child profile and match with an expert live tutor</p>
      </div>

      {/* CHILD PROFILES DROPDOWN COMPONENT */}
      <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-black uppercase text-blue-900 tracking-wide">Target Student Profile</h4>
          <p className="text-[11px] text-slate-500">Who will be attending this customized learning workspace session?</p>
        </div>
        {students.length === 0 ? (
          <span className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
            ⚠️ No students registered yet
          </span>
        ) : (
          <select
            className="p-2 border border-blue-200 rounded-lg bg-white text-xs font-bold text-slate-700 outline-none cursor-pointer min-w-[200px]"
            value={selectedStudent}
            onChange={e => setSelectedStudent(e.target.value)}
          >
            {students.map(student => (
              <option key={student.id} value={student.id}>Child: {student.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* FILTER CONTROL PANEL */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-2xs">
        <input
          type="text"
          placeholder="Search teachers by name..."
          className="w-full p-2.5 border rounded-lg bg-slate-50 text-xs font-medium outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <select
            className="p-2.5 border rounded-lg bg-slate-50 text-xs font-medium outline-none cursor-pointer"
            value={selectedSubjectFilter}
            onChange={e => setSelectedSubjectFilter(e.target.value)}
          >
            <option value="">All Subjects Combined</option>
            {AVAILABLE_SUBJECTS.map(sub => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>

          <div className="flex flex-col justify-center">
            <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase">
              <span>Budget Cap</span>
              <span className="text-blue-600">${maxRateFilter}/hr</span>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              step="5"
              className="w-full mt-2 accent-blue-600"
              value={maxRateFilter}
              onChange={e => setMaxRateFilter(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* EDUCATOR CATALOG DISPLAY CARD LIST */}
      <div className="space-y-2">
        {filteredTeachers.map(teacher => (
          <div key={teacher.id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-slate-100 border flex-shrink-0 flex items-center justify-center font-black text-blue-600 uppercase text-sm">
              {teacher.name.charAt(0)}
            </div>

            <div className="flex-1 min-w-0 text-center sm:text-left">
              <h4 className="font-bold text-slate-800 text-sm truncate">{teacher.name}</h4>
              <p className="text-xs text-slate-400 truncate">{teacher.bio || "No profile details uploaded."}</p>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l pt-2 sm:pt-0 sm:pl-4 gap-2 w-full sm:w-auto min-w-[110px]">
              <div className="text-left sm:text-right">
                <span className="text-base font-black">${teacher.rate}</span>
                <span className="text-[10px] text-slate-400 block">/ hour</span>
              </div>
              
              <button
                type="button"
                onClick={() => {
                  if (!selectedStudent) return alert("Please select a student profile context.")
                  // 🚀 This forwards the parentId and studentId safely to your booking-teacher-[id] page!
                  router.push(`/booking/teacher/${teacher.id}?student=${selectedStudent}&parent=${parentId}`)
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] py-1.5 px-3 rounded-lg transition"
              >
                Hire Tutor
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}