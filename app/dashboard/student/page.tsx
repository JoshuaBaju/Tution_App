"use client"

import { Suspense, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

import { useStudent, type TabID } from './layout'

// Tab Component Registrations — page.tsx only decides WHICH one renders,
// it never contains their internal logic or markup.
import HomeTab from './components/HomeTab'
import ScheduleTab from './components/ScheduleTab'
import ReportsTab from './components/ReportsTab'
import LockerRoomsTab from './components/LockerRoomsTab'
import ChatRoomTab from './components/ChatRoomTab'
import Workspace from './components/Workspace'

// 🎨 Navigation registrations — the only markup page.tsx owns
const navItems: { id: TabID; label: string; icon: string; hideMobile?: boolean }[] = [
  { id: 'home', label: 'Home Base', icon: '🏠' },
  { id: 'schedule', label: 'My Schedule', icon: '📅' },
  { id: 'reports', label: 'Progress Reports', icon: '📜' },
  { id: 'workspace', label: 'My Workspaces', icon: '💻' },
  { id: 'locker', label: 'Locker Rooms', icon: '📂' },
  { id: 'chat', label: 'Study Chat', icon: '💬' }
]

function StudentDashboardContent() {
  // Context Consumer — live studentId / activeTab / handleTabChange from the layout
  const { studentId, activeTab, handleTabChange } = useStudent()

  // State to ensure we only look up DOM elements once the page is fully mounted in the browser
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 🎨 Portal targets rendered by the layout shell (resolved on the client after mounting)
  const navTarget = mounted ? document.getElementById('student-sidebar-nav') : null
  const mainTarget = mounted ? document.getElementById('student-main-viewport') : null

  // If the browser hasn't mounted the DOM containers yet, show a clean loading state
  if (!mounted || !navTarget || !mainTarget) {
    return (
      <div className="py-20 text-center text-slate-400 font-medium text-xs uppercase tracking-widest animate-pulse">
        Connecting dashboard channels...
      </div>
    )
  }

  return (
    <>
      {/* 1. PORTAL: NAV BUTTONS -> LAYOUT SIDEBAR */}
      {createPortal(
        <>
          {navItems.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${tab.hideMobile ? 'sm:hidden' : ''} ${activeTab === tab.id ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </>,
        navTarget
      )}

      {/* 2. PORTAL: ACTIVE TAB -> LAYOUT MAIN VIEWPORT */}
      {createPortal(
        <>
          {activeTab === 'home' && <HomeTab studentId={studentId} />}
          {activeTab === 'schedule' && <ScheduleTab studentId={studentId} />}
          {activeTab === 'reports' && <ReportsTab studentId={studentId} />}
          {activeTab === 'workspace' && <Workspace studentId={studentId} />}
          {activeTab === 'locker' && <LockerRoomsTab studentId={studentId} />}
          {activeTab === 'chat' && <ChatRoomTab studentId={studentId} />}
        </>,
        mainTarget
      )}
    </>
  )
}

// 📦 Safe Export Root Wrapped in a Next.js Client Suspense Boundary Container
export default function StudentDashboard() {
  return (
    <Suspense fallback={
      <div className="py-20 text-center text-slate-400 font-medium text-xs uppercase tracking-widest animate-pulse">
        Prerendering Layout Canvas...
      </div>
    }>
      <StudentDashboardContent />
    </Suspense>
  )
}