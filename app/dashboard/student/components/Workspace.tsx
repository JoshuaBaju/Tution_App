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

type SortField = 'name' | 'workspace_type' | 'modified_at' | 'created_at'
type SortOrder = 'asc' | 'desc'

interface StudentWorkspaceProps {
  studentId: string
}

export default function StudentWorkspaceManager({ studentId }: StudentWorkspaceProps) {
  const router = useRouter()

  // Framework Engine States
  const [loading, setLoading] = useState<boolean>(true)

  // Dashboard Explorer States
  const [isDashboardOpen, setIsDashboardOpen] = useState<boolean>(true)
  const [workspaces, setWorkspaces] = useState<WorkspaceRow[]>([])
  const [sortField, setSortField] = useState<SortField>('modified_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // Active Workspace Context
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceRow | null>(null)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Layout Controls
  const [sidebarWidth, setSidebarWidth] = useState<number>(260) 
  const isResizingSidebar = useRef<boolean>(false)

  // 1. Load Workspaces assigned specifically to this Student
  useEffect(() => {
    async function resolveStudentContext() {
      if (!studentId) return
      try {
        setLoading(true)
        await fetchStudentWorkspaces(studentId)
      } catch (err) {
        console.error("Failed to load student workspaces:", err)
      } finally {
        setLoading(false)
      }
    }
    resolveStudentContext()
  }, [studentId])

  async function fetchStudentWorkspaces(targetStudentId: string) {
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('assigned_to_student', targetStudentId)
      
      if (error) throw error
      if (data) setWorkspaces(data as WorkspaceRow[])
    } catch (err) {
      console.error("Failed loading workspaces from table:", err)
    }
  }

  // 2. Real-time Student Workspace Autosave (Updates student_contents)
  const queueStudentSave = (updatedStudentFields: any) => {
    if (!activeWorkspace) return
    
    // Merge updates into local state
    const currentStudentContents = activeWorkspace.student_contents || {}
    const newStudentContents = { ...currentStudentContents, ...updatedStudentFields }
    
    const progressNode = { 
      ...activeWorkspace, 
      student_contents: newStudentContents 
    } as WorkspaceRow

    setActiveWorkspace(progressNode)
    setWorkspaces(prev => prev.map(w => w.id === progressNode.id ? progressNode : w))

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    setIsSaving(true)

    // Debounced save updates ONLY student_contents and modified_at timestamp
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await supabase
          .from('workspaces')
          .update({
            student_contents: newStudentContents,
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

  // 3. Dynamic Sidebar Resize Handling
  const startSidebarResize = (e: React.MouseEvent) => {
    e.preventDefault()
    isResizingSidebar.current = true
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSidebar.current) {
        const container = document.getElementById('student-workspace-core')
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

  // 4. Dynamic Column Sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const sortedWorkspaces = [...workspaces].sort((a, b) => {
    const aVal = a[sortField] || ''
    const bVal = b[sortField] || ''
    
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  if (loading) {
    return (
      <div className="w-full h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="w-8 h-8 rounded-full border-4 border-blue-600/20 border-t-blue-600 animate-spin" />
          <p className="text-xs font-black text-slate-600 tracking-wide uppercase">Assembling Student Desk Canvas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-[80vh] bg-slate-50 flex flex-col overflow-hidden relative select-none font-sans antialiased rounded-2xl">
      
      {/* EXCLUSIVE STUDENT INTERFACE DIRECTORY OVERLAY */}
      {isDashboardOpen && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-4xl h-[90%] rounded-2xl p-5 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between shrink-0 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-black text-slate-800 tracking-tight">Student Workspace Board</h2>
                <p className="text-[11px] text-slate-400 font-medium">Access interactive classroom lessons and complete assignments directly assigned by your instructor.</p>
              </div>
              <div>
                {activeWorkspace && (
                  <button 
                    type="button" 
                    onClick={() => setIsDashboardOpen(false)} 
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                  >
                    Resume Active Work
                  </button>
                )}
              </div>
            </div>

            {/* ASSIGNED WORKSPACES TABLE */}
            <div className="flex-1 overflow-y-auto mt-3 border border-slate-100 rounded-xl bg-slate-50/50 min-h-0">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-500 font-black tracking-wider uppercase select-none sticky top-0 z-10">
                    <th onClick={() => handleSort('name')} className="p-2.5 cursor-pointer hover:bg-slate-200 hover:text-slate-800 transition">Workspace Name {sortField === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</th>
                    <th onClick={() => handleSort('workspace_type')} className="p-2.5 cursor-pointer hover:bg-slate-200 hover:text-slate-800 transition">Type {sortField === 'workspace_type' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</th>
                    <th onClick={() => handleSort('modified_at')} className="p-2.5 cursor-pointer hover:bg-slate-200 hover:text-slate-800 transition">Last Updated {sortField === 'modified_at' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}</th>
                    <th className="p-2.5 text-right">Progress Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700 font-medium">
                  {sortedWorkspaces.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center p-8 text-slate-400 italic">No assigned workspaces found on your account dashboard.</td>
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
                        <td className="p-2.5 text-slate-400 font-mono text-[10px]">{new Date(row.modified_at).toLocaleString()}</td>
                        <td className="p-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-lg ${
                            row.student_contents?.submitted ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-200'
                          }`}>
                            {row.student_contents?.submitted ? '✓ Handed In' : 'Pending Work'}
                          </span>
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

      {/* STUDENT ACTION CONTROL HEADER BAR */}
      <header className="h-12 bg-white border-b border-slate-200 px-3 flex items-center justify-between shrink-0 z-30 shadow-xs relative">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button 
            type="button" 
            onClick={() => setIsDashboardOpen(true)}
            className="px-2.5 py-1 text-xs font-black text-slate-700 hover:bg-slate-100 border border-slate-200 bg-white rounded-lg transition shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
          >
            📂 Workspace Hub
          </button>
          
          <div className="h-4 w-[1px] bg-slate-200 shrink-0" />

          {activeWorkspace && (
            <div className="flex items-center gap-2 flex-1 min-w-0 justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-black text-slate-800 uppercase tracking-tight truncate max-w-[200px]">
                  {activeWorkspace.name}
                </span>

                <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-black tracking-wide shrink-0 ${
                  activeWorkspace.workspace_type === 'homework' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-purple-50 text-purple-700 border border-purple-200'
                }`}>
                  {activeWorkspace.workspace_type}
                </span>

                <div className="text-[9px] font-bold text-slate-400 font-mono transition flex items-center gap-1 shrink-0">
                  {isSaving ? (
                    <>
                      <span className="w-1 h-1 rounded-full bg-blue-500 animate-ping" />
                      <span className="text-blue-500">Auto-syncing...</span>
                    </>
                  ) : (
                    <>
                      <span className="text-emerald-500">✓</span>
                      <span>Changes Saved</span>
                    </>
                  )}
                </div>
              </div>

              {/* HAND IN SUBMISSION BUTTON FOR HOMEWORK TASKS */}
              {activeWorkspace.workspace_type === 'homework' && (
                <button
                  type="button"
                  onClick={() => queueStudentSave({ submitted: !activeWorkspace.student_contents?.submitted })}
                  className={`px-3 py-1 font-black uppercase tracking-wide text-[10px] rounded-lg transition-all shadow-xs flex items-center gap-1 ${
                    activeWorkspace.student_contents?.submitted 
                      ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' 
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {activeWorkspace.student_contents?.submitted ? '↩ Unsubmit Work' : '📤 Hand In Assignment'}
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* CORE WORKSPACE TWO-COLUMN INTERFACE */}
      <div id="student-workspace-core" className="flex-1 flex w-full relative overflow-hidden min-h-0">
        
        {/* READ-ONLY FILE MATRIX FOR TEACHER ATTACHMENTS */}
        {activeWorkspace && (
          <div 
            style={{ width: `${sidebarWidth}px` }}
            className="h-full bg-white border-r border-slate-200 flex flex-col shrink-0 select-none z-20 overflow-hidden relative"
          >
            <div className="p-2 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
              <h3 className="text-[9px] font-black uppercase tracking-wider text-slate-400">Class Files Library</h3>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              {/* Uses teacher_id to read resources attached by the instructor */}
              <FileDirectory folderPath={activeWorkspace.teacher_id} />
            </div>
          </div>
        )}

        {/* DRAG RESIZER */}
        {activeWorkspace && (
          <div 
            onMouseDown={startSidebarResize} 
            className="w-1 bg-slate-200 hover:bg-blue-500 cursor-ew-resize transition-all shrink-0 z-30" 
          />
        )}

        {/* CENTRAL INTERACTIVE WHITEBOARD */}
        <main className="flex-1 h-full relative z-10 bg-slate-50 min-w-0">
          {activeWorkspace ? (
            <Whiteboard 
              roomId={activeWorkspace.id} 
              folderPath={activeWorkspace.teacher_id}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1.5">
              <span className="text-2xl">🎨</span>
              <p className="text-[11px] font-bold uppercase tracking-wider">No Classroom Canvas Active</p>
              <button 
                type="button" 
                onClick={() => setIsDashboardOpen(true)}
                className="mt-1 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-xl transition shadow-xs"
              >
                Open Workspace Hub
              </button>
            </div>
          )}
        </main>

      </div>
    </div>
  )
}