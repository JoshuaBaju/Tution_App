"use client"

import { Suspense } from 'react'
import { useParent } from './layout'

// Tab Components
import OverviewTab from './components/HomeTab'
import ManageChildrenTab from './components/ManageChildrenTab'
import BookingProcedureTab from './components/BookingProcedureTab'
import ProfileTab from './components/ProfileTab'
import BillingTab from './components/BillingTab'
import ChatRoom from './components/ChatRoomTab'

function ParentDashboardContent() {
  const { parentId, activeTab } = useParent()

  if (!parentId) return null

  return (
    <div className="w-full min-h-full">
      {activeTab === 'home' && <OverviewTab parentId={parentId} />}
      {activeTab === 'children' && <ManageChildrenTab parentId={parentId} />}
      {activeTab === 'book' && <BookingProcedureTab parentId={parentId} />}
      {activeTab === 'chat' && <ChatRoom parentId={parentId} />}
      {activeTab === 'billing' && <BillingTab />}
      {activeTab === 'profile' && <ProfileTab parentId={parentId} />}
    </div>
  )
}

export default function ParentDashboard() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-slate-400 font-medium text-xs uppercase tracking-widest animate-pulse">
          Loading Viewport...
        </div>
      }
    >
      <ParentDashboardContent />
    </Suspense>
  )
}