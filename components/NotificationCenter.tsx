"use client"
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Notification {
  id: string
  title: string
  description: string
  category: 'chat' | 'session' | 'feedback' | 'system'
  link_to: string | null
  is_read: boolean
  created_at: string
}

export default function NotificationCenter({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!userId) return

    async function loadNotifications() {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        console.error("Error pulling history framework logs:", error.message)
      } else if (data) {
        setNotifications(data as Notification[])
        setUnreadCount(data.filter(n => !n.is_read).length)
      }
    }

    loadNotifications()

    const channel = supabase
      .channel(`user-alerts-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const newAlert = payload.new as Notification
          setNotifications(prev => [newAlert, ...prev].slice(0, 10))
          setUnreadCount(prev => prev + 1)
        }
      )
      .subscribe()

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [userId])

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)

    if (!error) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }

  const markAllAsRead = async () => {
    if (unreadCount === 0) return
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    }
  }

  const getCategoryEmoji = (category: string) => {
    switch (category) {
      case 'chat': return '💬'
      case 'session': return '🗓️'
      case 'feedback': return '📝'
      default: return '🔔'
    }
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button with Badge Counter */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className={`relative p-2 text-slate-500 rounded-xl transition-all border ${
          isOpen ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-blue-600 text-white font-black text-[10px] flex items-center justify-center rounded-full ring-2 ring-white">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Flyout Dropdown Overlay Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-100">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <div>
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Workspace Alerts</h3>
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded-md transition hover:bg-blue-100">
                Mark all read
              </button>
            )}
          </div>

          {/* List Display View */}
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {notifications.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6 italic">Your feed is clear.</p>
            ) : (
              notifications.map((n) => {
                const itemClasses = `p-2.5 rounded-xl border text-left transition flex gap-2 items-start w-full ${
                  n.is_read ? 'bg-slate-50/50 border-slate-100 opacity-75' : 'bg-blue-50/20 border-blue-100 hover:bg-blue-50/40 cursor-pointer'
                }`

                const innerContent = (
                  <>
                    <span className="text-xs mt-0.5">{getCategoryEmoji(n.category)}</span>
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <p className={`text-xs text-slate-800 truncate ${!n.is_read ? 'font-bold' : 'font-medium'}`}>{n.title}</p>
                      {/* Changed to line-clamp-1 to strictly enforce a one-line notification preview text block */}
                      <p className="text-[11px] text-slate-500 line-clamp-1">{n.description}</p>
                    </div>
                    {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1.5" />}
                  </>
                )

                // If a redirect path is present, wrap inside a native app Route Link
                if (n.link_to) {
                  return (
                    <Link 
                      key={n.id} 
                      href={n.link_to}
                      onClick={async () => {
                        if (!n.is_read) await markAsRead(n.id)
                        setIsOpen(false) // Close modal popover container
                      }}
                      className={`${itemClasses} block`}
                    >
                      {innerContent}
                    </Link>
                  )
                }

                // Fallback static action container item if no navigation path link is attached
                return (
                  <div 
                    key={n.id} 
                    onClick={() => !n.is_read && markAsRead(n.id)}
                    className={itemClasses}
                  >
                    {innerContent}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}