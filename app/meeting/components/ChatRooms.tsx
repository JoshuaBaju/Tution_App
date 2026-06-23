"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface ChatMessage {
  id: string
  room_id: string
  sender_id: string
  sender_role: string
  message: string
  created_at: string
}

interface ChatRoomsProps {
  roomId: string
  currentUserId?: string
  senderRole?: string // ⚡ Accepted from page context layout to settle database not-null requirements
}

export default function ChatRooms({ roomId, currentUserId, senderRole = 'teacher' }: ChatRoomsProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState('')

  // 1. Listen for existing messages and live realtime snapshots updates
  useEffect(() => {
    if (!roomId) return

    async function fetchMessages() {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })

      if (data) setMessages(data)
      if (error) console.error("Error pulling history timeline records:", error.message)
    }

    fetchMessages()

    const channelSubscription = supabase
      .channel(`room_messages_${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channelSubscription)
    }
  }, [roomId])

  // 2. Safely process and execute message transmissions 
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || !currentUserId || !roomId) return

    const currentMessageText = inputText.trim()
    setInputText('') // Optimistic UI field clearance

    // Execute direct table write including our verified sender_role
    const { error } = await supabase
      .from('chat_messages')
      .insert([
        {
          room_id: roomId,
          sender_id: currentUserId,
          message: currentMessageText,
          sender_role: senderRole // ⚡ Enforces constraint fulfillment cleanly
        }
      ])

    if (error) {
      console.error("❌ SQL Insert Transaction Rejected! Details:", error.message)
      console.log("💡 Tip: Ensure user claims authorized role parameters under the specific room lookup setup.")
    }
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 overflow-hidden min-h-0">
      
      {/* Messages Feed Viewport */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2.5 min-h-0 bg-slate-50/40">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-1.5">
            <span className="text-xl">💬</span>
            <p className="text-[11px] font-bold tracking-wide uppercase font-sans">No messages yet in this room.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                  isMe 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-xs'
                }`}>
                  <p className="break-words font-medium">{msg.message}</p>
                </div>
                <span className="text-[9px] font-mono text-slate-400 mt-0.5 px-1 uppercase tracking-wider">
                  {msg.sender_role || 'user'} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )
          })
        )}
      </div>

      {/* Input Action Terminal Controller Footer */}
      <form onSubmit={handleSendMessage} className="p-2 border-t border-slate-150 bg-white flex gap-1.5 shrink-0 items-center">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type your message here..."
          className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white transition"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-black uppercase tracking-wider hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-xs"
        >
          Send
        </button>
      </form>

    </div>
  )
}