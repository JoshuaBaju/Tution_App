"use client"
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface WhiteboardProps {
  roomId: string
  folderPath: string // Passed down from the parent page (e.g., "teacherID_parentID")
  isReadOnly?: boolean
}

export default function Whiteboard({ roomId, folderPath, isReadOnly = false }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)
  const channelRef = useRef<any>(null)
  
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState('#000000')
  const [lineWidth, setLineWidth] = useState(3)
  const [isSaving, setIsSaving] = useState(false)
  const lastPos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = canvas.parentElement?.clientWidth || 800
    canvas.height = canvas.parentElement?.clientHeight || 600

    const context = canvas.getContext('2d')
    if (!context) return
    context.lineCap = 'round'
    context.lineJoin = 'round'
    contextRef.current = context

    if (!isReadOnly) {
      const channel = supabase.channel(`room:${roomId}`, {
        config: { broadcast: { self: false } }
      })

      channel
        .on('broadcast', { event: 'draw' }, ({ payload }) => {
          drawOnCanvas(payload.prevX, payload.prevY, payload.currentX, payload.currentY, payload.color, payload.lineWidth)
        })
        .on('broadcast', { event: 'clear' }, () => {
          clearLocalCanvas()
        })
        .subscribe()

      channelRef.current = channel

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [roomId, isReadOnly])

  const drawOnCanvas = (pX: number, pY: number, cX: number, cY: number, strokeColor: string, strokeWidth: number) => {
    const ctx = contextRef.current
    if (!ctx) return
    ctx.beginPath()
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = strokeWidth
    ctx.moveTo(pX, pY)
    ctx.lineTo(cX, cY)
    ctx.stroke()
    ctx.closePath()
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isReadOnly) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    lastPos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current || isReadOnly) return
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const currentX = e.clientX - rect.left
    const currentY = e.clientY - rect.top
    const prevX = lastPos.current.x
    const prevY = lastPos.current.y

    drawOnCanvas(prevX, prevY, currentX, currentY, color, lineWidth)

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'draw',
        payload: { prevX, prevY, currentX, currentY, color, lineWidth }
      })
    }
    lastPos.current = { x: currentX, y: currentY }
  }

  const stopDrawing = () => setIsDrawing(false)
  const clearLocalCanvas = () => {
    const canvas = canvasRef.current
    const ctx = contextRef.current
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const handleClearAll = () => {
    if (isReadOnly) return
    clearLocalCanvas()
    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'clear', payload: {} })
    }
  }

  // 📷 Capture Canvas as a PNG Image blob and upload to Supabase Storage
  const saveWhiteboardSnapshot = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    setIsSaving(true)

    // Convert Canvas screen to Blob data
    canvas.toBlob(async (blob) => {
      if (!blob) {
        alert("Failed to capture whiteboard contents.")
        setIsSaving(false)
        return
      }

      // Generate a clean filename using the date format
      const dateString = new Date().toISOString().replace(/[:.]/g, '-')
      const fileName = `Whiteboard_${dateString}.png`
      const fullPath = `${folderPath}/${fileName}`

      // Upload the binary PNG data straight into the private bucket path
      const { error } = await supabase.storage
        .from('classroom-files')
        .upload(fullPath, blob, {
          contentType: 'image/png',
          upsert: true
        })

      if (error) {
        alert("Upload error: " + error.message)
      } else {
        alert(`Snapshot successfully saved as "${fileName}" inside your shared directory!`)
      }
      setIsSaving(false)
    }, 'image/png')
  }

  return (
    <div className="w-full h-full flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
      <div className="bg-slate-50 border-b border-slate-200 p-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-1 rounded-lg">
            {['#000000', '#ee2424', '#248cee', '#24ee59'].map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-5 h-5 rounded-md transition ${color === c ? 'ring-2 ring-offset-2 ring-blue-600' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <input type="range" min="1" max="15" value={lineWidth} onChange={(e) => setLineWidth(Number(e.target.value))} className="w-16 accent-blue-600"/>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleClearAll} className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-red-600 transition">Clear</button>
          <button 
            onClick={saveWhiteboardSnapshot} 
            disabled={isSaving}
            className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition disabled:bg-slate-300"
          >
            {isSaving ? 'Saving...' : 'Save Snapshot'}
          </button>
        </div>
      </div>
      <div className="flex-1 bg-white relative">
        <canvas ref={canvasRef} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} className="absolute inset-0 w-full h-full cursor-crosshair"/>
      </div>
    </div>
  )
}