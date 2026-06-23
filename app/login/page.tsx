"use client"
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    if (e) e.preventDefault()
    setLoading(true)

    if (!email || !password) {
      alert("Please enter both email and password.")
      setLoading(false)
      return
    }

    try {
      // 1. Sign the user into Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        alert("Login Failed: " + error.message)
        setLoading(false)
        return
      }

      if (data?.user) {
        const userEmail = data.user.email

        // 2. Cross-check Step A: Are they a Parent?
        const { data: parentData } = await supabase
          .from('parents')
          .select('id')
          .eq('email', userEmail)
          .maybeSingle() 

        if (parentData) {
          router.push('/dashboard/parent')
          return
        }

        // 3. Cross-check Step B: Are they a Teacher?
        const { data: teacherData } = await supabase
          .from('teachers')
          .select('id')
          .eq('email', userEmail)
          .maybeSingle()

        if (teacherData) {
          router.push('/dashboard/teacher')
          return
        }

        // 4. Cross-check Step C: Are they a Student?
        const { data: studentData } = await supabase
          .from('students') 
          .select('id')
          .eq('email', userEmail)
          .maybeSingle()

        if (studentData) {
          router.push('/dashboard/student')
          return
        }

        // Fallback if auth account exists but profile creation failed during signup
        alert("Logged in successfully, but no matching profile role was found.")
      }
    } catch (err) {
      console.error("Unexpected authentication error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="w-full max-w-md p-8 bg-white shadow-xl rounded-2xl border border-slate-200">
        <h1 className="text-3xl font-black mb-2 text-center text-blue-600">Welcome Back</h1>
        <p className="text-center text-slate-500 mb-6">Log into your Tuition Hero account</p>

        {/* Wrapped in a semantic form for instant desktop/mobile accessibility */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 pl-1">Email Address</label>
            <input 
              type="email" 
              placeholder="name@domain.com" 
              className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 pl-1">Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required
            />
          </div>
          
          <button 
            type="submit"
            disabled={loading} 
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-lg hover:bg-blue-700 transition disabled:bg-slate-400 mt-2 shadow-md shadow-blue-600/10"
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>

          <p className="text-center text-sm text-slate-500 mt-4">
            Don't have an account?{' '}
            <button type="button" onClick={() => router.push('/signup')} className="text-blue-600 font-bold hover:underline">
              Sign Up
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}