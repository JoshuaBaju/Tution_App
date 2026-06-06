"use client"
import Link from 'next/link'
import { useState } from 'react'

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-blue-500 selection:text-white">
      
      {/* 1. FIXED STANDARD NAVIGATION BAR */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-6 lg:px-16 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 font-black text-blue-600 text-sm tracking-tighter uppercase">
          <span>🎓</span> Tuition Hero
        </div>
        
        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8 text-xs font-bold text-slate-500 tracking-wide uppercase">
          <a href="#features" className="hover:text-blue-600 transition">Features</a>
          <a href="#about" className="hover:text-blue-600 transition">About Us</a>
          <a href="#contact" className="hover:text-blue-600 transition">Contact</a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="px-4 py-2 text-xs font-black uppercase text-slate-600 hover:text-blue-600 transition">
            Log In
          </Link>
          <Link href="/signup" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition shadow-xs">
            Join as Hero
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 md:hidden text-slate-600">
          ☰
        </button>
      </nav>

      {/* Mobile Dropdown Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white p-6 space-y-4 flex flex-col text-xs font-bold uppercase tracking-wider text-slate-600">
          <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
          <a href="#about" onClick={() => setMobileMenuOpen(false)}>About Us</a>
          <a href="#contact" onClick={() => setMobileMenuOpen(false)}>Contact</a>
          <hr className="border-slate-100" />
          <Link href="/login" className="text-blue-600">Log In</Link>
          <Link href="/signup" className="text-blue-600">Sign Up</Link>
        </div>
      )}

      {/* 2. HERO SECTION WITH CLEAR PHOTO */}
      <header 
        className="relative bg-cover bg-center bg-no-repeat py-24 lg:py-36 border-b border-slate-200 px-4 flex items-center justify-center"
        style={{ 
          backgroundImage: `url('https://images.unsplash.com/photo-1580582932707-520aed937b7b?q=80&w=1600&auto=format&fit=crop')` 
        }}
      >
        {/* Text Container Card over the clear photo */}
        <div className="max-w-3xl w-full mx-auto bg-white/90 backdrop-blur-md p-8 sm:p-12 rounded-3xl shadow-2xl text-center space-y-6 border border-white/20">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black tracking-widest uppercase rounded-full border border-blue-100 mx-auto">
            🚀 Next-Generation 1-on-1 Mentorship
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 leading-tight">
            Supercharge Academic Growth with <span className="text-blue-600">Tuition Hero</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto font-medium leading-relaxed">
            The all-in-one virtual classroom terminal connecting ambitious students with elite educators. Integrated calendars, real-time live video portals, and safe material lockers.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link href="/signup" className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition transform hover:-translate-y-0.5">
              Get Started Free
            </Link>
            <Link href="/login" className="px-8 py-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-black text-xs uppercase tracking-wider rounded-xl shadow-xs transition transform hover:-translate-y-0.5">
              Enter Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* 3. FEATURES SECTION */}
      <section id="features" className="bg-white border-b border-slate-200/60 py-20 px-8">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-600">System Core Architecture</h3>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">Everything Needed to Excel</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 border border-slate-100 rounded-3xl bg-slate-50/50 space-y-3">
              <span className="text-2xl">🎥</span>
              <h4 className="font-black text-sm text-slate-800 tracking-tight">Live Video Classrooms</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">One-click portal access routes directly to internal real-time virtual rooms. No messy third-party codes required.</p>
            </div>
            <div className="p-6 border border-slate-100 rounded-3xl bg-slate-50/50 space-y-3">
              <span className="text-2xl">📂</span>
              <h4 className="font-black text-sm text-slate-800 tracking-tight">Isolated Material Lockers</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">Personalized directory instances allowing secure homework distribution and assignment management pathways.</p>
            </div>
            <div className="p-6 border border-slate-100 rounded-3xl bg-slate-50/50 space-y-3">
              <span className="text-2xl">📈</span>
              <h4 className="font-black text-sm text-slate-800 tracking-tight">Transparent Progress Indexes</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">Automatic calculation matrices tracking hourly payouts for teachers and complete session history reports for students.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. ABOUT US SECTION */}
      <section id="about" className="py-20 px-8 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="space-y-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Our Shared Mission</span>
          <h2 className="text-3xl font-black tracking-tight text-slate-900">Designed to bridge structural education gaps.</h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
            Tuition Hero was founded to streamline the overhead of supplemental learning ecosystems. By eliminating friction between automated administrative pipelines, educators can focus solely on what matters most: helping students hit breakthrough performance milestones.
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-600 to-indigo-800 aspect-video rounded-3xl shadow-xl flex items-center justify-center p-8 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
          <p className="text-xl font-mono font-black italic tracking-tighter uppercase opacity-30 select-none">Tuition_Hero_v1.0</p>
        </div>
      </section>

      {/* 5. CONTACT US SECTION */}
      <section id="contact" className="bg-slate-900 text-white py-20 px-8 border-t border-slate-800">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-400">Get In Touch</h3>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Have operational questions? Reach out to support.</h2>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              Our integration desk operates around the clock to assist both academic centers and independent freelance tutors with setup parameters.
            </p>
            <div className="pt-4 text-xs font-mono space-y-1.5 text-slate-300">
              <p>✉️ system-ops@tuitionhero.app</p>
              <p>📞 +1 (800) 555-HERO</p>
            </div>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); alert("Message queued successfully!"); }} className="space-y-3 bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-sm">
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Email Address</label>
              <input required type="email" placeholder="name@example.com" className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs outline-none focus:border-blue-500 transition text-white placeholder:text-slate-500" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Message Content</label>
              <textarea required rows={3} placeholder="How can our technical terminal assist your learning pipeline?" className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs outline-none focus:border-blue-500 transition text-white placeholder:text-slate-500 resize-none" />
            </div>
            <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 font-black text-xs uppercase tracking-wider rounded-xl transition text-center shadow-md">
              Send Transmission
            </button>
          </form>
        </div>
      </section>

      {/* 6. FOOTER */}
      <footer className="bg-slate-950 text-slate-600 text-[10px] font-bold uppercase tracking-wider py-6 px-8 text-center border-t border-slate-900">
        © {new Date().getFullYear()} Tuition Hero Systems Inc. All processing infrastructure secured via RLS parameters.
      </footer>

    </div>
  )
}