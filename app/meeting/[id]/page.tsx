"use client"

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Whiteboard from '@/app/meeting/components/Whiteboard'
import FileDirectory from '@/app/meeting/components/FileDirectory'
import ChatRooms from '@/app/meeting/components/ChatRooms'
import ConfigurePage from '@/app/meeting/components/ConfigurePage'
import VideoControls from '@/components/meeting/VideoControls'

export default function ImmersiveClassroomPage() {
  const params = useParams()
  const router = useRouter()
  
  const lookupId = Array.isArray(params?.id) ? params.id[0] : params?.id

  // Framework Engine States
  const [loading, setLoading] = useState(true)
  const [cleanId, setCleanId] = useState<string>('')
  const [folderPath, setFolderPath] = useState<string>('')
  const [sessionData, setSessionData] = useState<any>(null)
  const [isDemoClass, setIsDemoClass] = useState<boolean>(false)
  const [exiting, setExiting] = useState<boolean>(false)
  
  // Pre-session State
  const [hasStartedClass, setHasStartedClass] = useState<boolean>(false)
  const [otherPartyName, setOtherPartyName] = useState<string>("Loading profile...")

  // Presence States
  const [otherPartyJoined, setOtherPartyJoined] = useState<boolean>(false)
  const [announcement, setAnnouncement] = useState<string | null>(null)
  
  // Role & Identity States
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserName, setCurrentUserName] = useState<string>("User")
  const [userRole, setUserRole] = useState<'teacher' | 'student' | 'parent' | null>(null)
  const [chatRoomId, setChatRoomId] = useState<string | null>(null)
  
  // UI Layout Framework States
  const [isCommunicationOpen, setIsCommunicationOpen] = useState(true)
  const [isChannelsOpen, setIsChannelsOpen] = useState(true)          
  const [activeTab, setActiveTab] = useState<'chat' | 'locker'>('chat')
  const [sidebarWidth, setSidebarWidth] = useState(320)
  const [avHeight, setAvHeight] = useState(176)
  
  // Regular Session Wrap-up Form Modal (Teacher Only)
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false)
  const [teacherFeedback, setTeacherFeedback] = useState<string>('')
  const [testScore, setTestScore] = useState<number>(0)
  const [submittingReview, setSubmittingReview] = useState<boolean>(false)
  
  const isResizingSidebar = useRef(false)
  const isResizingAv = useRef(false)

  // Refs to prevent useEffect loop in Realtime Presence
  const otherPartyJoinedRef = useRef(false)
  const otherPartyNameRef = useRef("Loading profile...")

  useEffect(() => {
    otherPartyJoinedRef.current = otherPartyJoined
  }, [otherPartyJoined])

  useEffect(() => {
    otherPartyNameRef.current = otherPartyName
  }, [otherPartyName])

  // Sidebar dynamic layout handlers
  const startSidebarResize = (e: React.MouseEvent) => {
    e.preventDefault()
    isResizingSidebar.current = true
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
  }

  const startAvResize = (e: React.MouseEvent) => {
    e.preventDefault()
    isResizingAv.current = true
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSidebar.current) {
        const calculatedWidth = e.clientX - 48
        if (calculatedWidth > 200 && calculatedWidth < 600) setSidebarWidth(calculatedWidth)
      }
      if (isResizingAv.current) {
        const workspaceContainer = document.getElementById('workspace-core')
        if (workspaceContainer) {
          const containerHeight = workspaceContainer.getBoundingClientRect().height
          const calculatedHeight = containerHeight - (e.clientY - workspaceContainer.getBoundingClientRect().top)
          if (calculatedHeight > 100 && calculatedHeight < (containerHeight * 0.6)) setAvHeight(calculatedHeight)
        }
      }
    }

    const handleMouseUp = () => {
      isResizingSidebar.current = false
      isResizingAv.current = false
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

  // ⚡ Main Framework Loader & Profile Resolver Context
  useEffect(() => {
    async function initializeClassroom() {
      if (!lookupId) return
      setCleanId(lookupId)

      const sendToDashboardFallback = (role: string | null) => {
        router.push(role ? `/dashboard/${role}` : '/dashboard/teacher')
      }

      try {
        const { data: { user } } = await supabase.auth.getUser()
        let activeUserId: string | null = null
        let currentResolvedRole: 'teacher' | 'student' | 'parent' | null = null

        if (user) {
          activeUserId = user.id
          setCurrentUserId(user.id)
        }

        // 1. Fetch Session / Booking info
        const { data: session } = await supabase
          .from('sessions')
          .select(`id, booking_id, topic, bookings ( teacher, student, parent, subject )`)
          .eq('id', lookupId)
          .maybeSingle()

        let targetBooking = session?.bookings ? (session.bookings as any) : null
        let isDemo = false

        if (!targetBooking) {
          const { data: booking } = await supabase
            .from('bookings')
            .select('teacher, student, parent, subject')
            .eq('id', lookupId)
            .maybeSingle()

          if (booking) {
            targetBooking = booking
            isDemo = true
            setIsDemoClass(true)
            setSessionData(booking)
          }
        }

        if (targetBooking) {
          if (!isDemo && session) {
            setSessionData({
              id: session.id,
              subject: session.topic || targetBooking?.subject || "Live Session"
            })
          }

          // 2. Resolve Role Names
          let resolvedTeacherName = "Teacher"
          let resolvedStudentName = "Student"
          let resolvedParentName = "Parent"

          if (targetBooking.teacher) {
            const { data: tData } = await supabase.from('teachers').select('name').eq('id', targetBooking.teacher).maybeSingle()
            if (tData?.name) resolvedTeacherName = tData.name
          }

          if (targetBooking.student) {
            const { data: sData } = await supabase.from('students').select('name').eq('id', targetBooking.student).maybeSingle()
            if (sData?.name) resolvedStudentName = sData.name
          }

          if (targetBooking.parent) {
            const { data: pData } = await supabase.from('parents').select('name').eq('id', targetBooking.parent).maybeSingle()
            if (pData?.name) resolvedParentName = pData.name
          }

          // Determine current user role & participant names
          if (activeUserId) {
            if (activeUserId === targetBooking.teacher) {
              currentResolvedRole = 'teacher'
              setUserRole('teacher')
              setCurrentUserName(resolvedTeacherName)
              setOtherPartyName(isDemo ? resolvedParentName : resolvedStudentName)
            } else if (activeUserId === targetBooking.student) {
              currentResolvedRole = 'student'
              setUserRole('student')
              setCurrentUserName(resolvedStudentName)
              setOtherPartyName(resolvedTeacherName)
            } else if (activeUserId === targetBooking.parent) {
              currentResolvedRole = 'parent'
              setUserRole('parent')
              setCurrentUserName(resolvedParentName)
              setOtherPartyName(resolvedTeacherName)
            }
          }

          // 3. Chat Room Query / Creation Logic
          if (isDemo) {
            const { data: demoRoom } = await supabase
              .from('chat_rooms')
              .select('id')
              .eq('teacher_id', targetBooking.teacher)
              .eq('parent_id', targetBooking.parent)
              .maybeSingle()

            if (demoRoom?.id) {
              setChatRoomId(demoRoom.id)
            } else {
              const { data: newDemoRoom } = await supabase
                .from('chat_rooms')
                .insert([{
                  teacher_id: targetBooking.teacher,
                  parent_id: targetBooking.parent,
                  student_id: null
                }])
                .select('id')
                .single()

              if (newDemoRoom?.id) setChatRoomId(newDemoRoom.id)
            }
          } else {
            const { data: sessionRoom } = await supabase
              .from('chat_rooms')
              .select('id')
              .eq('teacher_id', targetBooking.teacher)
              .eq('student_id', targetBooking.student)
              .maybeSingle()

            if (sessionRoom?.id) {
              setChatRoomId(sessionRoom.id)
            } else {
              const { data: newSessionRoom } = await supabase
                .from('chat_rooms')
                .insert([{
                  teacher_id: targetBooking.teacher,
                  student_id: targetBooking.student,
                  parent_id: null
                }])
                .select('id')
                .single()

              if (newSessionRoom?.id) setChatRoomId(newSessionRoom.id)
            }
          }

          setFolderPath(`${targetBooking.teacher || 'teacher'}_${targetBooking.student || 'student'}`)
          setLoading(false)
          return
        }

        sendToDashboardFallback(currentResolvedRole)
      } catch (err) {
        console.error("Workspace mounting exception:", err)
        router.push('/dashboard/teacher')
      }
    }

    initializeClassroom()
  }, [lookupId, router])

  // 🤝 Real-time Workspace Presence Listeners
  useEffect(() => {
    if (!hasStartedClass || !cleanId) return

    const channel = supabase.channel(`classroom_presence_${cleanId}`, {
      config: { presence: { key: currentUserId || 'guest' } }
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const keys = Object.keys(state)
        
        const peersExist = keys.some(k => k !== currentUserId)
        if (peersExist && !otherPartyJoinedRef.current) {
          setOtherPartyJoined(true)
          triggerNotification(`${otherPartyNameRef.current} has entered the room!`)
        } else if (!peersExist && otherPartyJoinedRef.current) {
          setOtherPartyJoined(false)
          triggerNotification("The other party left the session workspace.")
        }
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        if (key !== currentUserId && !otherPartyJoinedRef.current) {
          setOtherPartyJoined(true)
          triggerNotification(`User joined: ${otherPartyNameRef.current}`)
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key !== currentUserId) {
          setOtherPartyJoined(false)
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            name: currentUserName,
            role: userRole,
            onlineAt: new Date().toISOString()
          })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [hasStartedClass, cleanId, currentUserId])

  const triggerNotification = (msg: string) => {
    setAnnouncement(msg)
    setTimeout(() => setAnnouncement(null), 5000)
  }

  const handleExitWorkspace = async () => {
    if (!confirm("Are you sure you want to leave the workspace session?")) return

    if (isDemoClass) {
      try {
        setExiting(true)
        const { error } = await supabase.from('bookings').update({ status: 'parent_approval_pending' }).eq('id', lookupId)
        if (error) console.error("Error setting workflow state:", error.message)
        router.push(`/dashboard/post-demo?booking=${lookupId}`)
      } catch (err) {
        router.push(userRole ? `/dashboard/${userRole}` : '/dashboard/teacher')
      }
    } else {
      if (userRole === 'teacher') {
        setShowSummaryModal(true)
      } else {
        router.push(userRole ? `/dashboard/${userRole}` : '/dashboard/teacher')
      }
    }
  }

  const handleReviewSubmission = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teacherFeedback.trim()) return alert("Please provide class review notes.")

    try {
      setSubmittingReview(true)
      const { error } = await supabase
        .from('sessions')
        .update({ feedback: teacherFeedback.trim(), test_score: testScore, status: 'completed' })
        .eq('id', lookupId)

      if (error) {
        alert(`Error locking session logs: ${error.message}`)
        setSubmittingReview(false)
        return
      }
      router.push('/dashboard/teacher')
    } catch (err) {
      console.error(err)
      setSubmittingReview(false)
    }
  }

  if (loading || exiting) {
    return (
      <div className="w-screen h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="w-8 h-8 rounded-full border-4 border-blue-600/20 border-t-blue-600 animate-spin" />
          <p className="text-sm font-black text-slate-600 tracking-wide">Initializing workspace components...</p>
        </div>
      </div>
    )
  }

  // GREEN ROOM / PRE-JOIN INTERFACE
  if (!hasStartedClass) {
    return (
      <ConfigurePage
        sessionSubject={sessionData?.subject}
        currentUserName={currentUserName}
        userRole={userRole}
        otherPartyName={otherPartyName}
        onBeginClass={() => setHasStartedClass(true)}
      />
    )
  }

  const isAnyLeftPanelOpen = isCommunicationOpen || isChannelsOpen

  return (
    <div className="w-screen h-screen bg-slate-100 flex flex-col overflow-hidden relative select-none font-sans antialiased">
      
      {announcement && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-2xl z-50 flex items-center gap-2 animate-bounce">
          <span className="text-emerald-400">⚡</span> {announcement}
        </div>
      )}

      {/* Clean Header */}
      <header className="h-14 bg-white border-b border-slate-200/80 px-4 flex items-center justify-between shrink-0 z-30 shadow-xs relative">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <h1 className="text-xs font-black text-slate-800 tracking-tight uppercase">
              {sessionData?.subject || "Live Session"}
            </h1>
            
            <span className={`text-[9px] font-black tracking-wider px-2 py-0.5 rounded border uppercase font-mono ${
              otherPartyJoined ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'
            }`}>
              {otherPartyJoined ? `🟢 ${otherPartyName} Here` : '⚪ Waiting for Peer'}
            </span>
          </div>
        </div>
        
        <button 
          type="button"
          onClick={handleExitWorkspace}
          className="px-3.5 py-1.5 text-xs font-black text-red-600 hover:bg-red-50 border border-red-200 bg-white rounded-xl transition shadow-xs cursor-pointer"
        >
          Leave Workspace
        </button>
      </header>

      <div id="workspace-core" className="flex-1 flex w-full relative overflow-hidden">
        
        {/* SIDEBAR MODULE */}
        <div 
          style={{ width: isAnyLeftPanelOpen ? `${48 + sidebarWidth}px` : '48px' }}
          className="h-full flex shrink-0 bg-white border-r border-slate-200 z-20 relative select-none transition-[width] duration-200 ease-in-out"
        >
          {/* STRIP CONTROLS */}
          <div className="w-12 h-full bg-slate-50 border-r border-slate-150 flex flex-col items-center py-3 justify-between shrink-0">
            <div className="flex flex-col gap-2 w-full px-1.5">
              <button
                type="button"
                onClick={() => { setActiveTab('chat'); if (!isCommunicationOpen) setIsCommunicationOpen(true) }}
                className={`p-2 rounded-lg text-xs font-bold transition flex items-center justify-center ${
                  isCommunicationOpen && activeTab === 'chat' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200'
                }`}
                title="Open Room Chat"
              >
                💬
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('locker'); if (!isCommunicationOpen) setIsCommunicationOpen(true) }}
                className={`p-2 rounded-lg text-xs font-bold transition flex items-center justify-center ${
                  isCommunicationOpen && activeTab === 'locker' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200'
                }`}
                title="Open Assets Locker"
              >
                📁
              </button>

              <hr className="border-slate-200 my-1" />

              <button
                type="button"
                onClick={() => setIsChannelsOpen(!isChannelsOpen)}
                className={`p-2 rounded-lg text-xs font-bold transition flex items-center justify-center ${
                  isChannelsOpen ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-200'
                }`}
                title="Toggle Live Video Frame"
              >
                📹
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                if (isAnyLeftPanelOpen) {
                  setIsCommunicationOpen(false)
                  setIsChannelsOpen(false)
                } else {
                  setIsCommunicationOpen(true)
                  setIsChannelsOpen(true)
                }
              }}
              className="p-2 text-slate-400 text-[10px] font-black uppercase mt-auto border-t border-slate-200 w-full text-center"
            >
              {isAnyLeftPanelOpen ? '◀' : '▶'}
            </button>
          </div>

          {/* MASTER SUBPANEL INJECTION AREA */}
          <div className="flex-1 h-full flex flex-col overflow-hidden">
            
            {isCommunicationOpen && (
              <div className="flex-1 flex flex-col p-3 overflow-hidden min-h-0 relative">
                <button 
                  onClick={() => setIsCommunicationOpen(false)}
                  className="absolute top-2.5 right-2.5 text-slate-400 hover:text-slate-600 text-xs font-extrabold z-40"
                  title="Close Section"
                >
                  ✕
                </button>
                <div className="mb-2 px-1 flex justify-between items-center shrink-0">
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 pr-6">
                    {activeTab === 'chat' ? 'Room Communication' : 'Shared Asset Cabin'}
                  </h3>
                  <span className="text-[9px] font-mono text-slate-300 mr-4">v1.2.5</span>
                </div>
                <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
                  {activeTab === 'chat' ? (
                    chatRoomId ? (
                      <ChatRooms roomId={chatRoomId} currentUserId={currentUserId || undefined} senderRole={userRole || "student"} />
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-xs text-slate-400 font-medium">
                        Syncing secure room pipeline...
                      </div>
                    )
                  ) : (
                    isDemoClass ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                        <span className="text-2xl mb-2">🔒</span>
                        <p className="text-xs font-bold text-slate-700">Shared Storage Unavailable</p>
                        <p className="text-[11px] text-slate-400 mt-1">Shared storage is available only for active Sessions.</p>
                      </div>
                    ) : (
                      <FileDirectory folderPath={folderPath} />
                    )
                  )}
                </div>
              </div>
            )}

            {isCommunicationOpen && isChannelsOpen && (
              <div onMouseDown={startAvResize} className="h-1 bg-slate-200 hover:bg-blue-400 cursor-ns-resize transition-all shrink-0 z-30" />
            )}

            {/* Video Panel */}
            {isChannelsOpen && (
              <div 
                style={{ height: isCommunicationOpen ? `${avHeight}px` : '100%' }} 
                className={`p-3 bg-slate-50/50 flex flex-col gap-2 shrink-0 overflow-hidden relative border-t border-slate-200 ${
                  !isCommunicationOpen ? 'flex-1' : ''
                }`}
              >
                <button 
                  onClick={() => setIsChannelsOpen(false)}
                  className="absolute top-2.5 right-2.5 text-slate-400 hover:text-slate-600 text-xs font-extrabold z-40"
                  title="Close Section"
                >
                  ✕
                </button>
                <div className="flex items-center justify-between px-1 shrink-0">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Live Stream</span>
                  <span className="text-[9px] font-bold text-teal-600 font-mono mr-5">CONNECTED</span>
                </div>

                <VideoControls
                  otherPartyJoined={otherPartyJoined}
                  otherPartyName={otherPartyName}
                />
              </div>
            )}
            
          </div>
        </div>

        {isAnyLeftPanelOpen && <div onMouseDown={startSidebarResize} className="w-1 bg-slate-200 hover:bg-blue-500 cursor-ew-resize transition-all shrink-0 z-30 layout-resizer" />}

        {/* CENTRAL WHITEBOARD CANVAS */}
        <main className="flex-1 h-full relative z-10 bg-slate-50 min-w-0">
          <Whiteboard roomId={cleanId} folderPath={folderPath} />
        </main>

      </div>

      {/* EVALUATION MODAL */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl p-6 shadow-xl space-y-5">
            <div>
              <span className="text-2xl">📝</span>
              <h3 className="text-base font-black text-slate-900 tracking-tight mt-2">Class Wrap-up Evaluation</h3>
              <p className="text-xs text-slate-400 mt-0.5">Please provide logs to update metric points before leaving.</p>
            </div>
            <form onSubmit={handleReviewSubmission} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">Session Feedback Notes</label>
                <textarea required rows={4} value={teacherFeedback} onChange={(e) => setTeacherFeedback(e.target.value)} placeholder="Summarize subject content progress..." className="w-full p-3 text-xs font-medium border border-slate-200 bg-slate-50 rounded-xl focus:bg-white outline-none" />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">Quiz Score</label>
                  <span className="text-xs font-mono font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{testScore} / 10 Points</span>
                </div>
                <input type="range" min={0} max={10} step={1} value={testScore} onChange={(e) => setTestScore(parseInt(e.target.value))} className="w-full accent-blue-600 bg-slate-100 h-2 cursor-pointer" />
              </div>
              <div className="pt-2 flex gap-3">
                <button type="submit" disabled={submittingReview} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase rounded-xl shadow-md disabled:bg-slate-200 cursor-pointer">
                  {submittingReview ? "Saving..." : "✔️ Save Log & Exit"}
                </button>
                <button type="button" onClick={() => setShowSummaryModal(false)} disabled={submittingReview} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black uppercase rounded-xl">Resume</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}