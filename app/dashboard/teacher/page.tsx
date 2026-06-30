"use client"

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import HomeTab from './components/HomeTab'
import Schedule from './components/Schedule'
import ManageStudentsTab from './components/ManageStudentsTab' 
import ReportsProgress from './components/ReportsProgress'
import ProfileTab from './components/ProfileTab'
import ChatRoomTab from './components/ChatRoomTab'

type TabID = 'home' | 'schedule' | 'locker' | 'reports' | 'chat' | 'profile'

export default function TeacherDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabID>('home')
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [mountedMain, setMountedMain] = useState(false)
  
  const searchParams = useSearchParams() // 🔗 Read live routing queries

  useEffect(() => {
    async function resolveId() {
      // 1. Authenticate and resolve user context
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setTeacherId(user.id)
      
      // 2. 🎯 UNIVERSAL PARAM WORKSPACE HANDLER:
      // Extracts whatever parameter is passed and matches it dynamically against valid layouts
      const incomingTab = searchParams.get('tab') as TabID | null
      const validTabs: TabID[] = ['home', 'schedule', 'locker', 'reports', 'chat', 'profile']

      if (incomingTab && validTabs.includes(incomingTab)) {
        setActiveTab(incomingTab)
      } else {
        setActiveTab('home') // Safe fallback configuration if param is missing or empty
      }
      
      setMountedMain(true)
    }
    resolveId()
  }, [searchParams]) // Triggers cleanly when parameters route shifts

  const navItems = [
    { id: 'home', label: '🏠 Home Overview' },
    { id: 'schedule', label: '🗓️ My Schedule' },
    { id: 'locker', label: '🎒 Manage Students' }, 
    { id: 'reports', label: '📊 Student Reports' },
    { id: 'chat', label: '💬 Messages Hub' },
    { id: 'profile', label: '👤 Profile Settings' },
  ] as const

  if (!mountedMain || !teacherId) return null

  return (
    <>
      {/* SIDEBAR OR HORIZONTAL SYSTEM NAVIGATION LIST */}
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

      {/* SYSTEM CENTRAL PORTAL CONTAINER VIEWPORT ATTACHMENT PIPELINE */}
      {typeof window !== 'undefined' && document.getElementById('teacher-main-viewport') ? (
        require('react-dom').createPortal(
          <div className="bg-white border border-slate-200 rounded-3xl p-6 min-h-[85vh] shadow-xs animate-in fade-in duration-150">
            {activeTab === 'home' && <HomeTab teacherId={teacherId} />}
            {activeTab === 'schedule' && <Schedule teacherId={teacherId} />}
            {activeTab === 'locker' && <ManageStudentsTab teacherId={teacherId} />} 
            {activeTab === 'reports' && <ReportsProgress teacherId={teacherId} />}
            {activeTab === 'profile' && <ProfileTab teacherId={teacherId} />}
            {activeTab === 'chat' && <ChatRoomTab teacherId={teacherId} />}
          </div>,
          document.getElementById('teacher-main-viewport')!
        )
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 min-h-[85vh] shadow-xs" />
      )}
    </>
  )
}