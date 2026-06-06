"use client"
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Whiteboard from '../Whiteboard'
import FileDirectory from '../FileDirectory'

export default function ImmersiveClassroomPage() {
  const { id: bookingId } = useParams()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [cleanBookingId, setCleanBookingId] = useState<string>('')
  const [folderPath, setFolderPath] = useState<string | null>(null)
  const [bookingData, setBookingData] = useState<any>(null)
  
  // 🧭 UI State for the collapsible file sidebar
  const [isFilePanelOpen, setIsFilePanelOpen] = useState(false)

  useEffect(() => {
    async function fetchClassDetails() {
      if (!bookingId) return
      
      const currentId = Array.isArray(bookingId) ? bookingId[0] : bookingId
      setCleanBookingId(currentId)

      const { data, error } = await supabase
        .from('bookings')
        .select('*, teacher, parent')
        .eq('id', currentId)
        .single()

      if (error || !data) {
        console.error("Supabase Error Details:", error)
        alert("Classroom link invalid or missing registration data.")
        router.push('/dashboard')
        return
      }

      setBookingData(data)
      const uniquePairingFolder = `${data.teacher}_${data.parent}`
      setFolderPath(uniquePairingFolder)
      setLoading(false)
    }

    if (bookingId) {
      fetchClassDetails()
    }
  }, [bookingId, router])

  if (loading || !folderPath) {
    return (
      <div className="w-screen h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm font-medium text-slate-500 animate-pulse">Initializing immersive 1-on-1 workspace...</p>
      </div>
    )
  }

  return (
    <div className="w-screen h-screen bg-slate-100 flex flex-col overflow-hidden relative">
      
      {/* 1. Upper Status Floating Navigation Ribbon */}
      <header className="h-14 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 flex items-center justify-between shrink-0 absolute top-0 left-0 right-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          {/* Sidebar Toggle Trigger Button */}
          <button 
            onClick={() => setIsFilePanelOpen(!isFilePanelOpen)}
            className={`mr-2 p-2 rounded-xl border transition ${isFilePanelOpen ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
            title="Toggle File Directory Shared Locker"
          >
            📂 <span className="text-xs font-bold ml-1">{isFilePanelOpen ? 'Hide Files' : 'Show Files'}</span>
          </button>

          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <h1 className="text-sm font-bold text-slate-800 hidden sm:block">Live Active Session</h1>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded font-mono uppercase">Room: {cleanBookingId.slice(0,8)}</span>
        </div>
        
        <button 
          onClick={() => router.push('/dashboard')}
          className="px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition"
        >
          Leave Classroom
        </button>
      </header>

      {/* 2. BASE INTERACTIVE LAYER: Massive Full-Bleed Whiteboard Viewport */}
      <div className="w-full h-full pt-14 relative z-10">
        <Whiteboard roomId={cleanBookingId} folderPath={folderPath} />
      </div>

      {/* 3. COLLAPSIBLE OVERLAY: Slide-out Left Side Panel Asset Locker */}
      <div 
        className={`fixed top-14 left-0 bottom-0 w-80 bg-white/95 backdrop-blur-md border-r border-slate-200 shadow-2xl z-20 flex flex-col p-4 transform transition-transform duration-300 ease-in-out ${
          isFilePanelOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Shared Locker Assets</h3>
            <p className="text-[10px] text-slate-400 truncate w-64">Path: root/{folderPath}/</p>
          </div>
          <button 
            onClick={() => setIsFilePanelOpen(false)}
            className="text-slate-400 hover:text-slate-600 text-xs font-bold p-1"
          >
            ✕
          </button>
        </div>
        
        {/* Dynamic File Upload Tree Directory Mount */}
        <FileDirectory folderPath={folderPath} />
      </div>

      {/* 4. FLOATING OVERLAY: Suspended Media Video WebRTC Framework Dock */}
      <div className="fixed bottom-4 right-4 z-40 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-3 shadow-2xl flex flex-col gap-2 w-[340px] sm:w-[420px]">
        <div className="flex items-center justify-between px-1">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Media Conference Channels</span>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        </div>

        {/* Floating Side-by-Side Horizontal Stream Blocks */}
        <div className="grid grid-cols-2 gap-2 h-28">
          <div className="bg-slate-800/80 rounded-xl relative overflow-hidden flex items-center justify-center border border-slate-700">
            <span className="text-[10px] text-slate-400 font-bold">Local User (You)</span>
            {/* Real Video element will drop here */}
          </div>
          <div className="bg-slate-800/80 rounded-xl relative overflow-hidden flex items-center justify-center border border-slate-700">
            <span className="text-[10px] text-slate-400 font-bold">Remote Participant</span>
            {/* Partner Video element will drop here */}
          </div>
        </div>
      </div>

    </div>
  )
}