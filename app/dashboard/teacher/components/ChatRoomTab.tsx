"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import ChatDashboard from '@/components/chat/ChatDashboard'
import { Contact } from '@/lib/types'

type ChatContact = Contact & { unread_count?: number }

interface ChatRoomTabProps {
  teacherId: string
}

export default function ChatRoomTab({ teacherId }: ChatRoomTabProps) {
  const [contacts, setContacts] = useState<ChatContact[]>([])
  const [loading, setLoading] = useState(true)

  async function loadTeacherRoster() {
    try {
      setLoading(true)
      const uniqueContactsMap = new Map<string, ChatContact>()

      // 1. Fetch Connected Parents via Bookings
      const { data: parentBookings, error: parentError } = await supabase
        .from('bookings')
        .select(`
          parent,
          parents:parent (id, name)
        `)
        .eq('teacher', teacherId)
        .eq('status', 'active')

      if (parentError) throw parentError

      parentBookings?.forEach((item: any) => {
        if (item.parents && !uniqueContactsMap.has(item.parent)) {
          uniqueContactsMap.set(item.parent, {
            contact_id: item.parents.id,
            contact_name: item.parents.name || 'Client Parent',
            contact_type: 'parent',
            existing_room_id: null,
            unread_count: 0
          })
        }
      })

      // 2. Fetch Connected Students via Bookings
      const { data: studentBookings, error: studentError } = await supabase
        .from('bookings')
        .select(`
          student,
          students:student (id, name)
        `)
        .eq('teacher', teacherId)
        .eq('status', 'active')

      if (studentError) throw studentError

      studentBookings?.forEach((item: any) => {
        if (item.students && !uniqueContactsMap.has(item.student)) {
          uniqueContactsMap.set(item.student, {
            contact_id: item.students.id,
            contact_name: item.students.name || 'Enrolled Student',
            contact_type: 'student',
            existing_room_id: null,
            unread_count: 0
          })
        }
      })

      const allConnectedIds = Array.from(uniqueContactsMap.keys())
      if (allConnectedIds.length === 0) {
        setContacts([])
        return
      }

      // 3. Find existing chat rooms matching this teacher
      const { data: rooms, error: roomError } = await supabase
        .from('chat_rooms')
        .select('id, parent_id, student_id')
        .eq('teacher_id', teacherId)

      if (roomError) throw roomError

      const activeRoomIds: string[] = []
      rooms?.forEach((room: any) => {
        // A room can either link a parent or a student to the teacher
        const targetId = room.parent_id || room.student_id
        const match = uniqueContactsMap.get(targetId)
        if (match) {
          match.existing_room_id = room.id
          activeRoomIds.push(room.id)
        }
      })

      // 4. Track Incoming Live Unread Counts
      if (activeRoomIds.length > 0) {
        const { data: unreadCounts, error: unreadError } = await supabase
          .from('chat_messages')
          .select('room_id')
          .is('read_at', null)
          .neq('sender_id', teacherId)
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
      console.error("Failed executing teacher contact populator engine:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (teacherId) loadTeacherRoster()
  }, [teacherId])

  // Spawns channels for parents or students dynamically depending on the selected profile row metadata
  async function handleInitializeRoom(contact: ChatContact): Promise<string | null> {
    try {
      const isParent = contact.contact_type === 'parent'
      
      const payload = {
        teacher_id: teacherId,
        parent_id: isParent ? contact.contact_id : null,
        student_id: !isParent ? contact.contact_id : null
      }

      const { data, error } = await supabase
        .from('chat_rooms')
        .insert([payload])
        .select()
        .single()

      if (error) throw error

      await loadTeacherRoster()
      return data.id
    } catch (err: any) {
      alert(`Could not initiate secure connection: ${err.message}`)
      return null
    }
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      <div>
        <h1 className="text-xl font-black tracking-tight text-slate-900">
          Communications Workspace
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Secure text messaging portal linked directly with parents and registered students.
        </p>
      </div>

      <ChatDashboard
        currentUserId={teacherId}
        currentUserRole="teacher"
        contacts={contacts}
        loadingContacts={loading}
        onInitializeRoom={handleInitializeRoom}
        onRefreshRoster={loadTeacherRoster}
      />
    </div>
  )
}