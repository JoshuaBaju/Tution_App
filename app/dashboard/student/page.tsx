"use client"

import { Suspense } from 'react'
import { useStudent } from './layout'

// Tab Component Registrations
import HomeTab from './components/HomeTab'
import ScheduleTab from './components/ScheduleTab'
import ReportsTab from './components/ReportsTab'
import LockerRoomsTab from './components/LockerRoomsTab'
import ChatRoomTab from './components/ChatRoomTab'
import Workspace from './components/Workspace'

function StudentDashboardContent() {
  const { studentId, activeTab } = useStudent()

  return (
    <>
      {activeTab === 'home' && <HomeTab studentId={studentId} />}
      {activeTab === 'schedule' && <ScheduleTab studentId={studentId} />}
      {activeTab === 'reports' && <ReportsTab studentId={studentId} />}
      {activeTab === 'workspace' && <Workspace studentId={studentId} />}
      {activeTab === 'locker' && <LockerRoomsTab studentId={studentId} />}
      {activeTab === 'chat' && <ChatRoomTab studentId={studentId} />}
    </>
  )
}

export default function StudentDashboard() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-slate-400 font-medium text-xs uppercase tracking-widest animate-pulse">
          Loading Viewport...
        </div>
      }
    >
      <StudentDashboardContent />
    </Suspense>
  )
}