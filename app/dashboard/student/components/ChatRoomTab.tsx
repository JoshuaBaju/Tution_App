"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import ChatDashboard from '@/components/chat/ChatDashboard'
import { Contact } from '@/lib/types'

type ChatContact = Contact & { unread_count?: number }

interface ChatRoomTabProps {
  studentId: string
}

export default function ChatRoomTab({ studentId }: ChatRoomTabProps) {
  const [contacts, setContacts] = useState<ChatContact[]>([])
  const [loading, setLoading] = useState(true)
  const [authUserId, setAuthUserId] = useState<string | null>(null) // 💡 Track real Auth ID

  async function loadStudentRoster() {
    try {
      // 1. Get the actual authenticated user ID to fix the message direction bug
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.id) {
        setAuthUserId(session.user.id)
      }

      // 2. Pull teachers where a booking exists for this specific student profile and is confirmed
      const { data: bookings, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          teacher,
          teachers:teacher (id, name)
        `)
        .eq('student', studentId)
        .eq('status', 'confirmed')

      if (bookingError) throw bookingError

      // Deduplicate course instructors into our contact map structures
      const uniqueContactsMap = new Map<string, ChatContact>()
      bookings?.forEach((item: any) => {
        if (item.teachers && !uniqueContactsMap.has(item.teacher)) {
          uniqueContactsMap.set(item.teacher, {
            contact_id: item.teachers.id,
            contact_name: item.teachers.name || 'Class Instructor',
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

      // 3. Query chat spaces existing for these teachers linked to this student
      const { data: rooms, error: roomError } = await supabase
        .from('chat_rooms')
        .select('id, teacher_id')
        .eq('student_id', studentId)
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

      // 4. Query live incoming unread tallies using the true Auth ID
      if (activeRoomIds.length > 0 && session?.user?.id) {
        const { data: unreadCounts, error: unreadError } = await supabase
          .from('chat_messages')
          .select('room_id')
          .is('read_at', null)
          .neq('sender_id', session.user.id) // 💡 Compare against real auth UID
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
      console.error("Failed executing student contact matrix pipeline:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (studentId) loadStudentRoster()
  }, [studentId])

  // Allows a student to construct a fresh row line if their parent hasn't created one yet
  async function handleInitializeRoom(contact: ChatContact): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .insert([
          {
            teacher_id: contact.contact_id,
            student_id: studentId
          }
        ])
        .select()
        .single()

      if (error) throw error

      await loadStudentRoster()
      return data.id
    } catch (err: any) {
      alert(`Could not initiate secure connection: ${err.message}`)
      return null
    }
  }

  // Guard clause to prevent loading the dashboard before the Auth ID resolves
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
          Study & Lessons Help
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Ask questions or send work directly to your confirmed course instructors.
        </p>
      </div>

      <ChatDashboard
        currentUserId={authUserId} // 🚀 PASSING THE REAL AUTH ID HERE
        currentUserRole="student"
        contacts={contacts}
        loadingContacts={loading}
        onInitializeRoom={handleInitializeRoom}
        onRefreshRoster={loadStudentRoster}
      />
    </div>
  )
}