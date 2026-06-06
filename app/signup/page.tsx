"use client"
import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

// Pre-defined lists for tags
const AVAILABLE_SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Geography', 'Computer Science']
const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
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

  // Detect if this is a student invitation link
  const isStudentInvite = searchParams.get('token') === 'student'
  const inviteEmail = searchParams.get('email') || ''

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('parent')
  const [loading, setLoading] = useState(false)

  // Parent Fields
  const [parentName, setParentName] = useState('')
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState('')

  // Teacher Fields
  const [teacherName, setTeacherName] = useState('')
  const [bio, setBio] = useState('')
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [rate, setRate] = useState('')
  const [selectedSlots, setSelectedSlots] = useState<string[]>([])
  const [photoFile, setPhotoFile] = useState<File | null>(null)

  // Auto-fill and freeze the email identity if student token exists
  useEffect(() => {
    if (isStudentInvite && inviteEmail) {
      setEmail(inviteEmail)
    }
  }, [isStudentInvite, inviteEmail])

  // Helper functions to toggle array values
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

  const toggleTimeSlot = (slot: string) => {
    setSelectedSlots(prev => 
      prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]
    )
  }

  const handleSignup = async (e: React.FormEvent) => {
    if (e) e.preventDefault()
    setLoading(true)

    // 1. FRONT-END VALIDATION
    if (!email || !password) {
      alert("Please fill in your email and password.")
      setLoading(false)
      return
    }

    if (!isStudentInvite && role === 'parent') {
      if (!parentName || !phone || !country) {
        alert("Parents must fill in Name, Phone Number, and Country.")
        setLoading(false)
        return
      }
    }

    if (!isStudentInvite && role === 'teacher') {
      if (!teacherName || !bio || selectedSubjects.length === 0 || !rate || selectedDays.length === 0 || selectedSlots.length === 0) {
        alert("Teachers must fill in all fields and select at least one Subject, Day, and Time Slot.")
        setLoading(false)
        return
      }
    }

    // 2. Proceed to Supabase Auth
    const { data, error } = await supabase.auth.signUp({ email, password })
    
    if (error) {
      alert("Auth Error: " + error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const userId = data.user.id

      // 3. SEPARATION ROUTING PIPELINE
      if (isStudentInvite) {
        // STUDENT ACTIVATION: Swaps out pre-registered placeholder profile ID with the authenticated User ID
        const { error: dbError } = await supabase
          .from('students')
          .update({ id: userId })
          .eq('email', email)

        if (dbError) {
          alert("Student Setup Synced Profiling Error: " + dbError.message)
        } else {
          alert("Student Launchpad successfully activated! Welcome back.")
          router.push('/dashboard/student')
        }

      } else if (role === 'parent') {
        const { error: dbError } = await supabase
          .from('parents')
          .insert([{ 
            id: userId, 
            email: email, 
            name: parentName, 
            phone_number: phone, 
            country: country 
          }])

        if (dbError) {
          alert("Database Error: " + dbError.message)
        } else {
          alert("Parent registered successfully!")
          router.push('/dashboard/parent')
        }

      } else {
        // Handle Teacher Photo Upload
        let photoUrl = ""
        if (photoFile) {
          const fileExt = photoFile.name.split('.').pop()
          const fileName = `${userId}-${Math.random()}.${fileExt}`
          
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

        // Insert Teacher Details directly as native arrays
        const { error: dbError } = await supabase
          .from('teachers')
          .insert([{ 
            id: userId, 
            email: email, 
            name: teacherName, 
            bio: bio, 
            subjects: selectedSubjects,
            rate: parseFloat(rate) || 0, 
            available_days: selectedDays,
            time_slots: selectedSlots, 
            photo_url: photoUrl
          }])

        if (dbError) {
          alert("Database Error: " + dbError.message)
        } else {
          alert("Teacher registered successfully!")
          router.push('/dashboard/teacher')
        }
      }
    }
    setLoading(false)
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
        
        {/* Role Toggle Switch — Hidden entirely if accessing via Student Invitation */}
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

        <div className="space-y-4">
          <input 
            type="email" 
            placeholder="Email Address" 
            disabled={isStudentInvite} // Lock modification capabilities if pre-loaded by invite
            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white ${isStudentInvite ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' : ''}`} 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
          />
          <input 
            type="password" 
            placeholder={isStudentInvite ? "Choose a Secure Password" : "Create Password"} 
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
          />
          
          {!isStudentInvite && <hr className="my-4 border-slate-200" />}

          {/* Parent Fields */}
          {!isStudentInvite && role === 'parent' && (
            <div className="space-y-4">
              <input type="text" placeholder="Full Name" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" value={parentName} onChange={e => setParentName(e.target.value)} />
              <input type="text" placeholder="Phone Number" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" value={phone} onChange={e => setPhone(e.target.value)} />
              <input type="text" placeholder="Country" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" value={country} onChange={e => setCountry(e.target.value)} />
            </div>
          )}

          {/* Teacher Fields */}
          {!isStudentInvite && role === 'teacher' && (
            <div className="space-y-5">
              <input type="text" placeholder="Full Name" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" value={teacherName} onChange={e => setTeacherName(e.target.value)} />
              <textarea placeholder="Bio / Experience" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" value={bio} onChange={e => setBio(e.target.value)} />
              
              {/* Selectable Subjects Tags */}
              <div>
                <label className="text-sm font-bold text-slate-600 block mb-2">Select Subjects You Teach:</label>
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

              <input type="number" placeholder="Hourly Rate ($)" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" value={rate} onChange={e => setRate(e.target.value)} />
              
              {/* Selectable Available Days Tags */}
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

              {/* Compact Dropdown Time Selector Layout */}
              <div className="relative">
                <label className="text-sm font-bold text-slate-600 block mb-2">
                  Available Time Slots ({selectedSlots.length} selected):
                </label>
                
                <div 
                  onClick={() => {
                    const drawer = document.getElementById('time-drawer')
                    drawer?.classList.toggle('hidden')
                  }}
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

                <div 
                  id="time-drawer" 
                  className="hidden absolute z-10 left-0 right-0 mt-1 p-3 bg-white border border-slate-200 shadow-xl rounded-xl max-h-52 overflow-y-auto grid grid-cols-2 gap-1.5"
                >
                  <div className="col-span-2 text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                    Tap to add / remove slots:
                  </div>
                  {TIME_SLOTS.map(slot => {
                    const isSelected = selectedSlots.includes(slot)
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => toggleTimeSlot(slot)}
                        className={`p-2 text-xs rounded-lg font-medium transition border text-center ${
                          isSelected 
                            ? 'bg-blue-50 text-blue-600 border-blue-400 ring-1 ring-blue-400' 
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
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
          
          <button onClick={handleSignup} disabled={loading} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-lg hover:bg-blue-700 transition disabled:bg-slate-400">
            {loading 
              ? 'Processing Profile Registration...' 
              : isStudentInvite 
                ? 'Complete Account Activation' 
                : `Complete ${role === 'parent' ? 'Parent' : 'Teacher'} Setup`
            }
          </button>

          <p className="text-center text-sm text-slate-500 mt-4">
            Already have an account?{' '}
            <button type="button" onClick={() => router.push('/login')} className="text-blue-600 font-bold hover:underline">
              Sign In
            </button>
          </p>
          
        </div>
      </div>
    </div>
  )
}

export default function Signup() {
  return (
    <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center text-slate-400 font-medium bg-slate-50">Loading Portal Parameters...</div>}>
      <SignupFormContent />
    </Suspense>
  )
}