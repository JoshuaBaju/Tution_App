"use client"
import { useStudent } from './layout'

// Clean targeted relative path component imports
import HomeTab from './components/HomeTab'
import ScheduleTab from './components/ScheduleTab'
import ReportsTab from './components/ReportsTab'
import LockerRoomsTab from './components/LockerRoomsTab'
import ChatRoomTab from './components/ChatRoomTab' // 💡 Added your modular student chat wrapper

export default function StudentDashboardPage() {
  const { student, activeTab } = useStudent()

  // Guard clause to handle loading or undefined student context states safely
  if (!student?.id) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      {activeTab === 'home' && <HomeTab studentId={student.id} />}
      {activeTab === 'schedule' && <ScheduleTab studentId={student.id} />}
      {activeTab === 'reports' && <ReportsTab studentId={student.id} />}
      {activeTab === 'locker' && <LockerRoomsTab studentId={student.id} />}
      {activeTab === 'chat' && <ChatRoomTab studentId={student.id} />} {/* 🚀 New workspace route */}
    </>
  )
}