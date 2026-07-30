// app/dashboard/student/page.tsx
"use client"
import { Suspense, useEffect, useState } from 'react'
import { useStudent } from './layout'

// Component viewports mappings
import HomeTab from './components/HomeTab'
import ScheduleTab from './components/ScheduleTab'
import ReportsTab from './components/ReportsTab'
import LockerRoomsTab from './components/LockerRoomsTab'
import ChatRoomTab from './components/ChatRoomTab' 
import Workspace from './components/Workspace'

function StudentDashboardPageContent() {
  const { student, activeTab } = useStudent()
  const [isMounted, setIsMounted] = useState(false)

  // Wait safely until target DOM framework mounts to window layouts
  useEffect(() => {
    if (student?.id) {
      setIsMounted(true)
    }
  }, [student])

  if (!isMounted || !student?.id) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
      </div>
    )
  }

  // 🎯 REACT PORTAL ENGINE: Dynamically projects code down into the structural layout layer
  if (typeof window !== 'undefined' && document.getElementById('student-main-viewport')) {
    return require('react-dom').createPortal(
      <div className="animate-in fade-in duration-150">
        {activeTab === 'home' && <HomeTab studentId={student.id} />}
        {activeTab === 'schedule' && <ScheduleTab studentId={student.id} />}
        {activeTab === 'reports' && <ReportsTab studentId={student.id} />}
        {activeTab === 'locker' && <LockerRoomsTab studentId={student.id} />}
        {activeTab === 'chat' && <ChatRoomTab studentId={student.id} />} 
        {activeTab === 'workspace' && <Workspace studentId={student.id} />} 
      </div>,
      document.getElementById('student-main-viewport')!
    )
  }

  return null
}

// 📦 SAFE SYSTEM CONTAINER: Explicitly wrapped inside a Next.js Suspense Context Boundary
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