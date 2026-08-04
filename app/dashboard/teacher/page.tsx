"use client"

import { Suspense } from 'react'
import { useTeacher } from './layout'

// Tab Component Registrations
import HomeTab from './components/HomeTab'
import Schedule from './components/Schedule'
import ManageStudentsTab from './components/ManageStudentsTab' 
import ReportsProgress from './components/ReportsProgress'
import ProfileTab from './components/ProfileTab'
import ChatRoomTab from './components/ChatRoomTab'
import WorkspaceTab from './components/Workspace'

function TeacherDashboardContent() {
  const { teacherId, activeTab } = useTeacher()

  return (
    <div className="w-full">
      {activeTab === 'home' && <HomeTab teacherId={teacherId} />}
      {activeTab === 'schedule' && <Schedule teacherId={teacherId} />}
      {activeTab === 'workspace' && <WorkspaceTab />}
      {activeTab === 'locker' && <ManageStudentsTab teacherId={teacherId} />} 
      {activeTab === 'reports' && <ReportsProgress teacherId={teacherId} />}
      {activeTab === 'chat' && <ChatRoomTab teacherId={teacherId} />}
      {activeTab === 'profile' && <ProfileTab teacherId={teacherId} />}
    </div>
  )
}

export default function TeacherDashboard() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-slate-400 font-medium text-xs uppercase tracking-widest animate-pulse">
          Loading Viewport...
        </div>
      }
    >
      <TeacherDashboardContent />
    </Suspense>
  )
}