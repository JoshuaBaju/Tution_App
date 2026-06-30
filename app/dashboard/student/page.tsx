"use client"
import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useStudent } from './layout'

// Clean targeted relative path component imports
import HomeTab from './components/HomeTab'
import ScheduleTab from './components/ScheduleTab'
import ReportsTab from './components/ReportsTab'
import LockerRoomsTab from './components/LockerRoomsTab'
import ChatRoomTab from './components/ChatRoomTab' 

type TabID = 'home' | 'schedule' | 'reports' | 'locker' | 'chat'

function StudentDashboardPageContent() {
  // Destructure state from your layout provider context
  const { student, activeTab, setActiveTab } = useStudent() as any
  const searchParams = useSearchParams() // 🔗 Read live routing queries safely inside Suspense

  // 🎯 UNIVERSAL PARAM WORKSPACE HANDLER:
  // Dynamically monitors Next.js URL parameter changes
  useEffect(() => {
    if (!setActiveTab) return

    const incomingTab = searchParams.get('tab') as TabID | null
    const validTabs: TabID[] = ['home', 'schedule', 'reports', 'locker', 'chat']

    if (incomingTab && validTabs.includes(incomingTab)) {
      setActiveTab(incomingTab)
    } else {
      setActiveTab('home') // Safe default fallback if tab is missing or invalid
    }
  }, [searchParams, setActiveTab])

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
      {activeTab === 'chat' && <ChatRoomTab studentId={student.id} />} 
    </>
  )
}

// 📦 Safe Export Root Wrapped in a Next.js Client Suspense Boundary Container
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