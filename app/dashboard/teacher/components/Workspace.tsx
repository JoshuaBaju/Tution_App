"use client"

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Whiteboard from '@/app/meeting/components/Whiteboard'
import FileDirectory from '@/app/meeting/components/FileDirectory'

interface WorkspaceRow {
  id: string
  teacher_id: string
  name: string
  workspace_type: 'lesson' | 'homework'
  assigned_to_student: string | null
  teacher_contents: any | null
  student_contents: any | null
  created_at: string
  modified_at: string
}

interface StudentOption {
  id: string
  name: string
}

type SortField = 'name' | 'workspace_type' | 'assigned_to_student' | 'modified_at' | 'created_at'
type SortOrder = 'asc' | 'desc'

// 1. Define the props interface to accept the studentId passed by the parent dashboard
interface WorkspaceManagerProps {
  studentId?: string | null
}

export default function WorkspaceManagerPage({ studentId }: WorkspaceManagerProps = {}) {
  const router = useRouter()

  // Framework Engine & Identity States
  const [loading, setLoading] = useState<boolean>(true)
  const [currentTeacherId, setCurrentTeacherId] = useState<string | null>(null)
  const [students, setStudents] = useState<StudentOption[]>([])

  // Dashboard Explorer States
  const [isDashboardOpen, setIsDashboardOpen] = useState<boolean>(true)
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([])
  const [sortField, setSortField] = useState<SortField>('modified_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // Active Workspace Context
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceRow | null>(null)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [isNotifying, setIsNotifying] = useState<boolean>(false) // Push Notification Loading Flag
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Layout Controls
  const [sidebarWidth, setSidebarWidth] = useState<number>(260) 
  const isResizingSidebar = useRef<boolean>(false)

  // 2. Initial Identity & Data Context Resolution
  useEffect(() => {
    async function resolveIdentity() {
      try {
        // If studentId (acting as the authenticated teacher/user id context) is passed from props, use it
        let targetId = studentId

        if (!targetId) {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) {
            router.push('/login')
            return
          }
          targetId = user.id
        }

        setCurrentTeacherId(targetId)
        
        // Fetch Students for assigning homework context dropdown
        const { data: studentRecords } = await supabase
          .from('students')
          .select('id, name')
          .order('name', { ascending: true })
        
        if (studentRecords) setStudents(studentRecords)
        await fetchWorkspaces(targetId)
      } catch (err) {
        console.error("Failed to parse security credentials context:", err)
      } finally {
        setLoading(false)
      }
    }
    resolveIdentity()
  }, [router, studentId])

  // Fetch Existing Workspaces from Consolidated Table
  async function fetchWorkspaces(teacherId: string) {
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('teacher_id', teacherId)
      
      if (error) throw error
      if (data) setWorkspaces(data as WorkspaceRow[])
    } catch (err) {
      console.error("Failed loading structural metadata from table:", err)
    }
  }

  // Create Clean New Canvas File Matrix
  const handleCreateWorkspace = async () => {
    if (!currentTeacherId) return
    setLoading(true)
    try {
      const newFile = {
        teacher_id: currentTeacherId,
        name: "Untitled Workspace",
        workspace_type: 'lesson' as const,
        assigned_to_student: null,
        teacher_contents: {},
        student_contents: {}
      }

      const { data, error } = await supabase
        .from('workspaces')
        .insert(newFile)
        .select()

      if (error) throw error
      
      if (data && data.length > 0) {
        const createdRow = data[0] as WorkspaceRow
        await fetchWorkspaces(currentTeacherId)
        setActiveWorkspace(createdRow)
        setIsDashboardOpen(false)
      }
    } catch (err: any) {
      console.error("Initialization process halted:", err?.message || err)
      alert(`Error initializing clean workspace asset matrix: ${err?.message || 'Unknown Error'}`)
    } finally {
      setLoading(false)
    }
  }

  // Duplicate Existing Workspace Row Template
  const handleDuplicateWorkspace = async (e: React.MouseEvent, row: WorkspaceRow) => {
    e.stopPropagation() 
    if (!currentTeacherId) return
    setLoading(true)
    try {
      const duplicateData = {
        teacher_id: currentTeacherId,
        name: `${row.name} (Copy)`,
        workspace_type: row.workspace_type,
        assigned_to_student: null, 
        teacher_contents: row.teacher_contents || {},
        student_contents: {}
      }

      const { error } = await supabase
        .from('workspaces')
        .insert(duplicateData)

      if (error) throw error
      await fetchWorkspaces(currentTeacherId)
    } catch (err) {
      console.error("Cloning engine interface failure:", err)
    } finally {
      setLoading(false)
    }
  }

  // Delete Workspace Permanently
  const handleDeleteWorkspace = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm("Are you sure you want to permanently delete this canvas asset?")) return
    if (!currentTeacherId) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', id)

      if (error) throw error
      if (activeWorkspace?.id === id) setActiveWorkspace(null)
      await fetchWorkspaces(currentTeacherId)
    } catch (err) {
      console.error("Purge engine pipeline exception:", err)
    } finally {
      setLoading(false)
    }
  }

  // Real-time Upstream Debounced Sync Handler
  const queueAutoSave = (updatedFields: Partial<WorkspaceRow>) => {
    if (!activeWorkspace) return
    
    const progressNode = { ...activeWorkspace, ...updatedFields } as WorkspaceRow
    setActiveWorkspace(progressNode)
    setWorkspaces(prev => prev.map(w => w.id === progressNode.id ? progressNode : w))

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    setIsSaving(true)

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await supabase
          .from('workspaces')
          .update({
            ...updatedFields,
            modified_at: new Date().toISOString()
          })
          .eq('id', activeWorkspace.id)
      } catch (err) {
        console.error("Auto-sync database replication failure:", err)
      } finally {
        setIsSaving(false)
      }
    }, 1000)
  }

  // PUSH NOTIFICATION HANDLER ENGINE
  const handleNotifyStudent = async () => {
    if (!activeWorkspace || !activeWorkspace.assigned_to_student) return
    
    setIsNotifying(true)
    try {
      const typeLabel = activeWorkspace.workspace_type === 'homework' ? 'Homework' : 'Lesson'
      
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: activeWorkspace.assigned_to_student, 
          title: `New Workspace Activity 🎨`,
          description: `Your teacher updated your ${typeLabel}: "${activeWorkspace.name}". Check it out!`,
          category: 'session',
          link_to: `/meeting?room=${activeWorkspace.id}`, 
          is_read: false
        })

      if (error) throw error
      alert("Notification sent directly to student dashboard!")
    } catch (err: any) {
      console.error("Failed to push notification pipeline:", err)
      alert(`Notification Error: ${err?.message || 'Unknown network error'}`)
    } finally {
      setIsNotifying(false)
    }
  }

  // Dynamic Sidebar Workspace Boundary Adjustments
  const startSidebarResize = (e: React.MouseEvent) => {
    e.preventDefault()
    isResizingSidebar.current = true
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSidebar.current) {
        const container = document.getElementById('workspace-core')
        if (container) {
          const rect = container.getBoundingClientRect()
          const calculatedWidth = e.clientX - rect.left
          if (calculatedWidth > 180 && calculatedWidth < 400) setSidebarWidth(calculatedWidth)
        }
      }
    }
    const handleMouseUp = () => {
      isResizingSidebar.current = false
      document.body.style.cursor = 'default'
      document.body.style.userSelect = 'auto'
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  // Dynamic Header Table Column Sort Logic
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const sortedWorkspaces = [...workspaces].sort((a, b) => {
    let aVal = a[sortField] || ''
    let bVal = b[sortField] || ''
    
    if (sortField === 'assigned_to_student') {
      const studentA = students.find(s => s.id === a.assigned_to_student)?.name || ''
      const studentB = students.find(s => s.id === b.assigned_to_student)?.name || ''
      aVal = studentA
      bVal = studentB
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  if (loading) {
    return (
      <div className="w-full h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="w-8 h-8 rounded-full border-4 border-blue-600/20 border-t-blue-600 animate-spin" />
          <p className="text-xs font-black text-slate-600 tracking-wide uppercase">Processing Core Workspace Vectors...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-[80vh] bg-slate-50 flex flex-col overflow-hidden relative select-none font-sans antialiased rounded-2xl">
      
      {/* GLOBAL POPUP FULL DASHBOARD DIRECTORY OVERLAY */}
      {isDashboardOpen && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-4xl h-[90%] rounded-2xl p-5 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between shrink-0 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-black text-slate-800 tracking-tight">Teacher Workspace Hub</h2>
                <p className="text-[11px] text-slate-400 font-medium">Create interactive boards, manage pre-prepared class templates, or assign student homework windows.</p>
              </div>
              <div className="flex items-center gap-2">
                {activeWorkspace && (
                  <button 
                    type="button" 
                    onClick={() => setIsDashboardOpen(false)} 
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                  >
                    Resume Active File
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCreateWorkspace}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-md shadow-blue-600/15 cursor-pointer"
                >
                  ✨ Create New Whiteboard
                </button>
              </div>
            </div>

            {/* INTERACTIVE COMPONENT DIRECTORY TABLE VIEW */}
            <div className="flex-1 overflow-y-auto mt-3 border border-slate-100 rounded-xl bg-slate-50/50 min-h-0">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 font-black tracking-wider uppercase select-none sticky top-0 z-10">
                    <th onClick={() => handleSort('name')} className="p-2.5 cursor-pointer hover:bg-slate-200 hover:text-slate-800 transition">File Target Name {sortField === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</th>
                    <th onClick={() => handleSort('workspace_type')} className="p-2.5 cursor-pointer hover:bg-slate-200 hover:text-slate-800 transition">Context {sortField === 'workspace_type' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</th>
                    <th onClick={() => handleSort('assigned_to_student')} className="p-2.5 cursor-pointer hover:bg-slate-200 hover:text-slate-800 transition">Target Student {sortField === 'assigned_to_student' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</th>
                    <th onClick={() => handleSort('modified_at')} className="p-2.5 cursor-pointer hover:bg-slate-200 hover:text-slate-800 transition">Last Edited {sortField === 'modified_at' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</th>
                    <th className="p-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700 font-medium">
                  {sortedWorkspaces.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center p-8 text-slate-400 italic">No existing whiteboard records localized. Create a brand new workspace above.</td>
                    </tr>
                  ) : (
                    sortedWorkspaces.map((row) => (
                      <tr 
                        key={row.id} 
                        onClick={() => { setActiveWorkspace(row); setIsDashboardOpen(false) }} 
                        className="hover:bg-blue-50/40 transition cursor-pointer group"
                      >
                        <td className="p-2.5 font-bold text-slate-900 group-hover:text-blue-600 transition">{row.name}</td>
                        <td className="p-2.5">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-black tracking-wide ${
                            row.workspace_type === 'homework' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}>
                            {row.workspace_type}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-500">
                          {students.find(s => s.id === row.assigned_to_student)?.name || <span className="text-slate-300 italic">Global Resource Library</span>}
                        </td>
                        <td className="p-2.5 text-slate-400 font-mono text-[10px]">{new Date(row.modified_at).toLocaleString()}</td>
                        <td className="p-2.5 text-right space-x-1.5" onClick={(e) => e.stopPropagation()}>
                          <button 
                            type="button"
                            onClick={(e) => handleDuplicateWorkspace(e, row)}
                            className="px-2 py-0.5 text-[10px] font-bold bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                          >
                            📋 Copy
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => handleDeleteWorkspace(e, row.id)}
                            className="px-2 py-0.5 text-[10px] font-bold bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 rounded-lg transition"
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {/* ACTIVE WORKSPACE FRAMEWORK TOOLBAR ENGINE */}
      <header className="h-12 bg-white border-b border-slate-200 px-3 flex items-center justify-between shrink-0 z-30 shadow-xs relative">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button 
            type="button" 
            onClick={() => setIsDashboardOpen(true)}
            className="px-2.5 py-1 text-xs font-black text-slate-700 hover:bg-slate-100 border border-slate-200 bg-white rounded-lg transition shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
          >
            📂 Explorer
          </button>
          
          <div className="h-4 w-[1px] bg-slate-200 shrink-0" />

          {activeWorkspace && (
            <div className="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto no-scrollbar justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <input 
                  type="text"
                  value={activeWorkspace.name}
                  onChange={(e) => queueAutoSave({ name: e.target.value })}
                  className="text-xs font-black text-slate-800 uppercase tracking-tight bg-slate-50 border border-slate-200 hover:bg-white focus:bg-white focus:border-blue-400 outline-none rounded-lg px-2 py-1 min-w-[120px] max-w-[200px] transition shrink-0"
                  placeholder="Name your file..."
                />

                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
                  <button
                    type="button"
                    onClick={() => queueAutoSave({ workspace_type: 'lesson' })}
                    className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wide rounded-md transition ${
                      activeWorkspace.workspace_type === 'lesson' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Lesson
                  </button>
                  <button
                    type="button"
                    onClick={() => queueAutoSave({ workspace_type: 'homework' })}
                    className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wide rounded-md transition ${
                      activeWorkspace.workspace_type === 'homework' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Homework
                  </button>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <select
                    value={activeWorkspace.assigned_to_student || ''}
                    onChange={(e) => queueAutoSave({ assigned_to_student: e.target.value || null })}
                    className="bg-white border border-slate-200 text-[11px] font-bold text-slate-700 rounded-lg px-2 py-1 focus:border-blue-400 outline-none transition cursor-pointer"
                  >
                    <option value="">(Global Templates)</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>{student.name}</option>
                    ))}
                  </select>
                </div>

                <div className="text-[9px] font-bold text-slate-400 font-mono transition flex items-center gap-1 shrink-0">
                  {isSaving ? (
                    <>
                      <span className="w-1 h-1 rounded-full bg-blue-500 animate-ping" />
                      <span className="text-blue-500">Syncing...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-emerald-500">✓</span>
                      <span>Saved</span>
                    </>
                  )}
                </div>
              </div>

              {/* NOTIFY STUDENT BUTTON CONFIGURATION */}
              {activeWorkspace.assigned_to_student && (
                <button
                  type="button"
                  disabled={isNotifying}
                  onClick={handleNotifyStudent}
                  className="ml-auto px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-black uppercase tracking-wide text-[10px] rounded-lg transition-all shadow-xs flex items-center gap-1 disabled:opacity-50"
                >
                  {isNotifying ? (
                    <>⏳ Sending...</>
                  ) : (
                    <>🔔 Notify Student</>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* CORE WORKSPACE TWO-COLUMN CANVAS SPLIT ARCHITECTURE */}
      <div id="workspace-core" className="flex-1 flex w-full relative overflow-hidden min-h-0">
        
        {/* DRAG AND DROP RESOURCE SIDEBAR PANEL CONTAINER */}
        {activeWorkspace && (
          <div 
            style={{ width: `${sidebarWidth}px` }}
            className="h-full bg-white border-r border-slate-200 flex flex-col shrink-0 select-none z-20 overflow-hidden relative"
          >
            <div className="p-2 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
              <h3 className="text-[9px] font-black uppercase tracking-wider text-slate-400">Files Matrix</h3>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              <FileDirectory folderPath={activeWorkspace.teacher_id} />
            </div>
          </div>
        )}

        {/* DRAG RESIZER INTERACTIVE GUTTER SEPARATOR */}
        {activeWorkspace && (
          <div 
            onMouseDown={startSidebarResize} 
            className="w-1 bg-slate-200 hover:bg-blue-500 cursor-ew-resize transition-all shrink-0 z-30" 
          />
        )}

        {/* CENTRAL WHITEBOARD MAIN CANVAS PORT */}
        <main className="flex-1 h-full relative z-10 bg-slate-50 min-w-0">
          {activeWorkspace ? (
            <Whiteboard 
              roomId={activeWorkspace.id} 
              folderPath={activeWorkspace.teacher_id}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1.5">
              <span className="text-2xl">🎨</span>
              <p className="text-[11px] font-bold uppercase tracking-wider">No Canvas Layer Active</p>
              <button 
                type="button" 
                onClick={() => setIsDashboardOpen(true)}
                className="mt-1 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-xl transition shadow-xs"
              >
                Open Explorer Hub
              </button>
            </div>
          )}
        </main>

      </div>
    </div>
  )
}