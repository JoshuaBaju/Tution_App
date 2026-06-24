"use client"

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Contact, Message } from '../../lib/types'

// Intersect the basic custom Message type with database schema properties for absolute safety
type ExtendedMessage = Message & {
  read_at?: string | null
  room_id?: string
  updated_at?: string | null
}

type ChatContact = Contact & { unread_count?: number }

interface UniversalChatDashboardProps {
  currentUserId: string
  currentUserRole: 'parent' | 'teacher' | 'student'
  contacts: ChatContact[]
  loadingContacts: boolean
  onInitializeRoom: (contact: ChatContact) => Promise<string | null>
  onRefreshRoster: () => void
}

export default function ChatDashboard({
  currentUserId,
  currentUserRole,
  contacts,
  loadingContacts,
  onInitializeRoom,
  onRefreshRoster
}: UniversalChatDashboardProps) {
  const [activeContact, setActiveContact] = useState<ChatContact | null>(null)
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ExtendedMessage[]>([]) 
  const [newMessage, setNewMessage] = useState('')
  const [loadingMessages, setLoadingMessages] = useState(false)
  
  const [selectedMenuMessage, setSelectedMenuMessage] = useState<any | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [menuCoords, setMenuCoords] = useState<{ x: number; y: number } | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)

  function handleCloseChatRoom() {
    setActiveContact(null)
    setActiveRoomId(null)
    setMessages([])
  }

  // Optimized Database Read Receipt execution + immediate UI feedback
  async function markMessagesAsRead(roomId: string) {
    if (!roomId || !currentUserId) return

    const now = new Date().toISOString()

    const { error } = await supabase
      .from('chat_messages')
      .update({ read_at: now })
      .eq('room_id', roomId)
      .neq('sender_id', currentUserId)
      .is('read_at', null)
    
    if (!error) {
      setMessages((prev) =>
        prev.map((m) =>
          m.room_id === roomId && m.sender_id !== currentUserId && !m.read_at
            ? { ...m, read_at: now }
            : m
        )
      )
      onRefreshRoster()
    } else {
      console.error("Database rejected read_at timestamp configuration:", error)
    }
  }

  // Live Message Sync Loop
  useEffect(() => {
    if (!activeRoomId) {
      setMessages([])
      return
    }

    const currentRoomSecureToken: string = activeRoomId

    async function streamHistoricLogs() {
      setLoadingMessages(true)
      
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', currentRoomSecureToken)
        .order('created_at', { ascending: true })

      if (!error && data) {
        setMessages(data)
        await markMessagesAsRead(currentRoomSecureToken)
      }
      setLoadingMessages(false)
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }

    streamHistoricLogs()

    const channel = supabase
      .channel(`room_stream_${currentRoomSecureToken}`)
      .on('postgres_changes', {
        event: '*', 
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${currentRoomSecureToken}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newMsg = payload.new as ExtendedMessage
          
          setMessages((prev) => {
            if (prev.some(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })

          if (newMsg.sender_id !== currentUserId) {
            markMessagesAsRead(currentRoomSecureToken)
          }
          setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
        } else if (payload.eventType === 'UPDATE') {
          const updatedMsg = payload.new as ExtendedMessage
          setMessages((prev) => prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m)))
        } else if (payload.eventType === 'DELETE') {
          const deletedId = (payload.old as any)?.id || (payload.new as any)?.id
          if (deletedId) setMessages((prev) => prev.filter((m) => m.id !== deletedId))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeRoomId, currentUserId])

  // Global Realtime Tracker
  useEffect(() => {
    if (!currentUserId) return

    const globalChannel = supabase
      .channel('global_chat_tracker')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'chat_messages' 
      }, (payload) => {
        onRefreshRoster()
        
        const changedMsg = (payload.new || payload.old) as any
        if (activeRoomId && changedMsg?.room_id === activeRoomId && payload.eventType === 'UPDATE') {
          setMessages((prev) => prev.map((m) => (m.id === payload.new.id ? (payload.new as ExtendedMessage) : m)))
        }
      })
      .subscribe()

    return () => { 
      supabase.removeChannel(globalChannel) 
    }
  }, [currentUserId, activeRoomId, onRefreshRoster])

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim() || !activeRoomId) return
    const text = newMessage
    const targetRoom: string = activeRoomId
    setNewMessage('')

    await supabase.from('chat_messages').insert([
      { room_id: targetRoom, sender_id: currentUserId, sender_role: currentUserRole, message: text.trim() }
    ])
  }

  async function handleEditSubmit(e?: React.MouseEvent | React.FormEvent) {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    if (!editValue.trim() || !selectedMenuMessage) return
    
    const targetId = selectedMenuMessage.id
    const updatedText = editValue.trim()
    const now = new Date().toISOString()

    const { error } = await supabase
      .from('chat_messages')
      .update({ 
        message: updatedText, 
        updated_at: now 
      })
      .eq('id', targetId)

    if (!error) {
      setMessages((prev) =>
        prev.map((m) => (m.id === targetId ? { ...m, message: updatedText, updated_at: now } : m))
      )
      setIsEditing(false)
      setSelectedMenuMessage(null)
      setEditValue('')
    } else {
      console.error("Database rejected record modification:", error)
    }
  }

  async function handleDeleteSubmit(e?: React.MouseEvent) {
    if (e) e.stopPropagation()
    if (!selectedMenuMessage) return
    const targetId = selectedMenuMessage.id

    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('id', targetId)

    if (!error) {
      setMessages((prev) => prev.filter((m) => m.id !== targetId))
    } else {
      console.error("Database rejected row drop sequence:", error)
    }

    setSelectedMenuMessage(null)
  }

  const handleTouchStart = (e: any, msg: any) => {
    if (e.button && e.button !== 0) return 
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    longPressTimer.current = setTimeout(() => { 
      setSelectedMenuMessage(msg)
      setMenuCoords({ x: clientX, y: clientY }) 
    }, 600)
  }

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
    }
  }

  const overallTotalUnread = contacts.reduce((acc, curr) => acc + (curr.unread_count || 0), 0)

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm h-[calc(100vh-140px)] max-h-[620px] relative">
      
      {/* SIDEBAR CONTAINER */}
      <div className="md:col-span-4 border-r border-slate-200 flex flex-col bg-slate-50/50 h-full overflow-hidden relative">
        <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
              💬 Chats Hub {overallTotalUnread > 0 && <span className="bg-red-500 text-white font-mono text-[10px] px-2 py-0.5 rounded-full">{overallTotalUnread}</span>}
            </h3>
            <p className="text-[11px] text-slate-400">Verified connection lines.</p>
          </div>
          {loadingContacts && (
            <span className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {contacts.map((c) => {
            const isSelected = activeContact?.contact_id === c.contact_id
            
            const handleSelectContact = async () => {
              if (c.existing_room_id) {
                setActiveContact(c)
                setActiveRoomId(c.existing_room_id)
              } else {
                const targetRoomId = await onInitializeRoom(c)
                if (targetRoomId) {
                  const updatedContact = { ...c, existing_room_id: targetRoomId }
                  setActiveContact(updatedContact)
                  setActiveRoomId(targetRoomId)
                  onRefreshRoster()
                }
              }
            }

            return (
              <div
                key={c.contact_id}
                onClick={handleSelectContact}
                className={`p-3 rounded-xl transition flex items-center justify-between gap-3 cursor-pointer ${
                  isSelected ? 'bg-blue-600 text-white' : 'bg-white hover:bg-slate-100 border border-slate-100'
                }`}
              >
                <div className="truncate flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-xs font-black truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                      {c.contact_name}
                    </p>
                    {(c.unread_count ?? 0) > 0 ? (
                      <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{c.unread_count}</span>
                    ) : null}
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded mt-1 inline-block ${
                    isSelected ? 'bg-blue-700 text-blue-200' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {c.contact_type}
                  </span>
                </div>
                {!c.existing_room_id && (
                  <button
                    type="button"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg shadow-sm shrink-0"
                  >
                    ✨ Start
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* CHAT WINDOW VIEWPORT */}
      <div className="md:col-span-8 flex flex-col bg-white h-full overflow-hidden relative">
        {activeContact && activeRoomId ? (
          <>
            <div className="p-4 border-b border-slate-200 bg-white z-10 shrink-0 flex justify-between items-center">
              <div><h4 className="text-xs font-black text-slate-800 tracking-tight">{activeContact.contact_name}</h4></div>
              <button type="button" onClick={handleCloseChatRoom} className="p-1.5 text-slate-400 text-sm hover:text-slate-600">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30 custom-scrollbar relative">
              {loadingMessages ? (
                <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center text-[11px] text-slate-400 font-bold uppercase tracking-wider z-20">
                  Syncing logs...
                </div>
              ) : null}
              
              {messages.map((m: any) => {
                const isMe = m.sender_id === currentUserId
                return (
                  <div 
                    key={m.id} 
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`} 
                    onMouseDown={(e) => handleTouchStart(e, m)} 
                    onMouseUp={handleTouchEnd}
                    onTouchStart={(e) => handleTouchStart(e, m)}
                    onTouchEnd={handleTouchEnd}
                  >
                    <div className={`max-w-[75%] p-3 rounded-2xl text-xs cursor-pointer ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'}`}>
                      <p className="leading-relaxed break-words whitespace-pre-wrap selection:bg-blue-200">{m.message}</p>
                      <div className="flex items-center justify-end gap-1 mt-1 text-[8px] opacity-70">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {isMe && (m.read_at ? <span>✓✓</span> : <span>✓</span>)}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={scrollRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-white flex gap-2 items-center shrink-0">
              <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 bg-slate-50 text-xs border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none" />
              <button type="submit" disabled={!newMessage.trim()} className="bg-blue-600 text-white text-xs font-black px-4 py-2.5 rounded-xl">Send 🚀</button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <span className="text-3xl mb-2">📥</span>
            <h4 className="text-xs font-black uppercase tracking-wider">No Workspace Selected</h4>
          </div>
        )}
      </div>

      {/* POPUP LONG PRESS CONTEXT OVERLAYS */}
      {selectedMenuMessage && menuCoords && (
        <div className="fixed inset-0 z-[100]" onClick={() => setSelectedMenuMessage(null)}>
          <div style={{ top: `${menuCoords.y}px`, left: `${menuCoords.x}px` }} className="absolute bg-white border border-slate-200 shadow-xl rounded-xl p-1 w-32 text-xs" onClick={e => e.stopPropagation()}>
            <button type="button" onClick={(e) => { e.stopPropagation(); setIsEditing(true); setEditValue(selectedMenuMessage.message); setMenuCoords(null) }} className="w-full text-left p-2 hover:bg-slate-50">✏️ Edit</button>
            <button type="button" onClick={(e) => handleDeleteSubmit(e)} className="w-full text-left p-2 hover:bg-red-50 text-red-600 font-bold">🗑️ Delete</button>
          </div>
        </div>
      )}

      {/* EDIT MODAL DIALOG */}
      {isEditing && (
        <div className="absolute inset-0 bg-slate-900/40 z-[200] flex items-center justify-center p-4" onClick={() => setIsEditing(false)}>
          <form 
            onSubmit={handleEditSubmit}
            className="bg-white rounded-2xl p-4 w-full max-w-md space-y-3 shadow-2xl" 
            onClick={e => e.stopPropagation()}
          >
            <textarea 
              value={editValue} 
              onChange={(e) => setEditValue(e.target.value)} 
              className="w-full text-xs border border-slate-200 rounded-xl p-3 h-24 focus:outline-none focus:border-blue-500" 
            />
            <div className="flex justify-end gap-2 text-xs font-bold">
              <button 
                type="button" 
                onClick={() => { setIsEditing(false); setSelectedMenuMessage(null); }} 
                className="px-3 py-2 text-slate-500 hover:bg-slate-50 rounded-lg"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={!editValue.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}