"use client"
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
// 🚀 IMPORT: Grabs the full layout workspace from your components folder
import BookingProcedure from '../components/BookingProcedureTab'

export default function BookingPage() {
  const router = useRouter()
  const [parentId, setParentId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function verifySession() {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        router.push('/login')
        return
      }

      // Grab the parent database record ID to fulfill the prop requirement
      const { data: parentProfile, error: dbError } = await supabase
        .from('parents')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()

      if (dbError || !parentProfile) {
        router.push('/login')
        return
      }

      setParentId(parentProfile.id)
      setLoading(false)
    }

    verifySession()
  }, [router])

  if (loading) {
    return (
      <div className="w-screen h-screen bg-slate-50 flex items-center justify-center">
        <span className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-10">
      <div className="max-w-5xl mx-auto">
        
        {/* 🚀 FIXED: Renders the entire dashboard workspace setup with parentId passed down */}
        <BookingProcedure parentId={parentId} />
        
      </div>
    </div>
  )
}