"use client"
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Whiteboard from '../Whiteboard'
import FileDirectory from '../FileDirectory'

export default function ImmersiveClassroomPage() {
  const params = useParams()
  const router = useRouter()
  
  // Safely extract the dynamic ID from the router params
  const bookingId = Array.isArray(params?.id) ? params.id[0] : params?.id

  const [loading, setLoading] = useState(true)
  const [cleanBookingId, setCleanBookingId] = useState<string>('')
  const [folderPath, setFolderPath] = useState<string | null>(null)
  const [bookingData, setBookingData] = useState<any>(null)
  const [isFilePanelOpen, setIsFilePanelOpen] = useState(false)

  useEffect(() => {
    async function fetchClassDetails() {
      if (!bookingId) return
      setCleanBookingId(bookingId)

      try {
        // Query explicit foreign key columns to match your exact schema setup
        const { data, error } = await supabase
          .from('bookings')
          .select('id, teacher_id, student_id, parent_id, subject')
          .eq('id', bookingId)
          .maybeSingle()

        if (error || !data) {
          console.error("Supabase Query Error Details:", error)
          alert("Classroom link invalid or session assignment has expired.")
          router.push('/dashboard')
          return
        }

        setBookingData(data)

        // Creates an isolated path using specific profile IDs to protect student privacy
        const uniquePairingFolder = `${data.teacher_id}_${data.student_id || data.parent_id}`
        setFolderPath(uniquePairingFolder)
        
      } catch (err) {
        console.error("Critical classroom system initialization error:", err)
        router.push('/dashboard')
      } finally {
        setLoading(false)
      }
    }

    fetchClassDetails()
  }, [bookingId, router])

  if (loading || !folderPath) {
    return (
      <div className="w-screen h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="w-8 h-8 rounded-full border-4 border-blue-600/20 border-t-blue-600 animate-spin" />
          <p className="text-sm font-black text-slate-600 tracking-wide">Initializing immersive 1-on-1 workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-screen h-screen bg-slate-100 flex flex-col overflow-hidden relative select-none">
      
      {/* 1. Upper Status Navigation Ribbon */}
      <header className="h-14 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 flex items-center justify-between shrink-0 absolute top-0 left-0 right-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => setIsFilePanelOpen(!isFilePanelOpen)}
            className={`p-2 px-3 rounded-xl border transition flex items-center gap-2 ${
              isFilePanelOpen 
                ? 'bg-blue-50 border-blue-200 text-blue-600 font-bold' 
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 font-medium'
            }`}
            title="Toggle Shared File Locker"
          >
            <span>📂</span>
            <span className="text-xs">{isFilePanelOpen ? 'Hide Files' : 'Show Files'}</span>
          </button>

          <span className="relative flex h-2 w-2 ml-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <h1 className="text-sm font-black text-slate-800 hidden sm:block">
            {bookingData?.subject || "Live Session"}
          </h1>
          <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md font-mono uppercase border border-slate-200">
            Room: {cleanBookingId.slice(0, 8)}
          </span>
        </div>
        
        <button 
          type="button"
          onClick={() => {
            if(confirm("Are you sure you want to exit the live classroom?")) {
              router.push('/dashboard')
            }
          }}
          className="px-4 py-2 text-xs font-black text-red-600 hover:bg-red-50 border border-red-200 bg-white rounded-xl transition"
        >
          Leave Classroom
        </button>
      </header>

      {/* 2. BASE LAYER: Interactive Whiteboard */}
      <main className="w-full h-full pt-14 relative z-10">
        <Whiteboard roomId={cleanBookingId} folderPath={folderPath} />
      </main>

      {/* 3. COLLAPSIBLE OVERLAY: Asset Locker Sidebar */}
      <div 
        className={`fixed top-14 left-0 bottom-0 w-80 bg-white/95 backdrop-blur-xl border-r border-slate-200 shadow-2xl z-20 flex flex-col p-4 transform transition-transform duration-300 ease-in-out ${
          isFilePanelOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-2">
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Shared Assets</h3>
            <p className="text-[10px] text-slate-400 font-mono truncate w-56">secure_root://{folderPath.slice(0, 20)}...</p>
          </div>
          <button 
            type="button"
            onClick={() => setIsFilePanelOpen(false)}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
          >
            ✕
          </button>
        </div>
        
        {/* Dynamic File Directory */}
        <div className="flex-1 overflow-y-auto">
          <FileDirectory folderPath={folderPath} />
        </div>
      </div>

      {/* 4. FLOATING OVERLAY: WebRTC Video Framework Dock */}
      <div className="fixed bottom-4 right-4 z-40 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-3 shadow-2xl flex flex-col gap-2 w-[340px] sm:w-[380px]">
        <div className="flex items-center justify-between px-1">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Media Streams</span>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
        </div>

        {/* Video Feeds Container */}
        <div className="grid grid-cols-2 gap-2 h-28">
          <div className="bg-slate-950 rounded-xl relative overflow-hidden flex items-center justify-center border border-slate-800">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">You (Camera)</span>
          </div>
          <div className="bg-slate-950 rounded-xl relative overflow-hidden flex items-center justify-center border border-slate-800">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Remote User</span>
          </div>
        </div>
      </div>

    </div>
  )
}