"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import HomeTab from './components/HomeTab'
import Schedule from './components/Schedule'
import ManageStudentsTab from './components/ManageStudentsTab' 
import ReportsProgress from './components/ReportsProgress'
import ProfileTab from './components/ProfileTab'
import ChatRoomTab from './components/ChatRoomTab' // 💬 Imported Teacher Wrapper component

// Appended 'chat' to the explicit union type definitions
type TabID = 'home' | 'schedule' | 'locker' | 'reports' | 'chat' | 'profile'

export default function TeacherDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabID>('home')
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [mountedMain, setMountedMain] = useState(false)

  useEffect(() => {
    async function resolveId() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setTeacherId(user.id)
      setMountedMain(true)
    }
    resolveId()
  }, [])

  const navItems = [
    { id: 'home', label: '🏠 Home Overview' },
    { id: 'schedule', label: '🗓️ My Schedule' },
    { id: 'locker', label: '🎒 Manage Students' }, 
    { id: 'reports', label: '📊 Student Reports' },
    { id: 'chat', label: '💬 Messages Hub' }, // 💬 New Sidebar Item Added
    { id: 'profile', label: '👤 Profile Settings' },
  ] as const

  if (!mountedMain || !teacherId) return null

  return (
    <>
      {/* 1. Mounts internal context directly into layout navigation sidebar loop */}
      <nav className="flex flex-row sm:flex-col gap-1 overflow-x-auto sm:overflow-x-visible pb-2 sm:pb-0">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveTab(item.id)}
            className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
              activeTab === item.id ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* 2. Directly handle target view display matrix overlay inside wrapper portal view frame handles */}
      {typeof window !== 'undefined' && document.getElementById('teacher-main-viewport') ? (
        require('react-dom').createPortal(
          <div className="bg-white border border-slate-200 rounded-3xl p-6 min-h-[85vh] shadow-xs animate-in fade-in duration-150">
            {activeTab === 'home' && <HomeTab teacherId={teacherId} />}
            {activeTab === 'schedule' && <Schedule teacherId={teacherId} />}
            {activeTab === 'locker' && <ManageStudentsTab teacherId={teacherId} />} 
            {activeTab === 'reports' && <ReportsProgress teacherId={teacherId} />}
            {activeTab === 'profile' && <ProfileTab teacherId={teacherId} />}
            
            {/* 💬 Renders the dedicated teacher wrapper view inside the portal core */}
            {activeTab === 'chat' && <ChatRoomTab teacherId={teacherId} />}
          </div>,
          document.getElementById('teacher-main-viewport')
        )
      ) : (
        // Initial fallback frame safe loader
        <div className="bg-white border border-slate-200 rounded-3xl p-6 min-h-[85vh] shadow-xs" />
      )}
    </>
  )
}