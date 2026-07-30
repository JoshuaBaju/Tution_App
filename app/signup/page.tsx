"use client"
import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

const AVAILABLE_SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Geography', 'Computer Science']
const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const AVAILABLE_GRADES = ['Grades 1-5', 'Grades 6-8', 'Grades 9-10', 'Grades 11-12', 'University']
const POPULAR_COUNTRIES = ['India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'United Arab Emirates', 'Saudi Arabia', 'Singapore']

const TIME_SLOTS = [
  '04:00 AM - 05:00 AM', '05:00 AM - 06:00 AM', '06:00 AM - 07:00 AM', '07:00 AM - 08:00 AM',
  '08:00 AM - 09:00 AM', '09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM',
  '12:00 PM - 01:00 PM', '01:00 PM - 02:00 PM', '02:00 PM - 03:00 PM', '03:00 PM - 04:00 PM',
  '04:00 PM - 05:00 PM', '05:00 PM - 06:00 PM', '06:00 PM - 07:00 PM', '07:00 PM - 08:00 PM',
  '08:00 PM - 09:00 PM', '09:00 PM - 10:00 PM', '10:00 PM - 11:00 PM'
]

function SignupFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const targetStudentId = searchParams.get('student_id')
  const inviteEmail = searchParams.get('email') || ''
  const isStudentInvite = !!targetStudentId 

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('parent')
  const [loading, setLoading] = useState(false)

  // Parent Fields
  const [parentName, setParentName] = useState('')
  const [phone, setPhone] = useState('')
  const [parentCountry, setParentCountry] = useState('')
  const [parentCurrency, setParentCurrency] = useState('USD')

  // Teacher Fields
  const [teacherName, setTeacherName] = useState('')
  const [bio, setBio] = useState('')
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [rate, setRate] = useState('650') 
  const [selectedSlots, setSelectedSlots] = useState<string[]>([])
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [teacherCountry, setTeacherCountry] = useState('India')
  const [teacherCurrency, setTeacherCurrency] = useState('INR')
  const [selectedGrades, setSelectedGrades] = useState<string[]>([])

  useEffect(() => {
    if (isStudentInvite && inviteEmail) {
      setEmail(inviteEmail.trim())
    }
  }, [isStudentInvite, inviteEmail])

  const toggleSubject = (subject: string) => {
    setSelectedSubjects(prev => 
      prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]
    )
  }

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  const toggleGrade = (grade: string) => {
    setSelectedGrades(prev => 
      prev.includes(grade) ? prev.filter(g => g !== grade) : [...prev, grade]
    )
  }

  const toggleTimeSlot = (slot: string) => {
    setSelectedSlots(prev => 
      prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]
    )
  }

  const handleSignup = async (e: React.FormEvent) => {
    if (e) e.preventDefault()
    if (loading) return
    setLoading(true)

    if (!email || !password) {
      alert("Please fill in your email and password.")
      setLoading(false)
      return
    }

    if (!isStudentInvite && role === 'parent') {
      if (!parentName || !phone || !parentCountry) {
        alert("Parents must fill in Name, Phone Number, and Country.")
        setLoading(false)
        return
      }
    }

    if (!isStudentInvite && role === 'teacher') {
      if (!teacherName || !bio || selectedSubjects.length === 0 || !rate || selectedDays.length === 0 || selectedSlots.length === 0 || !teacherCountry || selectedGrades.length === 0) {
        alert("Teachers must fill in all fields including Country, Grades, and Timings.")
        setLoading(false)
        return
      }
    }

    try {
      const { data, error } = await supabase.auth.signUp({ 
        email: email.trim(), 
        password 
      })
      
      if (error) {
        alert("Auth Error: " + error.message)
        setLoading(false)
        return
      }

      if (data?.user) {
        const userId = data.user.id

        if (isStudentInvite) {
          const { error: dbError } = await supabase
            .from('students')
            .update({ id: userId }) 
            .eq('id', targetStudentId)

          if (dbError) {
            alert("Student Account Link Error: " + dbError.message)
          } else {
            alert("Student Hub successfully activated!")
            router.push('/dashboard/student')
            return
          }

        } else if (role === 'parent') {
          const { error: dbError } = await supabase
            .from('parents')
            .insert([{ 
              id: userId, 
              email: email.trim(), 
              name: parentName, 
              phone_number: phone, 
              country: parentCountry,
              currency: parentCurrency
            }])

          if (dbError) {
            alert("Database Error: " + dbError.message)
          } else {
            alert("Parent registered successfully!")
            router.push('/dashboard/parent')
            return
          }

        } else {
          let photoUrl = ""
          if (photoFile) {
            const fileExt = photoFile.name.split('.').pop()
            const fileName = `${userId}-${Date.now()}.${fileExt}`
            
            const { error: uploadError } = await supabase.storage
              .from('teacher-photos')
              .upload(fileName, photoFile)

            if (uploadError) {
              alert("Photo upload failed: " + uploadError.message)
              setLoading(false)
              return
            }

            const { data: publicUrlData } = supabase.storage
              .from('teacher-photos')
              .getPublicUrl(fileName)
            
            photoUrl = publicUrlData.publicUrl
          }

          const { error: dbError } = await supabase
            .from('teachers')
            .insert([{ 
              id: userId, 
              email: email.trim(), 
              name: teacherName, 
              bio: bio, 
              subjects: selectedSubjects,
              rate: parseFloat(rate) || 650, 
              available_days: selectedDays,
              time_slots: selectedSlots, 
              photo_url: photoUrl,
              country: teacherCountry,
              currency: teacherCurrency,
              grades: selectedGrades
            }])

          if (dbError) {
            alert("Database Error: " + dbError.message)
          } else {
            alert("Teacher registered successfully!")
            router.push('/dashboard/teacher')
            return
          }
        }
      }
    } catch (err) {
      console.error("System processing error: ", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="w-full max-w-lg p-8 bg-white shadow-xl rounded-2xl border border-slate-200">
        <h1 className="text-3xl font-black mb-2 text-center text-blue-600">
          {isStudentInvite ? "Activate Student Hub" : "Tuition Hero"}
        </h1>
        <p className="text-center text-slate-500 mb-6">
          {isStudentInvite ? "Set your password to claim your classroom profile" : "Create your account below"}
        </p>
        
        {!isStudentInvite && (
          <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
            <button type="button" onClick={() => setRole('parent')} className={`flex-1 py-2 rounded-lg font-bold transition ${role === 'parent' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}>
              I am a Parent
            </button>
            <button type="button" onClick={() => setRole('teacher')} className={`flex-1 py-2 rounded-lg font-bold transition ${role === 'teacher' ? 'bg-white text-blue-600 shadow' : 'text-slate-500'}`}>
              I am a Teacher
            </button>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-1">
            {isStudentInvite && (
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">Assigned Profile Email</span>
                <span className="text-[10px] font-bold text-slate-400">🔒 Locked by Parent</span>
              </div>
            )}
            <input 
              type="email" 
              placeholder="Email Address" 
              disabled={isStudentInvite} 
              className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white ${isStudentInvite ? 'bg-slate-100/80 text-slate-400 cursor-not-allowed border-slate-200 font-semibold select-none' : ''}`} 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required
            />
          </div>

          <input 
            type="password" 
            placeholder={isStudentInvite ? "Choose a Secure Password" : "Create Password"} 
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required
          />
          
          {!isStudentInvite && <hr className="my-4 border-slate-200" />}

          {/* Parent Fields */}
          {!isStudentInvite && role === 'parent' && (
            <div className="space-y-4">
              <input type="text" placeholder="Full Name" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" value={parentName} onChange={e => setParentName(e.target.value)} />
              <input type="text" placeholder="Phone Number" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" value={phone} onChange={e => setPhone(e.target.value)} />
              
              <div className="grid grid-cols-2 gap-4">
                <select 
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-700 font-medium"
                  value={parentCountry}
                  onChange={e => setParentCountry(e.target.value)}
                >
                  <option value="" disabled>Select Country</option>
                  {POPULAR_COUNTRIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select 
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-700 font-medium"
                  value={parentCurrency}
                  onChange={e => setParentCurrency(e.target.value)}
                >
                  <option value="USD">USD ($)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD (C$)</option>
                  <option value="AUD">AUD (A$)</option>
                </select>
              </div>
            </div>
          )}

          {/* Teacher Fields */}
          {!isStudentInvite && role === 'teacher' && (
            <div className="space-y-5">
              <input type="text" placeholder="Full Name" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" value={teacherName} onChange={e => setTeacherName(e.target.value)} />
              <textarea placeholder="Bio / Experience" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" value={bio} onChange={e => setBio(e.target.value)} />
              
              <div className="grid grid-cols-2 gap-4">
                <select 
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-700 font-medium"
                  value={teacherCountry}
                  onChange={e => setTeacherCountry(e.target.value)}
                >
                  {POPULAR_COUNTRIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input type="text" placeholder="Currency" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 text-slate-500 font-medium" value={teacherCurrency} disabled />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-600 block mb-2">Grades You Can Take:</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_GRADES.map(grade => {
                    const isSelected = selectedGrades.includes(grade)
                    return (
                      <button
                        key={grade}
                        type="button"
                        onClick={() => toggleGrade(grade)}
                        className={`px-3 py-1.5 text-sm rounded-full font-medium transition border ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                      >
                        {grade}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-600 block mb-2">Select Subjects:</label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_SUBJECTS.map(subject => {
                    const isSelected = selectedSubjects.includes(subject)
                    return (
                      <button
                        key={subject}
                        type="button"
                        onClick={() => toggleSubject(subject)}
                        className={`px-3 py-1.5 text-sm rounded-full font-medium transition border ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                      >
                        {subject}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <input type="number" placeholder="Hourly Rate" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 text-slate-500 cursor-not-allowed" value={rate} disabled />
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800 font-semibold flex items-center justify-between">
                  <span>System Standard Fixed Payout:</span>
                  <span className="bg-emerald-600 text-white font-bold px-2 py-0.5 rounded">You will be paid INR 650 per hour</span>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-bold text-slate-600 block mb-2">Select Available Days:</label>
                <div className="flex flex-wrap gap-2">
                  {WEEK_DAYS.map(day => {
                    const isSelected = selectedDays.includes(day)
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`px-3 py-1.5 text-sm rounded-full font-medium transition border ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="relative">
                <label className="text-sm font-bold text-slate-600 block mb-2">
                  Available Time Slots ({selectedSlots.length} selected):
                </label>
                <div 
                  onClick={() => document.getElementById('time-drawer')?.classList.toggle('hidden')}
                  className="w-full p-3 border rounded-lg bg-white border-slate-200 cursor-pointer hover:bg-slate-50 transition min-h-[46px] flex flex-wrap gap-1.5 items-center text-slate-500 text-sm"
                >
                  {selectedSlots.length === 0 ? (
                    <span>Click to choose timings...</span>
                  ) : (
                    selectedSlots.map(slot => (
                      <span 
                        key={slot} 
                        className="bg-blue-600 text-white text-xs px-2.5 py-1 rounded-md font-medium flex items-center gap-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleTimeSlot(slot)
                        }}
                      >
                        {slot.split(' - ')[0]}
                        <button type="button" className="font-bold hover:text-red-200">×</button>
                      </span>
                    ))
                  )}
                </div>

                <div id="time-drawer" className="hidden absolute z-10 left-0 right-0 mt-1 p-3 bg-white border border-slate-200 shadow-xl rounded-xl max-h-52 overflow-y-auto grid grid-cols-2 gap-1.5">
                  {TIME_SLOTS.map(slot => {
                    const isSelected = selectedSlots.includes(slot)
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => toggleTimeSlot(slot)}
                        className={`p-2 text-xs rounded-lg font-medium transition border text-center ${isSelected ? 'bg-blue-50 text-blue-600 border-blue-400' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                      >
                        {slot}
                      </button>
                    )
                  })}
                </div>
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-sm font-bold text-slate-600">Profile Photo</label>
                <input type="file" accept="image/*" className="w-full p-2 border border-dashed rounded-lg bg-slate-50 cursor-pointer" onChange={e => setPhotoFile(e.target.files?.[0] || null)} />
              </div>
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-lg hover:bg-blue-700 transition disabled:bg-slate-400 shadow-md shadow-blue-600/10"
          >
            {loading ? 'Processing Profile Registration...' : isStudentInvite ? 'Complete Account Activation' : `Complete ${role === 'parent' ? 'Parent' : 'Teacher'} Setup`}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function Signup() {
  return (
    <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center text-slate-400 font-medium bg-slate-50">Loading Portal...</div>}>
      <SignupFormContent />
    </Suspense>
  )
}