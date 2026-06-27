"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import ChatDashboard from '@/components/chat/ChatDashboard'
import { Contact } from '@/lib/types'

type ChatContact = Contact & { unread_count?: number }

interface ParentChatRoomProps {
  parentId: string
}

export default function ParentChatRoom({ parentId }: ParentChatRoomProps) {
  const [contacts, setContacts] = useState<ChatContact[]>([])
  const [loading, setLoading] = useState(true)
  const [authUserId, setAuthUserId] = useState<string | null>(null) // 💡 Track real Auth ID

  async function loadParentRoster() {
    try {
      // 1. Get the actual authenticated user ID
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id) {
        setAuthUserId(session.user.id)
      }
      
      const { data: bookings, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          teacher,
          teachers:teacher (id, name)
        `)
        .eq('parent', parentId)
        .eq('status', 'active')

      if (bookingError) throw bookingError

      const uniqueContactsMap = new Map<string, ChatContact>()
      bookings?.forEach((item: any) => {
        if (item.teachers && !uniqueContactsMap.has(item.teacher)) {
          uniqueContactsMap.set(item.teacher, {
            contact_id: item.teachers.id,
            contact_name: item.teachers.name || 'Staff Instructor',
            contact_type: 'teacher',
            existing_room_id: null,
            unread_count: 0
          })
        }
      })

      const verifiedTeacherIds = Array.from(uniqueContactsMap.keys())
      if (verifiedTeacherIds.length === 0) {
        setContacts([])
        return
      }

      const { data: rooms, error: roomError } = await supabase
        .from('chat_rooms')
        .select('id, teacher_id')
        .eq('parent_id', parentId)
        .in('teacher_id', verifiedTeacherIds)

      if (roomError) throw roomError

      const activeRoomIds: string[] = []
      rooms?.forEach((room: any) => {
        const match = uniqueContactsMap.get(room.teacher_id)
        if (match) {
          match.existing_room_id = room.id
          activeRoomIds.push(room.id)
        }
      })

      if (activeRoomIds.length > 0 && session?.user?.id) {
        const { data: unreadCounts, error: unreadError } = await supabase
          .from('chat_messages')
          .select('room_id')
          .is('read_at', null)
          .neq('sender_id', session.user.id) // 💡 Filter with Auth ID
          .in('room_id', activeRoomIds)

        if (!unreadError && unreadCounts) {
          unreadCounts.forEach((msg: any) => {
            const targetContact = Array.from(uniqueContactsMap.values()).find(
              (c) => c.existing_room_id === msg.room_id
            )
            if (targetContact && targetContact.unread_count !== undefined) {
              targetContact.unread_count += 1
            }
          })
        }
      }

      setContacts(Array.from(uniqueContactsMap.values()))
    } catch (err) {
      console.error("Failed executing parent contact population pipeline:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (parentId) loadParentRoster()
  }, [parentId])

  async function handleInitializeRoom(contact: ChatContact): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .insert([
          {
            teacher_id: contact.contact_id,
            parent_id: parentId
          }
        ])
        .select()
        .single()

      if (error) throw error

      await loadParentRoster()
      return data.id
    } catch (err: any) {
      alert(`Could not initiate secure connection: ${err.message}`)
      return null
    }
  }

  if (!authUserId) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      <div>
        <h1 className="text-xl font-black tracking-tight text-slate-900">
          Teacher Communications
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Message your children's instructors directly regarding scheduled sessions.
        </p>
      </div>

      <ChatDashboard
        currentUserId={authUserId} // 🚀 True Auth UID
        currentUserRole="parent"
        contacts={contacts}
        loadingContacts={loading}
        onInitializeRoom={handleInitializeRoom}
        onRefreshRoster={loadParentRoster}
      />
    </div>
  )
}