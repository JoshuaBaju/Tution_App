"use client"
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface StudentFolder {
  id: string
  name: string
  folderName: string 
}

interface StorageFile {
  name: string
  id?: string | null
  updated_at?: string | null
  metadata?: any
}

interface ClassBooking {
  id: string
  subject: string
  topic: string | null
  lesson_date: string
  lesson_time: string
}

type WorkspaceView = 'schedule' | 'locker'

export default function ManageStudentsTab({ teacherId }: { teacherId: string }) {
  const router = useRouter()
  
  // Master State Management Matrices
  const [students, setStudents] = useState<StudentFolder[]>([])
  const [activeStudent, setActiveStudent] = useState<StudentFolder | null>(null)
  const [activeSubView, setActiveSubView] = useState<WorkspaceView>('schedule')
  
  // Schedule Sub-View States
  const [classes, setClasses] = useState<ClassBooking[]>([])
  const [loadingSchedule, setLoadingSchedule] = useState(false)

  // Locker Room Sub-View States
  const [files, setFiles] = useState<StorageFile[]>([])
  const [loadingFolders, setLoadingFolders] = useState(true)
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [viewerFile, setViewerFile] = useState<{ name: string; url: string } | null>(null)

  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdown(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // 1. Fetch active student list
  useEffect(() => {
    async function loadActiveStudentRoster() {
      setLoadingFolders(true)
      
      const isoNowString = new Date().toISOString()
      const currentDateString = isoNowString.split('T')[0]

      const { data, error } = await supabase
        .from('sessions')
        .select(`
          session_date,
          bookings!inner (
            teacher,
            student,
            subject,
            students!inner ( id, name )
          )
        `)
        .eq('bookings.teacher', teacherId)
        .gte('session_date', currentDateString)

      if (error) {
        console.error("Error building student index matrix:", error.message)
      } else if (data) {
        const uniqueStudentsMap = new Map<string, StudentFolder>()
        
        data.forEach((row: any) => {
          const bookingContext = row.bookings
          if (bookingContext && bookingContext.students) {
            const studentInfo = bookingContext.students
            if (!uniqueStudentsMap.has(studentInfo.id)) {
              uniqueStudentsMap.set(studentInfo.id, {
                id: studentInfo.id,
                name: studentInfo.name,
                folderName: `student_${studentInfo.id}`
              })
            }
          }
        })

        const mappedFolders = Array.from(uniqueStudentsMap.values())
        setStudents(mappedFolders)
        if (mappedFolders.length > 0) {
          setActiveStudent(mappedFolders[0])
        }
      }
      setLoadingFolders(false)
    }

    if (teacherId) loadActiveStudentRoster()
  }, [teacherId])

  // 2. Fetch upcoming classes
  useEffect(() => {
    async function syncStudentSchedule() {
      if (!activeStudent) return
      setLoadingSchedule(true)
      
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id,
          session_date,
          session_time,
          topic,
          bookings!inner (
            teacher,
            student,
            subject
          )
        `)
        .eq('bookings.teacher', teacherId)
        .eq('bookings.student', activeStudent.id)
        .order('session_date', { ascending: true })

      if (error) {
        console.error("Error catching student schedule stream:", error.message)
      } else if (data) {
        const mappedClasses: ClassBooking[] = data.map((session: any) => ({
          id: session.id,
          subject: session.bookings?.subject || 'General Class',
          topic: session.topic || null,
          lesson_date: session.session_date,
          lesson_time: session.session_time
        }))
        setClasses(mappedClasses)
      }
      setLoadingSchedule(false)
    }

    if (activeStudent && activeSubView === 'schedule') {
      syncStudentSchedule()
    }
  }, [activeStudent, activeSubView, teacherId])

  // 3. Load files from classroom bucket
  async function syncFolderFiles(folderPath: string) {
    setLoadingFiles(true)
    const { data, error } = await supabase.storage
      .from('classroom-files')
      .list(folderPath, {
        limit: 100,
        sortBy: { column: 'name', order: 'asc' }
      })

    if (error) {
      console.error("Storage query exception:", error.message)
    } else if (data) {
      const cleanFiles = data.filter(file => file.name !== '.keep')
      setFiles(cleanFiles)
    }
    setLoadingFiles(false)
  }

  useEffect(() => {
    if (activeStudent && activeSubView === 'locker') {
      syncFolderFiles(activeStudent.folderName)
    }
  }, [activeStudent, activeSubView])

  async function uploadFileToStorage(file: File) {
    if (!activeStudent || !file) return
    try {
      setUploading(true)
      const targetPath = `${activeStudent.folderName}/${file.name}`
      
      const { error } = await supabase.storage
        .from('classroom-files')
        .upload(targetPath, file, { cacheControl: '3600', upsert: true })

      if (error) throw error
      
      syncFolderFiles(activeStudent.folderName)
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFileToStorage(e.dataTransfer.files[0])
    }
  }

  const handleFileOpenFile = async (fileName: string) => {
    if (!activeStudent) return
    const path = `${activeStudent.folderName}/${fileName}`
    
    const { data } = supabase.storage
      .from('classroom-files')
      .getPublicUrl(path)

    if (data?.publicUrl) {
      setViewerFile({ name: fileName, url: data.publicUrl })
    }
  }

  const handleFileDelete = async (fileName: string) => {
    if (!activeStudent) return
    const confirmAction = window.confirm(`Are you sure you want to permanently delete "${fileName}"?`)
    if (!confirmAction) return

    const path = `${activeStudent.folderName}/${fileName}`
    const { error } = await supabase.storage
      .from('classroom-files')
      .remove([path])

    if (error) {
      alert(`Delete operation failed: ${error.message}`)
    } else {
      setActiveDropdown(null)
      syncFolderFiles(activeStudent.folderName)
    }
  }

  const handleFileRename = async (currentName: string) => {
    if (!activeStudent) return
    const newName = window.prompt(`Enter a new name for "${currentName}":`, currentName)
    if (!newName || newName.trim() === "" || newName === currentName) return

    const oldPath = `${activeStudent.folderName}/${currentName}`
    const newPath = `${activeStudent.folderName}/${newName.trim()}`

    const { error } = await supabase.storage
      .from('classroom-files')
      .move(oldPath, newPath)

    if (error) {
      alert(`Rename transaction declined: ${error.message}`)
    } else {
      setActiveDropdown(null)
      syncFolderFiles(activeStudent.folderName)
    }
  }

  if (loadingFolders) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-2">
        <span className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Building Student Management Matrix...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">🎓 Student Command Center</h2>
        <p className="text-xs text-slate-500">Track custom lesson matrices, view schedules, and inspect digital workspace assets for current rosters.</p>
      </div>

      {students.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-12 text-center text-slate-400 font-medium text-xs">
          No active student booking portfolios found. Active student links display once lesson terms initialize.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="border-b border-slate-200 pb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2 px-1">
              Active Assigned Rosters
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
              {students.map((student) => {
                const isSelected = activeStudent?.id === student.id
                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => {
                      setActiveStudent(student)
                      setActiveDropdown(null)
                    }}
                    className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-xs font-bold border transition flex items-center gap-2 ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span>🧒</span> {student.name}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <div className="md:col-span-3 bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block px-2 mb-1.5">
                Workspace Controls
              </span>
              
              <button
                type="button"
                onClick={() => setActiveSubView('schedule')}
                className={`w-full text-left px-3 py-2.5 text-xs font-bold rounded-xl transition flex items-center gap-2.5 border ${
                  activeSubView === 'schedule'
                    ? 'bg-white border-slate-200 text-blue-600 shadow-2xs font-black'
                    : 'border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <span>📅</span> Class Schedule
              </button>

              <button
                type="button"
                onClick={() => setActiveSubView('locker')}
                className={`w-full text-left px-3 py-2.5 text-xs font-bold rounded-xl transition flex items-center gap-2.5 border ${
                  activeSubView === 'locker'
                    ? 'bg-white border-slate-200 text-blue-600 shadow-2xs font-black'
                    : 'border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <span>🎒</span> Locker Room Drive
              </button>
            </div>

            <div className="md:col-span-9 border border-slate-200 rounded-2xl p-5 min-h-[400px] bg-white relative">
              <div className="border-b border-slate-100 pb-3 mb-4 flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    {activeSubView === 'schedule' ? 'Upcoming Class Assignments' : 'Shared Asset Folders'}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Inspecting matrix data for: <span className="font-semibold text-slate-600">{activeStudent?.name}</span>
                  </p>
                </div>
              </div>

              {activeSubView === 'schedule' && (
                <div>
                  {loadingSchedule ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-2">
                      <span className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <p className="text-[11px] font-bold text-slate-400 uppercase">Streaming Calendar Vectors...</p>
                    </div>
                  ) : classes.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 font-medium text-xs">
                      No upcoming classes booked for this student profile.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {classes.map((cls) => (
                        <div key={cls.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition">
                          <div className="space-y-1">
                            <span className="bg-slate-200/70 border border-slate-300/60 text-slate-600 text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">
                              {cls.subject}
                            </span>
                            <h5 className="text-sm font-black text-slate-800 tracking-tight mt-1">
                              {cls.topic || 'No custom lesson objective designated'}
                            </h5>
                            <p className="text-xs text-slate-400 flex items-center gap-3 font-medium">
                              <span>📅 {cls.lesson_date}</span>
                              <span>⏰ {cls.lesson_time}</span>
                            </p>
                          </div>
                          
                          {/* 📁 REMOVED ACTIVE PORTAL CONTROLLER: REDIRECTED TO HOMETAB DASHBOARD MATRIX */}
                          <div className="bg-white border border-slate-200/80 rounded-xl px-3.5 py-1.5 flex items-center gap-1.5 text-[11px] text-slate-400 font-bold uppercase tracking-wide shadow-3xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-pulse" /> Scheduled
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeSubView === 'locker' && (
                <div className="space-y-4">
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center transition relative ${
                      dragActive 
                        ? 'border-blue-600 bg-blue-50/50' 
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="file"
                      id="teacher-locker-upload"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && uploadFileToStorage(e.target.files[0])}
                    />
                    <label htmlFor="teacher-locker-upload" className="cursor-pointer space-y-1.5 block">
                      <span className="text-2xl block">{uploading ? '⏳' : '📤'}</span>
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide">
                        {uploading ? 'Pushing asset to locker drive...' : 'Drag & Drop files here, or click to transfer'}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium">Upload homework sheets, media references, or log reviews up to 50MB</p>
                    </label>
                  </div>

                  {loadingFiles ? (
                    <div className="flex flex-col items-center justify-center py-24 space-y-2">
                      <span className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Reading Drive Rows...</p>
                    </div>
                  ) : files.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center space-y-2 border border-dashed border-slate-100 rounded-xl bg-slate-50/30">
                      <span className="text-2xl">🍃</span>
                      <h5 className="text-xs font-bold text-slate-700">This storage drive folder is currently empty</h5>
                      <p className="text-[11px] text-slate-400 max-w-xs">Drop target documents inside the zone above to distribute updates immediately.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4" ref={dropdownRef}>
                      {files.map((file) => {
                        const isDropdownOpen = activeDropdown === file.name
                        const ext = file.name.split('.').pop()?.toLowerCase() || ''
                        
                        let fileIcon = "📄"
                        if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) fileIcon = "🖼️"
                        if (ext === 'pdf') fileIcon = "📕"
                        if (['doc', 'docx'].includes(ext)) fileIcon = "📘"
                        if (['mp4', 'mov', 'avi'].includes(ext)) fileIcon = "🎬"

                        return (
                          <div
                            key={file.name}
                            onDoubleClick={() => handleFileOpenFile(file.name)}
                            className="group relative bg-slate-50/50 border border-slate-200 rounded-xl p-3.5 flex flex-col items-center text-center justify-between select-none hover:bg-white hover:border-blue-500 hover:shadow-md transition cursor-pointer h-36"
                          >
                            <div className="absolute top-2 right-2 z-10">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setActiveDropdown(isDropdownOpen ? null : file.name)
                                }}
                                className="w-6 h-6 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-700 font-bold text-xs transition flex items-center justify-center"
                              >
                                ⋮
                              </button>
                              
                              {isDropdownOpen && (
                                <div className="absolute right-0 mt-1 w-28 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 text-left">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleFileOpenFile(file.name) }}
                                    className="w-full px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition flex items-center gap-1.5"
                                  >
                                    👁️ View File
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleFileRename(file.name) }}
                                    className="w-full px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition flex items-center gap-1.5"
                                  >
                                    ✏️ Rename
                                  </button>
                                  <hr className="border-slate-100 my-0.5" />
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleFileDelete(file.name) }}
                                    className="w-full px-3 py-2 text-[11px] font-bold text-rose-600 hover:bg-rose-50 transition flex items-center gap-1.5"
                                  >
                                    🗑️ Delete
                                  </button>
                                </div>
                              )}
                            </div>

                            <span className="text-3xl mt-2 block group-hover:scale-110 transition duration-150">{fileIcon}</span>
                            <p className="text-[11px] font-bold text-slate-700 max-w-full truncate px-1 mt-2">
                              {file.name}
                            </p>
                            <span className="text-[9px] font-mono font-bold text-slate-400 uppercase mt-0.5">
                              .{ext} asset
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

        </div>
      )}

      {/* FULL-SCREEN LIGHTBOX MODAL PREVIEW FILE VIEWER */}
      {viewerFile && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] shadow-2xl flex flex-col overflow-hidden border border-slate-800">
            
            <div className="bg-slate-900 px-5 py-3 text-white flex justify-between items-center border-b border-slate-800">
              <div className="truncate pr-4">
                <h4 className="text-xs uppercase font-black tracking-widest text-blue-400">Resource Attachment Viewer</h4>
                <p className="text-xs font-bold text-slate-300 truncate mt-0.5">{viewerFile.name}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <a
                  href={viewerFile.url}
                  download={viewerFile.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-[11px] uppercase tracking-wider rounded-lg transition"
                >
                  📥 Download Attachment
                </a>
                <button
                  type="button"
                  onClick={() => setViewerFile(null)}
                  className="text-slate-400 hover:text-white font-black text-sm p-1"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 flex items-center justify-center p-6 overflow-auto">
              {(() => {
                const extension = viewerFile.name.split('.').pop()?.toLowerCase() || ''
                
                if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(extension)) {
                  return (
                    <img
                      src={viewerFile.url}
                      alt={viewerFile.name}
                      className="max-w-full max-h-full object-contain rounded-lg shadow-md bg-white"
                    />
                  )
                }
                
                if (extension === 'pdf') {
                  return (
                    <iframe
                      src={`${viewerFile.url}#toolbar=1`}
                      className="w-full h-full border-0 bg-white rounded-lg shadow-md"
                      title={viewerFile.name}
                    />
                  )
                }

                if (['txt', 'log', 'json'].includes(extension)) {
                  return (
                    <iframe
                      src={viewerFile.url}
                      className="w-full h-full border-0 bg-white p-4 font-mono text-xs rounded-lg shadow-md"
                      title={viewerFile.name}
                    />
                  )
                }

                return (
                  <div className="text-center space-y-3 bg-white p-8 rounded-2xl shadow-sm max-w-sm border">
                    <span className="text-4xl block">📦</span>
                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-wide">No Preview Workspace Configured</h5>
                    <p className="text-xs text-slate-400 leading-normal">
                      The browser can't render <span className="font-mono font-bold text-slate-600">.{extension}</span> files inline. Download the file locally to inspect its contents.
                    </p>
                  </div>
                )
              })()}
            </div>

          </div>
        </div>
      )}

    </div>
  )
}