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

    // 1. Sign the user into Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert("Login Failed: " + error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const userId = data.user.id

      // 2. Cross-check Step A: Are they a Parent?
      const { data: parentData } = await supabase
        .from('parents')
        .select('id')
        .eq('id', userId)
        .maybeSingle() // Prevents throwing an error if not found

      if (parentData) {
        alert("Welcome back, Parent!")
        router.push('/dashboard/parent')
        setLoading(false)
        return
      }

      // 3. Cross-check Step B: Are they a Teacher?
      const { data: teacherData } = await supabase
        .from('teachers')
        .select('id')
        .eq('id', userId)
        .maybeSingle()

      if (teacherData) {
        alert("Welcome back, Teacher!")
        router.push('/dashboard/teacher')
        setLoading(false)
        return
      }

      // 4. Cross-check Step C: Are they a Student?
      const { data: studentData } = await supabase
        .from('students') // Assumes your student table name is lowercase 'students'
        .select('id')
        .eq('id', userId)
        .maybeSingle()

      if (studentData) {
        alert("Welcome back, Student!")
        router.push('/dashboard/student')
        setLoading(false)
        return
      }

      // Fallback if auth account exists but profile creation failed during signup
      alert("Logged in successfully, but no Parent, Teacher, or Student profile was found.")
    }
    
    setLoading(false)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="w-full max-w-md p-8 bg-white shadow-xl rounded-2xl border border-slate-200">
        <h1 className="text-3xl font-black mb-2 text-center text-blue-600">Welcome Back</h1>
        <p className="text-center text-slate-500 mb-6">Log into your Tuition Hero account</p>

        <div className="space-y-4">
          <input 
            type="email" 
            placeholder="Email Address" 
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
          />
          <input 
            type="password" 
            placeholder="Password" 
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
          />
          
          <button 
            onClick={handleLogin} 
            disabled={loading} 
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-lg hover:bg-blue-700 transition disabled:bg-slate-400"
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>

          <p className="text-center text-sm text-slate-500 mt-4">
            Don't have an account?{' '}
            <button type="button" onClick={() => router.push('/signup')} className="text-blue-600 font-bold hover:underline">
              Sign Up
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}