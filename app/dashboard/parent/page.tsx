"use client"

import { Suspense, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

import { useParent, type TabID } from './layout'

// Tab Component Registrations — page.tsx only decides WHICH one renders,
// it never contains their internal logic or markup.
import OverviewTab from './components/HomeTab'
import ManageChildrenTab from './components/ManageChildrenTab'
import BookingProcedureTab from './components/BookingProcedureTab'
import ProfileTab from './components/ProfileTab'
import BillingTab from './components/BillingTab'
import ChatRoom from './components/ChatRoomTab'

// 🎨 Navigation registrations — the only markup page.tsx owns
const navItems: { id: TabID; label: string; icon: string; hideMobile?: boolean }[] = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'children', label: 'Children', icon: '🧒' },
  { id: 'book', label: 'Book Tutor', icon: '🔍' },
  { id: 'chat', label: 'Messages', icon: '💬' },
  { id: 'billing', label: 'Billing', icon: '💳' },
  { id: 'profile', label: 'Settings', icon: '⚙️', hideMobile: true }
]

function ParentDashboardContent() {
  // Context Consumer — live parentId / activeTab / setActiveTab from the layout
  const { parentId, activeTab, handleTabChange } = useParent()

  // State to ensure we only look up DOM elements once the page is fully mounted in the browser
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 🎨 Portal targets rendered by the layout shell (resolved on the client after mounting)
  const navTarget = mounted ? document.getElementById('parent-sidebar-nav') : null
  const mainTarget = mounted ? document.getElementById('parent-main-viewport') : null

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
          {activeTab === 'home' && <OverviewTab parentId={parentId} />}
          {activeTab === 'children' && <ManageChildrenTab parentId={parentId} />}
          {activeTab === 'book' && <BookingProcedureTab parentId={parentId} />}
          {activeTab === 'profile' && <ProfileTab parentId={parentId} />}
          {activeTab === 'billing' && <BillingTab />}
          {activeTab === 'chat' && <ChatRoom parentId={parentId} />}
        </>,
        mainTarget
      )}
    </>
  )
}

// 📦 Safe Export Root Wrapped in a Next.js Client Suspense Boundary Container
export default function ParentDashboard() {
  return (
    <Suspense fallback={
      <div className="py-20 text-center text-slate-400 font-medium text-xs uppercase tracking-widest animate-pulse">
        Prerendering Layout Canvas...
      </div>
    }>
      <ParentDashboardContent />
    </Suspense>
  )
}