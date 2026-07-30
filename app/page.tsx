"use client"

import { useState } from 'react'
import Link from 'next/link'
import HeroGraphic from '../components/graphics/HeroGraphic'

export default function LandingPage() {
  const [activeSlide, setActiveSlide] = useState(0)
  const [hoveredButton, setHoveredButton] = useState<string | null>(null)

  // Slide content data (Heading and Body text for each block)
  const slides = [
    {
      heading: "Telepathic Homework Sync",
      text: "Our advanced methodology utilizes subconscious synchronization to transmit assignments instantly. This cosmic integration completely obfuscates the need for physical portals.",
    },
    {
      heading: "Gravity-Defying Focus Pods",
      text: "SWe introduce architectural reconfiguration using anti-gravity chambers. This specialized isolation eliminates external impediments, resulting in cognitive optimization.",
    },
    {
      heading: "Time-Dilation Cram Sessions",
      text: "Our temporal manipulation strategy paradoxically decelerates classroom clocks. This multifaceted approach allows for comprehensive exam preparation in mere seconds.",
    },
  ]

  const totalSlides = slides.length

  const nextSlide = () => setActiveSlide((prev) => (prev + 1) % totalSlides)
  const prevSlide = () => setActiveSlide((prev) => (prev - 1 + totalSlides) % totalSlides)

  return (
    <div className="min-h-screen bg-white text-[#1e1e1e] antialiased">
      
      {/* HEADER / NAVIGATION */}
      <header 
        style={{ 
          background: 'linear-gradient(90deg, rgba(0, 52, 130, 0.85) 0%, rgba(0, 11, 28, 0.90) 100%)',
          borderColor: 'rgba(2, 9, 21, 0.4)',
          borderWidth: '1px'
        }} 
        className="sticky top-0 z-50 px-6 md:px-12 flex justify-between items-center shadow-lg backdrop-blur-md select-none h-14 md:h-16 transition-all"
      >
        {/* LOGO & BRAND */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center flex-shrink-0">
            <img 
              src="/logo_for_navbar.png" 
              alt="logo_for_navbar" 
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="font-['MuseoModerno'] text-xl md:text-[22px] text-[#ffffff] font-normal leading-none uppercase tracking-tight">
              METIS
            </span>

            <div className="flex flex-col font-['Muna'] text-[8px] md:text-[9px] text-[#ffffff]/90 font-normal tracking-widest leading-[1.1] uppercase">
              <span>education</span>
              <span>platform</span>
            </div>
          </div>
        </div>

        {/* MID NAVIGATION AREA */}
        <nav className="hidden md:flex flex-1 items-center justify-evenly mx-12 font-['Muna'] font-bold text-xs tracking-widest text-white">
          <a 
            href="#features" 
            className="hover:text-[#FADD04] transition-colors duration-300"
          >
            FEATURES
          </a>
          <a 
            href="#about" 
            className="hover:text-[#FADD04] transition-colors duration-300"
          >
            ABOUT US
          </a>
          <a 
            href="#contact" 
            className="hover:text-[#FADD04] transition-colors duration-300"
          >
            CONTACT
          </a>
        </nav>

        {/* CONTROLS AREA */}
        <div className="flex items-center gap-6 flex-shrink-0">
          <div className="hidden md:block h-6 w-[1.5px] bg-white/20 self-center" />

          <div className="flex items-center gap-5 font-['Muna'] text-xs font-bold tracking-wider">
            <Link 
              href="/login"
              onMouseEnter={() => setHoveredButton('login')}
              onMouseLeave={() => setHoveredButton(null)}
              style={{ color: hoveredButton === 'login' ? '#FADD04' : '#ffffff' }}
              className="transition-colors duration-300 bg-transparent border-none outline-none cursor-pointer uppercase"
            >
              LOG IN
            </Link>
            <Link 
              href="/signup"
              onMouseEnter={() => setHoveredButton('signup')}
              onMouseLeave={() => setHoveredButton(null)}
              style={{ color: hoveredButton === 'signup' ? '#FADD04' : '#ffffff' }}
              className="transition-colors duration-300 bg-transparent border-none outline-none cursor-pointer uppercase"
            >
              SIGN UP
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 py-8 md:pt-8 grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-8">
          <h1 className="font-['Oreglas'] text-6xl md:text-[75px] text-[#003482] leading-none tracking-tight font-normal">
            The blahh blah <br />is hereee .
          </h1>
          
          <p className="font-['Amiri_Quran_Colored'] text-[20px] text-gray-600 leading-relaxed max-w-xl font-normal">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <Link 
              href="/signup"
              className="bg-[#FADD04] text-black font-[#Muna] font-bold border-2 border-black rounded-[25px] px-8 py-3.5 shadow-sm hover:opacity-90 active:scale-[0.98] transition-all text-sm uppercase tracking-wider inline-block text-center"
            >
              get started
            </Link>
            <Link 
              href="/login"
              className="bg-[#FADD04] text-black font-[#Muna] font-bold border-2 border-black rounded-[25px] px-8 py-3.5 shadow-sm hover:opacity-90 active:scale-[0.98] transition-all text-sm uppercase tracking-wider inline-block text-center"
            >
              enter dashboard
            </Link>
          </div>
        </div>
        
        <div className="w-full max-w-[480px] mx-auto aspect-square flex items-center justify-center p-2">
          <HeroGraphic />
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className="scroll-mt-20 bg-gray-50 pt-3 pb-11 border-t border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 md:px-12 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-4">
            <span className="text-xl font-['Muna'] font-black tracking-widest text-blue-600 uppercase ml-10">FEATURES</span>
            <h2 className="md:text-5xl font-['Oreglas'] text-[#003482] leading-tight font-normal max-w-100">
              Dont Ask To list Each We know we the Best .
            </h2>
          </div>
          <div>
            <p className="font-['Muna'] text-gray-600 leading-relaxed md:text-lg max-w-200 -ml-30">
              The institutionalization of our technological paradigm paradoxically obfuscates the fundamental characteristics of administrative efficiency. This comprehensive transformation inadvertently exacerbates existing vulnerabilities, rendering conventional methodology completely obsolete. Consequently, rigorous analytical synchronization becomes an absolute prerequisite for operational optimization. While architectural reconfiguration ostensibly facilitates seamless integration, it simultaneously engenders unprecedented bureaucratic impediments. 
            </p>
          </div>
        </div>
      </section>

      {/* INTERACTIVE CAROUSEL / SLIDER */}
      <section 
        style={{ 
          background: 'linear-gradient(90deg, rgba(0, 52, 130, 0.85) 0%, rgba(0, 11, 28, 0.90) 100%)' 
        }}
        className="text-white py-16 md:py-6 relative overflow-hidden transition-all duration-500 select-none"
      >
        {/* LEFT FULL-HEIGHT ARROW SIDEBAR */}
        <button 
          onClick={prevSlide}
          aria-label="Previous Slide"
          className="absolute left-0 top-0 bottom-0 w-5 md:w-10 z-20 flex items-center justify-center bg-black/15 hover:bg-[#FADD04] text-white hover:text-black transition-colors duration-300 group cursor-pointer"
        >
          <span className="text-xl md:text-2xl font-black group-hover:scale-125 transition-transform">
            &#8249;
          </span>
        </button>

        {/* RIGHT FULL-HEIGHT ARROW SIDEBAR */}
        <button 
          onClick={nextSlide}
          aria-label="Next Slide"
          className="absolute right-0 top-0 bottom-0 w-5 md:w-10 z-20 flex items-center justify-center bg-black/15 hover:bg-[#FADD04] text-white hover:text-black transition-colors duration-300 group cursor-pointer"
        >
          <span className="text-xl md:text-2xl font-black group-hover:scale-125 transition-transform">
            &#8250;
          </span>
        </button>

        {/* MAIN CAROUSEL CONTENT BLOCK */}
        <div className="max-w-4xl mx-auto px-10 md:px-16 text-center space-y-6 relative z-10">
          <span className="text-2xl font-['Muna'] font-black tracking-widest text-[#FADD04] uppercase block">
            {slides[activeSlide].heading}
          </span>
          
          <div className="min-h-[120px] flex items-center justify-center">
            <p className="text-lg md:text-xl font-['Muna'] font-medium max-w-2xl mx-auto leading-relaxed">
              {slides[activeSlide].text}
            </p>
          </div>

          <div className="flex justify-center items-center gap-3 pt-4">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveSlide(idx)}
                className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                  activeSlide === idx ? 'w-8 bg-[#FADD04]' : 'w-2.5 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* MISSION & VISION / ABOUT US */}
      <section id="about" className="scroll-mt-10 max-w-5xl mx-auto px-6 pb-12 space-y-10">
        
        {/* OUR MISSION BLOCK */}
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-start">
          <div className="space-y-3 mt-0 pt-20">
            <span className="text-xl font-['Muna'] font-black tracking-widest text-[#003482] uppercase block leading-none">
              ABOUT US
            </span>
            <p className="font-['Muna'] text-gray-700 text-xl leading-relaxed">
              Our methodology uses psychic synchronization for exam optimization. We inject textbook knowledge directly into sleeping brains, eliminating all academic impediments. This comprehensive process facilitates immediate genius, making physical studying completely obsolete.
            </p>
          </div>
          
          <div className="w-full flex justify-center md:justify-end">
            <img 
              src="/design/our-mission.png" 
              alt="Our Mission"
              className="w-full max-w-[380px] h-auto object-contain block"
            />
          </div>
        </div>

        {/* OUR VISION BLOCK */}
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-start pt-4">
          <div className="w-full flex justify-center md:justify-start">
            <img 
              src="/design/our-vision.png" 
              alt="Our Vision"
              className="w-full max-w-[380px] h-auto object-contain block"
            />
          </div>

          <div className="space-y-3 md:pt-2">
            <p className="font-['Muna'] text-gray-700 text-xl leading-relaxed">
              We envision a strange paradigm where alien technology obfuscates classrooms. Through cosmic manipulation, we will trigger instant intellectual proliferation. This wild reconfiguration will render teachers useless through chaotic brainwave implementation.
            </p>
          </div>
        </div>

      </section> 

      {/* CONTACT / FOOTER */}
      <footer id="contact" className="scroll-mt-20 bg-[#0b1a30] text-white pt-16 pb-8 px-6 md:px-12">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 pb-12 border-b border-white/10">
          <div className="space-y-4">
            <span className="text-xs font-['Muna'] font-bold text-[#FADD04] tracking-widest uppercase">GET IN TOUCH</span>
            <h2 className="text-2xl md:text-3xl font-['Oreglas'] font-normal tracking-tight">
              Have operational questions?<br />Reach out to support.
            </h2>
            <p className="font-['Muna'] text-gray-400 text-sm leading-relaxed max-w-sm">
              Our integration desk operates around the clock to assist both academic centers and independent freelance tutors with setup parameters.
            </p>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="bg-[#162a45] p-6 rounded-xl border border-white/5 space-y-4 shadow-xl">
            <div className="space-y-1.5">
              <label className="text-[10px] font-['Muna'] font-bold uppercase tracking-wider text-gray-400">Email Address</label>
              <input 
                type="email" 
                placeholder="name@domain.com"
                className="w-full bg-[#0b1a30] border border-white/10 rounded-lg px-4 py-2.5 text-sm font-['Muna'] focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-['Muna'] font-bold uppercase tracking-wider text-gray-400">Message Content</label>
              <textarea 
                rows={3}
                placeholder="Your transmission text..."
                className="w-full bg-[#0b1a30] border border-white/10 rounded-lg px-4 py-2.5 text-sm font-['Muna'] focus:outline-none focus:border-blue-500 transition-colors resize-none"
              />
            </div>
            <button className="w-full bg-white text-[#0b1a30] font-['Muna'] font-bold text-xs py-3 rounded-lg hover:bg-gray-100 active:scale-[0.99] transition-all tracking-widest uppercase">
              SEND TRANSMISSION
            </button>
          </form>
        </div>

        <div className="max-w-6xl mx-auto pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500 font-['Muna']">
          <p>&copy; {new Date().getFullYear()} Metis Education Platform. All rights reserved.</p>
          <p className="tracking-widest uppercase text-[10px]">POWERED BY MINDLESS METIS</p>
        </div>
      </footer>

    </div>
  )
}