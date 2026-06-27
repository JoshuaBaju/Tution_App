"use client"

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Whiteboard from '@/app/meeting/components/Whiteboard'
import FileDirectory from '@/app/meeting/components/FileDirectory'
import ChatRooms from '@/app/meeting/components/ChatRooms'

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
  
  // Feature 1: Pre-session Green Room States
  const [hasStartedClass, setHasStartedClass] = useState<boolean>(false)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [micLevel, setMicLevel] = useState<number>(0)
  const [otherPartyName, setOtherPartyName] = useState<string>("Loading profile...")
  const preSessionVideoRef = useRef<HTMLVideoElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // Feature 2: Presence States
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

  // 🎙️ Dynamic Audio Level Meter Initialization
  const startAudioMeter = (stream: MediaStream) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      const audioContext = new AudioContextClass()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      
      audioContextRef.current = audioContext
      analyserRef.current = analyser

      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)

      const updateMeter = () => {
        if (!analyserRef.current) return
        analyserRef.current.getByteFrequencyData(dataArray)
        let total = 0
        for (let i = 0; i < bufferLength; i++) {
          total += dataArray[i]
        }
        const average = total / bufferLength
        setMicLevel(Math.min(100, Math.floor((average / 128) * 100)))
        animationFrameRef.current = requestAnimationFrame(updateMeter)
      }
      updateMeter()
    } catch (e) {
      console.error("Audio Context processing denied or unsupported:", e)
    }
  }

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
          
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', user.id)
              .maybeSingle()
            if (profile?.full_name) setCurrentUserName(profile.full_name)
          } catch (e) {
            console.warn("Profiles look up skipped.")
          }
        }

        // Fetch target booking session info first to get accurate metadata context
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

          let resolvedTeacherName = "Instructor Teacher"
          let resolvedStudentName = "Student Participant"

          if (targetBooking.teacher) {
            const { data: teacherData } = await supabase
              .from('teachers')
              .select('name')
              .eq('id', targetBooking.teacher)
              .maybeSingle()
            if (teacherData?.name) resolvedTeacherName = teacherData.name
          }

          if (targetBooking.student) {
            const { data: studentData } = await supabase
              .from('students')
              .select('name')
              .eq('id', targetBooking.student)
              .maybeSingle()
            if (studentData?.name) resolvedStudentName = studentData.name
          }

          if (activeUserId) {
            if (activeUserId === targetBooking.teacher) {
              currentResolvedRole = 'teacher'
              setUserRole('teacher')
              setOtherPartyName(resolvedStudentName)
            } else {
              currentResolvedRole = 'student'
              setUserRole('student')
              setOtherPartyName(resolvedTeacherName)
            }

            // 🔑 RESOLVE REAL ROOM ID: Look up based on the actual structural session pairing
            const { data: realRoom } = await supabase
              .from('chat_rooms')
              .select('id')
              .eq('teacher_id', targetBooking.teacher)
              .eq('student_id', targetBooking.student)
              .maybeSingle()

            if (realRoom?.id) {
              setChatRoomId(realRoom.id)
            } else {
              // Create room safely if it hasn't been instantiated yet
              const { data: newRoom } = await supabase
                .from('chat_rooms')
                .insert([
                  {
                    teacher_id: targetBooking.teacher,
                    student_id: targetBooking.student,
                    parent_id: targetBooking.parent || null
                  }
                ])
                .select('id')
                .single()
              
              if (newRoom?.id) setChatRoomId(newRoom.id)
            }
          }

          setFolderPath(`${targetBooking.teacher || 'teacher'}_${targetBooking.student || 'student'}`)
          setLoading(false)
          return
        }

        sendToDashboardFallback(currentResolvedRole)
      } catch (err) {
        console.error("Workspace mounting system exception:", err)
        router.push('/dashboard/teacher')
      }
    }

    initializeClassroom()
  }, [lookupId, router])

  // 🛡️ Request hardware capabilities on Green room rendering
  useEffect(() => {
    if (!hasStartedClass && !loading) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          setLocalStream(stream)
          if (preSessionVideoRef.current) {
            preSessionVideoRef.current.srcObject = stream
          }
          startAudioMeter(stream)
        })
        .catch((err) => console.error("Access permissions for media stream denied:", err))
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch((err) => 
          console.warn("AudioContext was already terminated safely:", err)
        )
      }
    }
  }, [hasStartedClass, loading])

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
        if (peersExist && !otherPartyJoined) {
          setOtherPartyJoined(true)
          triggerNotification(`Your ${userRole === 'teacher' ? 'student' : 'teacher'} has entered the room!`)
        } else if (!peersExist && otherPartyJoined) {
          setOtherPartyJoined(false)
          triggerNotification("The other party left the session workspace.")
        }
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        if (key !== currentUserId) {
          setOtherPartyJoined(true)
          triggerNotification(`User joined as: ${otherPartyName}`)
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
  }, [hasStartedClass, cleanId, otherPartyName, currentUserId])

  const triggerNotification = (msg: string) => {
    setAnnouncement(msg)
    setTimeout(() => setAnnouncement(null), 5000)
  }

  const handleBeginClass = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop())
    }
    setHasStartedClass(true)
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
      <div className="w-screen h-screen bg-slate-900 text-white flex items-center justify-center p-6 font-sans">
        <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8 items-center">
          
          <div className="space-y-4">
            <div className="aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 relative shadow-2xl flex items-center justify-center">
              <video ref={preSessionVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
              <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-700/50 text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Camera Feed Online
              </div>
            </div>

            <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-xs text-slate-400 font-bold tracking-wide uppercase">
                <span>Microphone Testing Input</span>
                <span className={micLevel > 5 ? "text-emerald-400 font-mono" : "text-slate-600"}>
                  {micLevel > 5 ? 'Capturing Audio...' : 'Silent'}
                </span>
              </div>
              <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden w-full relative">
                <div 
                  style={{ width: `${micLevel}%` }} 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-75" 
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-black tracking-widest text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20 inline-block">
                Ready to Join Session
              </span>
              <h2 className="text-2xl font-black text-slate-100 tracking-tight">{sessionData?.subject || "Live Classroom Session"}</h2>
              <p className="text-sm text-slate-400 font-medium">Please confirm your camera/microphone signals align correctly prior to connection engagement.</p>
            </div>

            <hr className="border-slate-800" />

            <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Joining As Identity:</span>
                <span className="font-bold text-slate-200 bg-slate-800 px-2.5 py-1 rounded border border-slate-700">{currentUserName} ({userRole || 'User'})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Target Participant:</span>
                <span className="font-bold text-slate-200">{otherPartyName}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleBeginClass}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-xs font-black uppercase tracking-wider rounded-xl transition duration-200 shadow-lg shadow-blue-600/10 cursor-pointer"
            >
              🚀 Begin Class Session Workspace
            </button>
          </div>

        </div>
      </div>
    )
  }

  // CORE CLASSROOM LIVE WORKSPACE ENVIRONMENT
  const isAnyLeftPanelOpen = isCommunicationOpen || isChannelsOpen

  return (
    <div className="w-screen h-screen bg-slate-100 flex flex-col overflow-hidden relative select-none font-sans antialiased">
      
      {announcement && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-2xl z-50 flex items-center gap-2 animate-bounce">
          <span className="text-emerald-400">⚡</span> {announcement}
        </div>
      )}

      <header className="h-14 bg-white border-b border-slate-200/80 px-4 flex items-center justify-between shrink-0 z-30 shadow-xs relative">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => setIsCommunicationOpen(!isCommunicationOpen)}
            className={`p-2 rounded-xl border transition-all flex items-center justify-center ${
              isCommunicationOpen ? 'bg-blue-50 border-blue-200 text-blue-600 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
            title="Toggle Room Communication Panel"
          >
            <span className="text-sm">💬</span>
          </button>

          <button 
            type="button"
            onClick={() => setIsChannelsOpen(!isChannelsOpen)}
            className={`p-2 rounded-xl border transition-all flex items-center justify-center ${
              isChannelsOpen ? 'bg-teal-50 border-teal-200 text-teal-600 font-bold' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
            title="Toggle Video Session Channels"
          >
            <span className="text-sm">📹</span>
          </button>

          <div className="h-4 w-[1px] bg-slate-200 ml-1" />

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
                    /* 🚀 Safe Real-Time Room Injection */
                    chatRoomId ? (
                      <ChatRooms roomId={chatRoomId} currentUserId={currentUserId || undefined} senderRole={userRole || "student"} />
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-xs text-slate-400 font-medium">
                        Syncing secure room pipeline...
                      </div>
                    )
                  ) : (
                    <FileDirectory folderPath={folderPath} />
                  )}
                </div>
              </div>
            )}

            {isCommunicationOpen && isChannelsOpen && (
              <div onMouseDown={startAvResize} className="h-1 bg-slate-200 hover:bg-blue-400 cursor-ns-resize transition-all shrink-0 z-30" />
            )}

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
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Channels</span>
                  <span className="text-[9px] font-bold text-teal-600 font-mono mr-5">CONNECTED</span>
                </div>
                <div className={`grid gap-2 flex-1 min-h-0 ${isCommunicationOpen ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <div className="bg-slate-900 rounded-xl relative flex items-center justify-center border border-slate-800 shadow-inner min-h-[60px]">
                    <span className="text-[9px] text-slate-400 font-black uppercase absolute bottom-1.5 left-2 bg-slate-950/60 px-1.5 py-0.5 rounded">You</span>
                  </div>
                  <div className="bg-slate-900 rounded-xl relative flex items-center justify-center border border-slate-800 shadow-inner min-h-[60px]">
                    <span className="text-[9px] text-slate-400 font-black uppercase absolute bottom-1.5 left-2 bg-slate-950/60 px-1.5 py-0.5 rounded">
                      {otherPartyJoined ? otherPartyName : 'Offline'}
                    </span>
                    {!otherPartyJoined && <span className="text-[10px] text-slate-600 font-bold animate-pulse">Waiting...</span>}
                  </div>
                </div>
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