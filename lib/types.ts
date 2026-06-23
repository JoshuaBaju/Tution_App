export interface Contact {
  contact_id: string
  contact_name: string
  contact_type: 'student' | 'parent' | 'teacher'
  existing_room_id: string | null
}

export interface Message {
  id: string
  room_id: string
  sender_id: string
  sender_role: 'teacher' | 'student' | 'parent'
  message: string
  created_at: string
}

export interface ChatDashboardProps {
  currentUserId: string
  currentUserRole: 'teacher' | 'student' | 'parent'
}