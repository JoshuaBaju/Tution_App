"use client"

import { ReactNode, useState } from 'react'
import NotificationCenter from '@/components/NotificationCenter'

export interface NavItem<T extends string = string> {
  id: T
  label: string
  icon: string
  hideMobile?: boolean
}

interface DashboardShellProps<T extends string = string> {
  appTitle?: string
  roleTitle?: string
  userDisplayName: string
  userPhotoUrl?: string // 📸 Optional profile photo URL
  userSubtext?: ReactNode
  userId: string
  navItems: NavItem<T>[]
  activeTab: T
  onTabChange: (tabId: T) => void
  onSignOut: () => void
  onProfileClick?: () => void
  children: ReactNode
}

/**
 * 🔤 Helper: Extracts up to the first two initials from a name string
 * Example: "Jane Mary Smith" -> "JM" | "John" -> "J"
 */
function getInitials(name: string): string {
  if (!name || !name.trim()) return 'U'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'U'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase()
}

export default function DashboardShell<T extends string = string>({
  userDisplayName,
  userPhotoUrl,
  userSubtext,
  userId,
  navItems,
  activeTab,
  onTabChange,
  onSignOut,
  onProfileClick,
  children
}: DashboardShellProps<T>) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const initials = getInitials(userDisplayName)

  return (
    <div className="w-screen h-screen flex flex-col sm:flex-row bg-slate-100 text-slate-900 overflow-hidden font-sans antialiased">
      
      {/* 🎨 DARK NAVY SIDEBAR SHELL (#1A2D48) */}
      <aside
        className={`bg-[#1A2D48] text-white flex flex-col justify-between shrink-0 z-20 select-none shadow-xl border-b sm:border-b-0 sm:border-r border-slate-800 transition-all duration-300 ${
          isCollapsed ? 'w-full sm:w-20' : 'w-full sm:w-72'
        }`}
      >
        <div className="p-4 sm:p-5">
          
          {/* BRAND HEADER & COLLAPSE TOGGLE */}
          <div className="mb-6 flex items-center justify-between border-b border-slate-700/60 pb-4 min-h-[52px]">
            
            {/* LOGO & BRAND (Expanded View) */}
            <div className={`flex items-center gap-3 flex-shrink-0 overflow-hidden transition-all duration-300 ${isCollapsed ? 'sm:hidden' : 'flex'}`}>
              <div className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center flex-shrink-0">
                <img 
                  src="/logo_for_navbar.png" 
                  alt="logo_for_navbar" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <span className="font-['MuseoModerno'] text-xl md:text-[22px] text-[#ffffff] font-normal leading-none uppercase tracking-tight">
                  METIS
                </span>

                <div className="flex flex-col font-['Muna'] text-[8px] md:text-[9px] text-[#ffffff]/90 font-normal tracking-widest leading-[1.1] uppercase">
                  <span>education</span>
                  <span>platform</span>
                </div>
              </div>
            </div>

            {/* Collapsed Icon-Only View Logo Placeholder */}
            {isCollapsed && (
              <div className="hidden sm:flex items-center justify-center w-9 h-9 mx-auto shrink-0">
                <img 
                  src="/logo_for_navbar.png" 
                  alt="logo" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Hamburger Collapse Button */}
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              className="p-2 rounded-xl text-slate-200 hover:text-white hover:bg-slate-700/50 transition cursor-pointer shrink-0"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-row sm:flex-col gap-3 overflow-x-auto sm:overflow-x-visible pb-2 sm:pb-0 no-scrollbar">
            {navItems.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  title={isCollapsed ? tab.label : undefined}
                  className={`whitespace-nowrap px-4 py-3 rounded-full text-xs sm:text-sm font-bold transition-all duration-150 flex items-center gap-3 cursor-pointer shadow-md ${
                    isCollapsed ? 'sm:justify-center sm:px-0' : 'justify-start'
                  } ${
                    tab.hideMobile ? 'hidden sm:flex' : ''
                  } ${
                    isActive
                      ? 'bg-white text-blue-600 ring-2 ring-blue-400 scale-[1.02]'
                      : 'bg-white text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-base shrink-0">{tab.icon}</span>
                  <span className={`${isCollapsed ? 'sm:hidden' : 'inline'}`}>
                    {tab.label}
                  </span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-700/60 hidden sm:block space-y-3">
          {userSubtext && !isCollapsed && (
            <div className="text-center text-slate-300">
              {userSubtext}
            </div>
          )}
          <button
            type="button"
            onClick={onSignOut}
            title={isCollapsed ? "Sign Out" : undefined}
            className={`w-full py-2.5 text-xs font-black uppercase tracking-wider text-red-400 hover:bg-red-500/10 rounded-full transition cursor-pointer flex items-center justify-center ${
              isCollapsed ? 'px-0' : 'px-4'
            }`}
          >
            {isCollapsed ? '🚪' : 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* 🎨 MAIN VIEWPORT MATRIX */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden relative transition-all duration-300">
        
        {/* Header */}
        <header className="h-16 bg-[#1A2D48] text-white border-b border-slate-800 px-6 sm:px-8 flex items-center justify-between shrink-0 z-10 shadow-md">
          <span className="text-xs font-medium text-slate-300">
            Welcome back, <span className="text-white font-bold">{userDisplayName}</span>
          </span>

          <div className="flex items-center gap-4">
            <NotificationCenter userId={userId} />

            {/* Profile Avatar Button / Image */}
            {onProfileClick ? (
              <button
                type="button"
                onClick={onProfileClick}
                className={`w-9 h-9 rounded-full transition flex items-center justify-center font-bold text-xs shadow-md cursor-pointer overflow-hidden ${
                  activeTab === 'profile'
                    ? 'ring-2 ring-blue-400'
                    : 'hover:ring-2 hover:ring-white'
                }`}
              >
                {userPhotoUrl ? (
                  <img
                    src={userPhotoUrl}
                    alt={userDisplayName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to text if image fails to load
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-white text-slate-900 flex items-center justify-center font-bold">
                    {initials}
                  </div>
                )}
              </button>
            ) : (
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black text-white">{userDisplayName}</p>
              </div>
            )}
          </div>
        </header>

        {/* Viewport Content Area */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-8 w-full transition-all duration-300">
          <div className="w-full max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>

    </div>
  )
}