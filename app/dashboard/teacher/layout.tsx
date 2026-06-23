// app/dashboard/teacher/layout.tsx
"use client"
import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import NotificationCenter from '@/components/NotificationCenter'

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [teacherName, setTeacherName] = useState<string>('')
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(() => {
    let mounted = true

    async function checkUserSession() {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error || !session?.user) {
        if (mounted) {
          setCheckingAuth(false)
          router.push('/login')
        }
        return
      }

      // Fetch teacher custom profile name
      const { data: profile } = await supabase
        .from('teachers')
        .select('id, name')
        .eq('id', session.user.id)
        .maybeSingle()

      if (mounted) {
        setTeacherId(session.user.id)
        if (profile) setTeacherName(profile.name)
        setCheckingAuth(false)
      }
    }

    checkUserSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      if (session?.user) {
        setTeacherId(session.user.id)
        setCheckingAuth(false)
      } else if (event === 'SIGNED_OUT') {
        setTeacherId(null)
        setCheckingAuth(false)
        router.push('/login')
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [router])

  if (checkingAuth || !teacherId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 space-y-3">
        <span className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Restoring Teacher Session...</p>
      </div>
    )
  }

  return (
    <div className="w-screen h-screen flex bg-slate-50 text-slate-900 antialiased selection:bg-blue-600 selection:text-white overflow-hidden">
      
      {/* PERSISTENT STRUCTURAL SIDEBAR */}
      <aside className="w-full sm:w-64 bg-white border-b sm:border-b-0 sm:border-r border-slate-200 flex flex-col justify-between shrink-0 z-20">
        <div className="p-5 sm:p-6">
          <div className="mb-6 hidden sm:block">
            <h1 className="text-xl font-black text-blue-600 tracking-tight">Tutor Terminal</h1>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-1">Hero Classroom v1.0</p>
          </div>
          
          {/* Layout slots down into children pages for navigational sync tabs */}
          {children}
        </div>

        <div className="p-4 border-t border-slate-100 hidden sm:block space-y-3">
          <div className="text-center">
            <p className="text-[10px] font-mono text-slate-400 truncate">ID: {teacherId.slice(0, 8)}...</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut()
              router.push('/login')
            }}
            className="w-full text-center py-2.5 text-xs font-black uppercase tracking-wider text-red-500 hover:bg-red-50 rounded-xl transition"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* VIEWPORT CANVAS SHELL */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* UPPER REALTIME UNIFIED STATUS BANNER */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 sm:px-8 flex items-center justify-between shrink-0">
          <span className="text-xs font-bold text-slate-400">
            Welcome back, Instructor <span className="text-slate-700">{teacherName || 'Educator'}</span>
          </span>
          
          <div className="flex items-center gap-3">
            {/* Realtime Bell Drops Container */}
            <NotificationCenter userId={teacherId} />

            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-600 shadow-2xs">
              {teacherName ? teacherName.charAt(0).toUpperCase() : 'T'}
            </div>
          </div>
        </header>

        {/* CONTROLLER TARGET RENDERING SLOT */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-8" id="teacher-main-viewport">
          {/* Sub tabs context mounts here seamlessly via context channels */}
        </main>
      </div>

    </div>
  )
}