"use client"

import { useEffect, useState, useRef } from 'react'

interface ConfigurePageProps {
  sessionSubject?: string
  currentUserName: string
  userRole: 'teacher' | 'student' | 'parent' | null
  otherPartyName: string
  onBeginClass: () => void
}

export default function ConfigurePage({
  sessionSubject = "Live Classroom Session",
  currentUserName,
  userRole,
  otherPartyName,
  onBeginClass,
}: ConfigurePageProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [micLevel, setMicLevel] = useState<number>(0)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // 🎙️ Dynamic Audio Level Meter Initialization
  const startAudioMeter = (stream: MediaStream) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      const audioContext = new AudioContextClass()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)

      audioContextRef.current = audioContext
      analyserRef.current = analyser

      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)

      const updateMeter = () => {
        if (!analyserRef.current) return
        analyserRef.current.getByteFrequencyData(dataArray)
        let total = 0
        for (let i = 0; i < bufferLength; i++) {
          total += dataArray[i]
        }
        const average = total / bufferLength
        setMicLevel(Math.min(100, Math.floor((average / 128) * 100)))
        animationFrameRef.current = requestAnimationFrame(updateMeter)
      }
      updateMeter()
    } catch (e) {
      console.error("Audio Context processing denied or unsupported:", e)
    }
  }

  // 🛡️ Request hardware capabilities on Green Room mount
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setLocalStream(stream)
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        startAudioMeter(stream)
      })
      .catch((err) => console.error("Access permissions for media stream denied:", err))

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch((err) =>
          console.warn("AudioContext was already terminated safely:", err)
        )
      }
    }
  }, [])

  const handleStart = () => {
    // Safely release media tracks before handing control over to main classroom
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop())
    }
    onBeginClass()
  }

  return (
    <div className="w-screen h-screen bg-slate-900 text-white flex items-center justify-center p-6 font-sans">
      <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8 items-center">
        
        {/* VIDEO & MIC TESTING PANEL */}
        <div className="space-y-4">
          <div className="aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 relative shadow-2xl flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
            <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-700/50 text-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Camera Feed Online
            </div>
          </div>

          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-xs text-slate-400 font-bold tracking-wide uppercase">
              <span>Microphone Testing Input</span>
              <span className={micLevel > 5 ? "text-emerald-400 font-mono" : "text-slate-600"}>
                {micLevel > 5 ? 'Capturing Audio...' : 'Silent'}
              </span>
            </div>
            <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden w-full relative">
              <div
                style={{ width: `${micLevel}%` }}
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-75"
              />
            </div>
          </div>
        </div>

        {/* DETAILS & ACTION PANEL */}
        <div className="space-y-6">
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-black tracking-widest text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20 inline-block">
              Ready to Join Session
            </span>
            <h2 className="text-2xl font-black text-slate-100 tracking-tight">
              {sessionSubject}
            </h2>
            <p className="text-sm text-slate-400 font-medium">
              Please confirm your camera/microphone signals align correctly prior to connection engagement.
            </p>
          </div>

          <hr className="border-slate-800" />

          <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Joining As Identity:</span>
              <span className="font-bold text-slate-200 bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
                {currentUserName} ({userRole || 'User'})
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Target Participant:</span>
              <span className="font-bold text-slate-200">{otherPartyName}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStart}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-xs font-black uppercase tracking-wider rounded-xl transition duration-200 shadow-lg shadow-blue-600/10 cursor-pointer"
          >
            🚀 Begin Class Session Workspace
          </button>
        </div>

      </div>
    </div>
  )
}