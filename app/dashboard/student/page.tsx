// app/dashboard/student/page.tsx
"use client"

import { Suspense, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

import { useStudent, type TabID } from './layout'

// Component Viewports Mappings
import HomeTab from './components/HomeTab'
import ScheduleTab from './components/ScheduleTab'
import ReportsTab from './components/ReportsTab'
import LockerRoomsTab from './components/LockerRoomsTab'
import ChatRoomTab from './components/ChatRoomTab' 
import Workspace from './components/Workspace'

// 🎨 Navigation registrations (if you want sidebar portals, otherwise keep viewports)
function StudentDashboardPageContent() {
  const { student, activeTab } = useStudent()
  
  // State to ensure we only look up DOM elements once the page is fully mounted in the browser
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 🎨 Portal target rendered by the layout shell (resolved on client after mounting)
  const mainTarget = mounted ? document.getElementById('student-main-viewport') : null

  // If the browser hasn't mounted the DOM containers yet, show a clean loading state
  if (!mounted || !mainTarget || !student?.id) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
      </div>
    )
  }

  // 🎯 PORTAL: ACTIVE TAB -> LAYOUT MAIN VIEWPORT
  return createPortal(
    <div className="animate-in fade-in duration-150">
      {activeTab === 'home' && <HomeTab studentId={student.id} />}
      {activeTab === 'schedule' && <ScheduleTab studentId={student.id} />}
      {activeTab === 'reports' && <ReportsTab studentId={student.id} />}
      {activeTab === 'locker' && <LockerRoomsTab studentId={student.id} />}
      {activeTab === 'chat' && <ChatRoomTab studentId={student.id} />} 
      {activeTab === 'workspace' && <Workspace studentId={student.id} />} 
    </div>,
    mainTarget
  )
}

// 📦 Safe System Container: Explicitly wrapped inside Next.js Suspense Context Boundary
export default function StudentDashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <span className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
      </div>
    }>
      <StudentDashboardPageContent />
    </Suspense>
  )
}