"use client"
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import BookingModal from '@/app/dashboard/parent/booking/BookingModal'

interface Teacher {
  id: string
  name: string
  bio: string
  subjects: string[]
  rate: number // Always calculated as base USD
  available_days: string[]
  time_slots: string[]
  photo_url: string
  grades: string[]
}

interface Student {
  id: string
  name: string
  grade: string
}

interface BookingProcedureProps {
  parentId?: string 
  parentCurrency?: string // Passed down from the parent session shell layout
}

const AVAILABLE_SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Geography', 'Computer Science']
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const AVAILABLE_GRADES = ['Grades 1-5', 'Grades 6-8', 'Grades 9-10', 'Grades 11-12', 'University']

// Lightweight live currency exchange mapping index
const CURRENCY_EXCHANGE_RATES: Record<string, { rate: number; symbol: string }> = {
  USD: { rate: 1, symbol: '$' },
  INR: { rate: 85.5, symbol: '₹' },
  GBP: { rate: 0.79, symbol: '£' },
  EUR: { rate: 0.94, symbol: '€' },
  AED: { rate: 3.67, symbol: 'AED ' },
}

export default function BookingProcedure({ parentId, parentCurrency = 'USD' }: BookingProcedureProps) {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [parentRecordId, setParentRecordId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const [inspectedTeacher, setInspectedTeacher] = useState<Teacher | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('')
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('') 
  const [selectedDays, setSelectedDays] = useState<string[]>([])

  const currentSelectedStudent = students.find(s => s.id === selectedStudentId)

  useEffect(() => {
    async function initializeBookingSecurityAndData() {
      setLoading(true)
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) return

      let currentParentId = parentId || "";

      if (!currentParentId) {
        const { data: parentProfile, error: parentError } = await supabase
          .from('parents')
          .select('id')
          .eq('email', user.email)
          .maybeSingle()

        if (parentError || !parentProfile) return
        currentParentId = parentProfile.id
      }

      setParentRecordId(currentParentId)

      const { data: childrenData } = await supabase
        .from('students')
        .select('id, name, grade')

      if (childrenData) {
        setStudents(childrenData)
        if (childrenData.length > 0) setSelectedStudentId(childrenData[0].id)
      }

      const { data, error } = await supabase
        .from('teachers')
        .select('id, name, bio, subjects, rate, available_days, time_slots, photo_url, grades')

      if (error) {
        console.error("Database query failed:", error.message)
      } else if (data) {
        setTeachers(data as Teacher[])
      }
      setLoading(false)
    }
    initializeBookingSecurityAndData()
  }, [parentId])

  const handleDayToggle = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  // Helper template string converter engine
  const renderFormattedRateText = (usdBaseRate: number) => {
    const cleanUSD = usdBaseRate || 0
    if (parentCurrency === 'USD') {
      return <span className="text-emerald-600 font-black">${cleanUSD}/hr</span>
    }

    const conversionLookup = CURRENCY_EXCHANGE_RATES[parentCurrency] || { rate: 1, symbol: `${parentCurrency} ` }
    const convertedAmount = (cleanUSD * conversionLookup.rate).toFixed(0)

    return (
      <span className="text-emerald-600 font-black">
        ${cleanUSD}/hr <span className="text-xs text-slate-400 font-bold font-mono">({conversionLookup.symbol}{convertedAmount}/hr)</span>
      </span>
    )
  }

  const processedTeachers = teachers
    .filter(teacher => {
      const matchesName = teacher.name?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesSubject = selectedSubjectFilter === '' || teacher.subjects?.includes(selectedSubjectFilter)
      const matchesGrade = selectedGradeFilter === '' || teacher.grades?.includes(selectedGradeFilter)
      const matchesDays = selectedDays.length === 0 || selectedDays.some(day => 
        teacher.available_days?.includes(day)
      )
      return matchesName && matchesSubject && matchesGrade && matchesDays
    })
    .sort((a, b) => {
      const targetGrade = currentSelectedStudent?.grade || ""
      const aMatches = a.grades?.includes(targetGrade) ? 1 : 0
      const bMatches = b.grades?.includes(targetGrade) ? 1 : 0
      
      return bMatches - aMatches 
    })

  const getResolvedSubjectTarget = (teacher: Teacher) => {
    if (selectedSubjectFilter && teacher.subjects?.includes(selectedSubjectFilter)) {
      return selectedSubjectFilter
    }
    return teacher.subjects?.[0] || 'General Studies'
  }

  return (
    <div className="space-y-6">
      {/* Header Layout Row */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Find an Educator</h1>
          <p className="text-sm text-slate-500">Discover and schedule an introductory demo class with expert specialized academic mentors</p>
        </div>
        
        {inspectedTeacher && (
          <button 
            type="button"
            onClick={() => setInspectedTeacher(null)} 
            className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 uppercase tracking-wider rounded-xl hover:bg-slate-100 transition shadow-2xs"
          >
            ← Back to Catalog
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3 bg-white border border-slate-200 rounded-3xl">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-500">Syncing secure database parameters...</p>
        </div>
      ) : inspectedTeacher ? (
        
        /* DETAILED SINGLE TEACHER DISPLAY WORKSPACE */
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in-50 duration-200">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 flex-shrink-0 flex items-center justify-center relative shadow-xs">
              {inspectedTeacher.photo_url ? (
                <img src={inspectedTeacher.photo_url} alt={inspectedTeacher.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-5xl font-black text-blue-600 uppercase">{inspectedTeacher.name?.charAt(0)}</span>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{inspectedTeacher.name}</h1>
                {currentSelectedStudent?.grade && inspectedTeacher.grades?.includes(currentSelectedStudent.grade) && (
                  <span className="bg-blue-600 text-white font-black px-2.5 py-0.5 rounded-md text-[10px] uppercase tracking-wider shadow-sm">
                    ✨ Matched for {currentSelectedStudent.name}
                  </span>
                )}
              </div>
              
              <div className="flex flex-wrap justify-center sm:justify-start gap-1.5">
                {inspectedTeacher.subjects?.map(sub => (
                  <span key={sub} className="bg-blue-50 text-blue-700 text-xs px-3 py-1 rounded-full font-bold border border-blue-100 uppercase tracking-wide">
                    {sub}
                  </span>
                ))}
              </div>
              <div className="pt-2 flex items-baseline gap-1.5 justify-center sm:justify-start">
                <span className="text-2xl font-black text-slate-900">{renderFormattedRateText(inspectedTeacher.rate)}</span>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />
          
          <div className="space-y-2">
            <h2 className="text-base font-black uppercase tracking-wider text-slate-400">Target Audiences & Grades Taken</h2>
            <div className="flex flex-wrap gap-1.5">
              {inspectedTeacher.grades?.map(g => (
                <span key={g} className="bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs px-2.5 py-1 font-bold">
                  {g}
                </span>
              )) || <span className="text-xs text-slate-400 italic">No targeted ranges configured.</span>}
            </div>
          </div>

          <hr className="border-slate-100" />
          <div className="space-y-2">
            <h2 className="text-base font-black uppercase tracking-wider text-slate-400">Biography & Experience</h2>
            <p className="text-slate-700 text-base leading-relaxed whitespace-pre-wrap">{inspectedTeacher.bio || "No description provided."}</p>
          </div>

          <hr className="border-slate-100" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">Available Days</h2>
              <div className="flex flex-wrap gap-1.5">
                {inspectedTeacher.available_days?.map(day => (
                  <span key={day} className="bg-slate-100 text-slate-800 text-xs px-3 py-1.5 rounded-lg font-bold border border-slate-200">
                    {day}
                  </span>
                )) || <p className="text-sm text-slate-400 italic">No operational days selected.</p>}
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">Available Hours</h2>
              <div className="flex flex-col gap-1.5">
                {inspectedTeacher.time_slots?.map(slot => (
                  <div key={slot} className="bg-slate-50 text-slate-700 text-xs p-2.5 rounded-xl font-semibold border border-slate-200 flex items-center gap-2">
                    <span className="text-blue-600">🕒</span> {slot}
                  </div>
                )) || <p className="text-sm text-slate-400 italic">No calendar time slots open.</p>}
              </div>
            </div>
          </div>

          <hr className="border-slate-100 pt-2" />
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-slate-600 font-medium">
            💡 <strong className="text-amber-900 font-bold uppercase">Pipeline Step:</strong> Booking this teacher initializes a single-session evaluation checkpoint. Once complete, you can review performance and finalize a recurring course syllabus strategy.
          </div>

          <button 
            type="button"
            onClick={() => {
              if (!selectedStudentId && students.length > 0) {
                alert("Please assign a lesson target student profile first.")
                return
              }
              setIsModalOpen(true)
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-lg py-4 px-6 rounded-2xl shadow-md transition"
          >
            Open Trial Scheduling Calendar
          </button>
        </div>

      ) : (
        
        /* CATALOG DISPLAY DIRECTORY */
        <>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            {students.length > 0 && (
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-black uppercase text-blue-800 tracking-wide">Assign Lesson Target Profile Context</h4>
                  <p className="text-xs text-slate-500">Associating a student matches their grade levels with our teacher catalog dynamically.</p>
                </div>
                <select 
                  className="p-2 border border-blue-200 rounded-lg bg-white text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-[240px]"
                  value={selectedStudentId}
                  onChange={e => setSelectedStudentId(e.target.value)}
                >
                  {students.map(student => (
                    <option key={student.id} value={student.id}>
                      🧒 {student.name} ({student.grade || 'No Grade Added'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="relative">
              <input 
                type="text"
                placeholder="Search teachers by name..."
                className="w-full p-3.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition font-medium text-sm"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <label className="text-xs font-black uppercase tracking-wider text-slate-400">Filter By Desired Days</label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map(day => {
                  const isSelected = selectedDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDayToggle(day)}
                      className={`px-3 py-1.5 text-xs font-bold uppercase rounded-lg border transition tracking-wide ${
                        isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-xs' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {day.substring(0, 3)}
                    </button>
                  )
                })}
                {selectedDays.length > 0 && (
                  <button type="button" onClick={() => setSelectedDays([])} className="text-xs font-black text-red-500 hover:text-red-700 uppercase tracking-wider px-2">
                    Clear Days ✕
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400">Filter By Subject Focus Area</label>
                <select
                  className="w-full p-3 border border-slate-200 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm cursor-pointer"
                  value={selectedSubjectFilter}
                  onChange={e => setSelectedSubjectFilter(e.target.value)}
                >
                  <option value="">All Subjects Combined</option>
                  {AVAILABLE_SUBJECTS.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400">Filter By Student Grade Levels</label>
                <select
                  className="w-full p-3 border border-slate-200 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm cursor-pointer text-slate-700"
                  value={selectedGradeFilter}
                  onChange={e => setSelectedGradeFilter(e.target.value)}
                >
                  <option value="">All Academic Grade Ranges</option>
                  {AVAILABLE_GRADES.map(grade => <option key={grade} value={grade}>{grade}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Unified Dynamic Grid Loop Output Section */}
          <div className="flex flex-col gap-4">
            {processedTeachers.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200 p-6">
                <p className="text-slate-400 font-medium">No educators match your active filtering combination.</p>
              </div>
            ) : (
              processedTeachers.map((teacher) => {
                const isGradeMatch = currentSelectedStudent?.grade && teacher.grades?.includes(currentSelectedStudent.grade);
                
                return (
                  <div 
                    key={teacher.id} 
                    className={`flex flex-col sm:flex-row items-center bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition gap-6 w-full relative ${
                      isGradeMatch ? 'border-blue-400 ring-4 ring-blue-600/5' : 'border-slate-200'
                    }`}
                  >
                    {/* Visual priority floating badge flag layout item */}
                    {isGradeMatch && (
                      <span className="absolute top-3 right-4 bg-blue-100 text-blue-700 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                        Target Grade Match
                      </span>
                    )}

                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 relative flex items-center justify-center shadow-2xs">
                      {teacher.photo_url ? <img src={teacher.photo_url} alt={teacher.name} className="w-full h-full object-cover" /> : <span className="text-3xl font-black text-blue-600 uppercase">{teacher.name?.charAt(0) || "T"}</span>}
                    </div>

                    <div className="flex-1 text-center sm:text-left min-w-0 space-y-2">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 truncate">{teacher.name}</h2>
                        <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                          {teacher.bio ? (teacher.bio.length > 140 ? teacher.bio.substring(0, 140) + "..." : teacher.bio) : "No bio description summary profile info provided."}
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-1 pt-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-1">Schedule:</span>
                        {DAYS_OF_WEEK.map(day => {
                          const isAvailable = teacher.available_days?.includes(day);
                          return (
                            <span key={day} className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-tight ${isAvailable ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-50 text-slate-300 line-through'}`}>
                              {day.substring(0, 3)}
                            </span>
                          )
                        })}
                      </div>

                      {/* Display accepted grade levels alongside standard catalog layout options */}
                      <div className="flex flex-wrap gap-1 items-center pt-0.5">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-1">Grades:</span>
                        {teacher.grades?.map((g: string) => (
                          <span key={g} className={`text-[9px] font-bold px-2 py-0.5 rounded ${g === currentSelectedStudent?.grade ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                            {g}
                          </span>
                        )) || <span className="text-[10px] italic text-slate-400">None Specified</span>}
                      </div>

                      <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start pt-1">
                        {teacher.subjects?.map((sub) => (
                          <span key={sub} className="bg-slate-50 text-slate-700 text-[10px] px-2.5 py-1 rounded-md font-bold border border-slate-200 uppercase tracking-wide">{sub}</span>
                        ))}
                      </div>
                    </div>

                    <div className="sm:border-l border-slate-100 sm:pl-6 flex flex-col items-center sm:items-end justify-center min-w-[170px] gap-2 w-full sm:w-auto">
                      <div className="text-center sm:text-right">
                        {renderFormattedRateText(teacher.rate)}
                      </div>
                      <button type="button" onClick={() => setInspectedTeacher(teacher)} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider py-3 px-4 rounded-xl transition active:scale-95 text-center whitespace-nowrap shadow-sm">
                        View Profile
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </>
      )}

      {inspectedTeacher && (
        <BookingModal 
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setInspectedTeacher(null)
          }}
          teacherId={inspectedTeacher.id}
          teacherName={inspectedTeacher.name}
          baseAvailableDays={inspectedTeacher.available_days}
          timeSlots={inspectedTeacher.time_slots}
          rate={inspectedTeacher.rate}
          subject={getResolvedSubjectTarget(inspectedTeacher)}
          studentId={selectedStudentId} 
          parentId={parentRecordId}
        />
      )}
    </div>
  )
} 