"use client"
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface TeacherProfile {
  id: string
  name: string
  email: string
  bio: string
  subjects: string[]
  rate: number
  available_days: string[]
  time_slots: string[]
  photo_url: string
}

export default function ProfileTab({ teacherId }: { teacherId: string }) {
  const [profile, setProfile] = useState<TeacherProfile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [uploadingPhoto, setUploadingPhoto] = useState<boolean>(false)

  // Input states for dynamic array management
  const [newSubject, setNewSubject] = useState('')
  const [newTimeSlot, setNewTimeSlot] = useState('')

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

  useEffect(() => {
    async function loadTeacherProfile() {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('teachers')
          .select('*')
          .eq('id', teacherId)
          .single()

        if (error) throw error

        if (data) {
          setProfile({
            id: data.id,
            name: data.name || '',
            email: data.email || '',
            bio: data.bio || '',
            subjects: Array.isArray(data.subjects) ? data.subjects : JSON.parse(data.subjects || '[]'),
            rate: Number(data.rate) || 0,
            available_days: Array.isArray(data.available_days) ? data.available_days : JSON.parse(data.available_days || '[]'),
            time_slots: Array.isArray(data.time_slots) ? data.time_slots : JSON.parse(data.time_slots || '[]'),
            photo_url: data.photo_url || ''
          })
        }
      } catch (err: any) {
        console.error("Error fetching teacher profile:", err.message)
      } finally {
        setLoading(false)
      }
    }

    if (teacherId) loadTeacherProfile()
  }, [teacherId])

  const handleUpdateField = (field: keyof TeacherProfile, value: any) => {
    if (!profile) return
    setProfile({ ...profile, [field]: value })
  }

  // --- Array Multi-select handlers ---
  const toggleDay = (day: string) => {
    if (!profile) return
    const currentDays = [...profile.available_days]
    if (currentDays.includes(day)) {
      handleUpdateField('available_days', currentDays.filter(d => d !== day))
    } else {
      // Sort matching natural week flow
      const updated = [...currentDays, day].sort((a, b) => daysOfWeek.indexOf(a) - daysOfWeek.indexOf(b))
      handleUpdateField('available_days', updated)
    }
  }

  const addSubject = () => {
    if (!profile || !newSubject.trim()) return
    if (!profile.subjects.includes(newSubject.trim())) {
      handleUpdateField('subjects', [...profile.subjects, newSubject.trim()])
    }
    setNewSubject('')
  }

  const removeSubject = (indexToRemove: number) => {
    if (!profile) return
    handleUpdateField('subjects', profile.subjects.filter((_, idx) => idx !== indexToRemove))
  }

  const addTimeSlot = () => {
    if (!profile || !newTimeSlot.trim()) return
    if (!profile.time_slots.includes(newTimeSlot.trim())) {
      handleUpdateField('time_slots', [...profile.time_slots, newTimeSlot.trim()])
    }
    setNewTimeSlot('')
  }

  const removeTimeSlot = (indexToRemove: number) => {
    if (!profile) return
    handleUpdateField('time_slots', profile.time_slots.filter((_, idx) => idx !== indexToRemove))
  }

  // --- Photo Upload Handling ---
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0 || !profile) return
      setUploadingPhoto(true)
      const file = e.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.id}-${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      // Upload to your configured Supabase classroom-files or teacher-photos bucket
      const { error: uploadError } = await supabase.storage
        .from('teacher-photos')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Fetch the generated public link address path
      const { data: { publicUrl } } = supabase.storage
        .from('teacher-photos')
        .getPublicUrl(filePath)

      handleUpdateField('photo_url', publicUrl)
      alert("Avatar uploaded successfully! Save changes to finalize.")
    } catch (err: any) {
      alert(`Upload error: ${err.message}`)
    } finally {
      setUploadingPhoto(false)
    }
  }

  // --- Save Database Function ---
  const handleSaveChanges = async () => {
    if (!profile) return
    try {
      setSaving(true)

      const { error } = await supabase
        .from('teachers')
        .update({
          name: profile.name,
          email: profile.email,
          bio: profile.bio,
          subjects: profile.subjects, // JSON arrays map directly or via JSON.stringify() based on database column definition
          rate: profile.rate,
          available_days: profile.available_days,
          time_slots: profile.time_slots,
          photo_url: profile.photo_url
        })
        .eq('id', profile.id)

      if (error) throw error
      alert("Profile updated successfully! ✨")
    } catch (err: any) {
      console.error("Save failed:", err.message)
      alert(`Could not save changes: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <span className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading Instructor Profile...</p>
      </div>
    )
  }

  if (!profile) return <p className="text-center text-sm text-red-500 py-12">Profile record mapping error.</p>

  return (
    <div className="max-w-4xl mx-auto bg-white border border-slate-100 rounded-2xl shadow-xs p-6 space-y-8">
      
      {/* Upper Layout Header Panel */}
      <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100">
        <div className="relative group w-24 h-24 rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 flex items-center justify-center shadow-xs">
          {profile.photo_url ? (
            <img src={profile.photo_url} alt={profile.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl">👤</span>
          )}
          <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col justify-center items-center text-[10px] text-white font-bold cursor-pointer transition-opacity duration-150">
            <span>{uploadingPhoto ? 'Uploading...' : 'Change Photo'}</span>
            <input type="file" accept="image/*" disabled={uploadingPhoto} onChange={handlePhotoUpload} className="hidden" />
          </label>
        </div>
        
        <div className="text-center sm:text-left flex-1 space-y-1">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">{profile.name || 'Set Profile Name'}</h2>
          <p className="text-xs text-slate-400 font-mono">ID token: {profile.id}</p>
          <p className="text-xs text-blue-500 font-bold uppercase tracking-wider">{profile.email}</p>
        </div>

        <button
          onClick={handleSaveChanges}
          disabled={saving}
          className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-xs"
        >
          {saving ? 'Syncing Base...' : '💾 Save All Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Side: Text Field Parameters */}
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Full Legal Name</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => handleUpdateField('name', e.target.value)}
              className="w-full text-xs font-semibold text-slate-800 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Contact Email Link</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => handleUpdateField('email', e.target.value)}
              className="w-full text-xs font-semibold text-slate-800 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Hourly Compensation Rate ($ / hr)</label>
            <input
              type="number"
              value={profile.rate}
              onChange={(e) => handleUpdateField('rate', Number(e.target.value))}
              className="w-full text-xs font-mono font-bold text-slate-800 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Professional Biography</label>
            <textarea
              rows={4}
              value={profile.bio}
              onChange={(e) => handleUpdateField('bio', e.target.value)}
              className="w-full text-xs font-medium text-slate-600 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none transition resize-none"
              placeholder="Tell students about your qualifications and style..."
            />
          </div>
        </div>

        {/* Right Side: Matrix Tags and Array Properties */}
        <div className="space-y-5">
          
          {/* Dynamic Subject Fields */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Department Subjects</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Chemistry"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSubject()}
                className="flex-1 text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 transition"
              />
              <button onClick={addSubject} className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition">＋</button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {profile.subjects.map((sub, idx) => (
                <span key={idx} className="bg-blue-50/70 border border-blue-100 text-blue-700 text-[10px] font-bold pl-2 pr-1 py-0.5 rounded-lg flex items-center gap-1">
                  {sub}
                  <button onClick={() => removeSubject(idx)} className="hover:bg-blue-200/60 w-3.5 h-3.5 rounded-md flex items-center justify-center opacity-70 hover:opacity-100 transition">✕</button>
                </span>
              ))}
              {profile.subjects.length === 0 && <p className="text-[11px] text-slate-400 italic">No subjects added.</p>}
            </div>
          </div>

          {/* Available Days Checkboxes */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Weekly Available Days</label>
            <div className="flex flex-wrap gap-1">
              {daysOfWeek.map((day) => {
                const isActive = profile.available_days.includes(day)
                return (
                  <button
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition ${
                      isActive 
                        ? 'bg-slate-900 border-slate-900 text-white' 
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Time Slots Allocation */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Routine operational Time Slots</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. 05:00 PM - 06:00 PM"
                value={newTimeSlot}
                onChange={(e) => setNewTimeSlot(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTimeSlot()}
                className="flex-1 text-xs font-mono px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 transition"
              />
              <button onClick={addTimeSlot} className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition">＋</button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {profile.time_slots.map((slot, idx) => (
                <span key={idx} className="bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-mono font-bold pl-2 pr-1 py-0.5 rounded-lg flex items-center gap-1">
                  {slot}
                  <button onClick={() => removeTimeSlot(idx)} className="hover:bg-slate-200 w-3.5 h-3.5 rounded-md flex items-center justify-center opacity-70 hover:opacity-100 transition">✕</button>
                </span>
              ))}
              {profile.time_slots.length === 0 && <p className="text-[11px] text-slate-400 italic">No operational slots configured.</p>}
            </div>
          </div>

        </div>

      </div>

    </div>
  )
}