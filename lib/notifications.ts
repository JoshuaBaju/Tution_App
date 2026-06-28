// lib/notifications.ts
import { supabase } from './supabase'

export interface SendNotificationPayload {
  userId: string
  title: string
  description: string
  category: 'chat' | 'session' | 'feedback' | 'system'
  linkTo?: string | null
}

/**
 * Dispatches an internal real-time alert row targeting a specific workspace actor.
 */
export async function sendNotification({
  userId,
  title,
  description,
  category,
  linkTo = null
}: SendNotificationPayload) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert([
        {
          user_id: userId,
          title,
          description,
          category,
          link_to: linkTo,
          is_read: false
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('❌ Failed to write alert log row:', error.message)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (err) {
    console.error('❌ Notification utility execution crash:', err)
    return { success: false, error: err }
  }
}