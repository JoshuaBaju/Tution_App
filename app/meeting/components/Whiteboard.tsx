"use client"

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface WhiteboardProps {
  roomId: string
  folderPath: string
  isReadOnly?: boolean
}

type Tool = 'select' | 'move' | 'brush' | 'laser' | 'shape' | 'text'
type SelectionType = 'object' | 'lasso'
type BrushSubTool = 'pen' | 'marker' | 'highlighter' | 'eraser'
type ShapeType = 'rectangle' | 'oval' | 'triangle' | 'line'

interface VectorElement {
  id: string
  type: 'stroke' | 'shape' | 'image' | 'text'
  subTool?: BrushSubTool
  shapeType?: ShapeType
  points?: { x: number; y: number }[]
  x: number
  y: number
  width: number
  height: number
  color: string
  lineWidth: number
  rotation: number
  src?: string
  textValue?: string
  fontSize?: number
  fontStyle?: string
}

interface LaserPoint {
  x: number
  y: number
  time: number
}

export default function Whiteboard({ roomId, folderPath, isReadOnly = false }: WhiteboardProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const channelRef = useRef<any>(null)
  const isChannelReady = useRef<boolean>(false)

  // Tool states
  const [activeTool, setActiveTool] = useState<Tool>('select')
  const [selectionMode, setSelectionMode] = useState<SelectionType>('object')
  const [activeBrush, setActiveBrush] = useState<BrushSubTool>('pen')
  const [activeShape, setActiveShape] = useState<ShapeType>('rectangle')
  const [activeMenu, setActiveMenu] = useState<Tool | null>(null)

  // Style states
  const [color, setColor] = useState('#000000')
  const [lineWidth, setLineWidth] = useState(3)
  const [fontSize, setFontSize] = useState(24)
  const [fontStyle, setFontStyle] = useState<'normal' | 'bold' | 'italic'>('normal')

  // Viewport transform
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const scaleRef = useRef(1)
  const panRef = useRef({ x: 0, y: 0 })

  useEffect(() => { scaleRef.current = scale }, [scale])
  useEffect(() => { panRef.current = pan }, [pan])

  // Canvas data
  const [elements, setElements] = useState<VectorElement[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [clipboard, setClipboard] = useState<VectorElement[] | null>(null)

  // Figma-Style Canvas Native Text Configuration State
  const [textInputConfig, setTextInputConfig] = useState<{
    worldX: number;
    worldY: number;
    screenX: number;
    screenY: number;
  } | null>(null)
  const [liveTextValue, setLiveTextValue] = useState('')

  // Interaction
  const [isInteracting, setIsInteracting] = useState(false)
  const [interactionMode, setInteractionMode] = useState<'draw' | 'pan' | 'transform' | 'lasso' | 'none'>('none')
  const [transformHandle, setTransformHandle] = useState<string | null>(null)

  // Laser paths and trails
  const [laserPaths, setLaserPaths] = useState<LaserPoint[][]>([])
  const [lassoPoints, setLassoPoints] = useState<{ x: number; y: number }[]>([])
  const [localLaserPos, setLocalLaserPos] = useState<{ x: number; y: number } | null>(null)
  const [remoteLaserPointer, setRemoteLaserPointer] = useState<{ x: number; y: number } | null>(null)
  const remoteLaserLastTime = useRef<number>(0)

  // Stable refs for real-time threads
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map())
  const startTrackPos = useRef({ x: 0, y: 0 })
  const startPanOffset = useRef({ x: 0, y: 0 })
  const initialElementsState = useRef<Map<string, {
    x: number; y: number; width: number; height: number; rotation: number; points?: { x: number; y: number }[]
  }>>(new Map())
  const activeElementId = useRef<string | null>(null)
  
  const elementsRef = useRef<VectorElement[]>([])
  const selectedIdsRef = useRef<string[]>([])
  const interactionModeRef = useRef<'draw' | 'pan' | 'transform' | 'lasso' | 'none'>('none')
  const transformHandleRef = useRef<string | null>(null)
  const activeBrushRef = useRef<BrushSubTool>('pen')
  const activeToolRef = useRef<Tool>('select')
  const activeShapeRef = useRef<ShapeType>('rectangle')
  const colorRef = useRef('#000000')
  const lineWidthRef = useRef(3)
  const lassoPointsRef = useRef<{ x: number; y: number }[]>([])
  const lastLaserBroadcastTime = useRef<number>(0)

  useEffect(() => { elementsRef.current = elements }, [elements])
  useEffect(() => { selectedIdsRef.current = selectedIds }, [selectedIds])
  useEffect(() => { interactionModeRef.current = interactionMode }, [interactionMode])
  useEffect(() => { transformHandleRef.current = transformHandle }, [transformHandle])
  useEffect(() => { activeBrushRef.current = activeBrush }, [activeBrush])
  useEffect(() => { activeToolRef.current = activeTool }, [activeTool])
  useEffect(() => { activeShapeRef.current = activeShape }, [activeShape])
  useEffect(() => { colorRef.current = color }, [color])
  useEffect(() => { lineWidthRef.current = lineWidth }, [lineWidth])
  useEffect(() => { lassoPointsRef.current = lassoPoints }, [lassoPoints])

  // ─── Unified Coordinate Conversion Engine ──────────────────────────────────
  
  const getCanvasRelativeCoords = (e: React.MouseEvent | MouseEvent | React.DragEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0, screenX: 0, screenY: 0 }
    const rect = canvas.getBoundingClientRect()

    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top

    // For text overlay positioning we need coords relative to the container div,
    // not the canvas element, since the textarea uses position:absolute in containerRef.
    const containerRect = containerRef.current?.getBoundingClientRect() ?? rect
    const containerX = e.clientX - containerRect.left
    const containerY = e.clientY - containerRect.top

    return {
      x: screenX * (canvas.width / (rect.width || 1)) / (window.devicePixelRatio || 1),
      y: screenY * (canvas.height / (rect.height || 1)) / (window.devicePixelRatio || 1),
      screenX: containerX,
      screenY: containerY,
    }
  }

  const getPointsInWorldSpace = (canvasX: number, canvasY: number, s = scaleRef.current, p = panRef.current) => ({
    x: (canvasX - p.x) / s,
    y: (canvasY - p.y) / s,
  })

  // ─── Geometry and Bounding Box Recomputation ──────────────────────────────

  const getStrokeBounds = (points: { x: number; y: number }[], lw: number) => {
    if (points.length === 0) return { x: 0, y: 0, width: 1, height: 1 }
    let minX = points[0].x, maxX = points[0].x
    let minY = points[0].y, maxY = points[0].y
    points.forEach(p => {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
    })
    const pad = Math.max(lw, 8)
    return {
      x: minX - pad, y: minY - pad,
      width: Math.max(12, maxX - minX + pad * 2),
      height: Math.max(12, maxY - minY + pad * 2),
    }
  }

  const distSeg = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
    const dx = x2 - x1, dy = y2 - y1
    if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1)
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)))
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
  }

  const getElementAtPosition = (worldX: number, worldY: number, els: VectorElement[]): VectorElement | null => {
    const s = scaleRef.current
    const thresh = 8 / s
    
    for (let i = els.length - 1; i >= 0; i--) {
      const el = els[i]
      const cx = el.x + el.width / 2
      const cy = el.y + el.height / 2
      const rad = (-el.rotation * Math.PI) / 180
      const rx = (worldX - cx) * Math.cos(rad) - (worldY - cy) * Math.sin(rad) + cx
      const ry = (worldX - cx) * Math.sin(rad) + (worldY - cy) * Math.cos(rad) + cy

      if (el.type === 'shape') {
        if (el.shapeType === 'line') {
          if (distSeg(rx, ry, el.x, el.y, el.x + el.width, el.y + el.height) <= Math.max(el.lineWidth, thresh)) return el
        } else if (el.shapeType === 'triangle') {
          const x1 = el.x + el.width / 2, y1 = el.y
          const x2 = el.x, y2 = el.y + el.height
          const x3 = el.x + el.width, y3 = el.y + el.height
          if (distSeg(rx, ry, x1, y1, x2, y2) <= thresh || 
              distSeg(rx, ry, x2, y2, x3, y3) <= thresh || 
              distSeg(rx, ry, x3, y3, x1, y1) <= thresh) return el
        } else if (el.shapeType === 'oval') {
          const rX = Math.abs(el.width / 2), rY = Math.abs(el.height / 2)
          if (rX > 0 && rY > 0) {
            const val = ((rx - cx) ** 2) / (rX ** 2) + ((ry - cy) ** 2) / (rY ** 2)
            if (Math.abs(val - 1) <= (thresh / Math.min(rX, rY))) return el
          }
        } else if (el.shapeType === 'rectangle') {
          const l = Math.min(el.x, el.x + el.width), r = Math.max(el.x, el.x + el.width)
          const t = Math.min(el.y, el.y + el.height), b = Math.max(el.y, el.y + el.height)
          if ((Math.abs(rx - l) <= thresh || Math.abs(rx - r) <= thresh) && ry >= t && ry <= b) return el
          if ((Math.abs(ry - t) <= thresh || Math.abs(ry - b) <= thresh) && rx >= l && rx <= r) return el
        }
      } else if (el.type === 'image' || el.type === 'text') {
        const l = Math.min(el.x, el.x + el.width), r = Math.max(el.x, el.x + el.width)
        const t = Math.min(el.y, el.y + el.height), b = Math.max(el.y, el.y + el.height)
        if (rx >= l && rx <= r && ry >= t && ry <= b) return el
      } else if (el.type === 'stroke' && el.points) {
        const strokeThresh = Math.max(el.lineWidth, thresh)
        for (let j = 0; j < el.points.length - 1; j++) {
          if (distSeg(rx, ry, el.points[j].x, el.points[j].y, el.points[j + 1].x, el.points[j + 1].y) < strokeThresh) return el
        }
      }
    }
    return null
  }

  const getTransformHandle = (worldX: number, worldY: number, el: VectorElement): string | null => {
    const s = scaleRef.current
    const cx = el.x + el.width / 2, cy = el.y + el.height / 2
    const rad = (-el.rotation * Math.PI) / 180
    const rx = (worldX - cx) * Math.cos(rad) - (worldY - cy) * Math.sin(rad) + cx
    const ry = (worldX - cx) * Math.sin(rad) + (worldY - cy) * Math.cos(rad) + cy
    const hs = 10 / s
    const { x: x1, y: y1 } = el
    const x2 = el.x + el.width, y2 = el.y + el.height
    
    if (Math.abs(rx - x1) < hs && Math.abs(ry - y1) < hs) return 'nw'
    if (Math.abs(rx - x2) < hs && Math.abs(ry - y1) < hs) return 'ne'
    if (Math.abs(rx - x2) < hs && Math.abs(ry - y2) < hs) return 'se'
    if (Math.abs(rx - x1) < hs && Math.abs(ry - y2) < hs) return 'sw'
    
    const rotX = el.x + el.width / 2, rotY = el.y - 30 / s
    if (Math.hypot(rx - rotX, ry - rotY) < hs * 1.5) return 'rot'
    
    const l = Math.min(el.x, el.x + el.width), r = Math.max(el.x, el.x + el.width)
    const t = Math.min(el.y, el.y + el.height), b = Math.max(el.y, el.y + el.height)
    if (rx >= l && rx <= r && ry >= t && ry <= b) return 'move'
    return null
  }

  const isElementInsideLasso = (lasso: { x: number; y: number }[], el: VectorElement): boolean => {
    if (lasso.length < 3) return false
    const tx = el.x + el.width / 2, ty = el.y + el.height / 2
    let inside = false
    for (let i = 0, j = lasso.length - 1; i < lasso.length; j = i++) {
      const xi = lasso[i].x, yi = lasso[i].y, xj = lasso[j].x, yj = lasso[j].y
      if (((yi > ty) !== (yj > ty)) && tx < (xj - xi) * (ty - yi) / (yj - yi) + xi) inside = !inside
    }
    return inside
  }

  // ─── High DPI Canvas Render Engine ─────────────────────────────────────────

  const renderScene = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const s = scaleRef.current
    const p = panRef.current
    const dpr = window.devicePixelRatio || 1

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.setTransform(s * dpr, 0, 0, s * dpr, p.x * dpr, p.y * dpr)

    elementsRef.current.forEach(el => {
      ctx.save()
      const cx = el.x + el.width / 2, cy = el.y + el.height / 2
      ctx.translate(cx, cy)
      ctx.rotate((el.rotation * Math.PI) / 180)
      ctx.translate(-cx, -cy)

      ctx.strokeStyle = el.color
      ctx.fillStyle = el.color
      ctx.lineWidth = el.lineWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'

      if (selectedIdsRef.current.includes(el.id)) {
        ctx.shadowColor = '#248cee'
        ctx.shadowBlur = 12
      } else {
        ctx.shadowBlur = 0
      }

      if (el.type === 'stroke' && el.points && el.points.length > 0) {
        if (el.subTool === 'highlighter') {
          ctx.globalAlpha = 0.4
          ctx.globalCompositeOperation = 'multiply'
        }
        ctx.beginPath()
        ctx.moveTo(el.points[0].x, el.points[0].y)
        for (let i = 1; i < el.points.length; i++) ctx.lineTo(el.points[i].x, el.points[i].y)
        ctx.stroke()
      } else if (el.type === 'shape') {
        if (el.shapeType === 'rectangle') ctx.strokeRect(el.x, el.y, el.width, el.height)
        else if (el.shapeType === 'oval') {
          ctx.beginPath()
          ctx.ellipse(cx, cy, Math.abs(el.width / 2), Math.abs(el.height / 2), 0, 0, 2 * Math.PI)
          ctx.stroke()
        } else if (el.shapeType === 'triangle') {
          ctx.beginPath()
          ctx.moveTo(el.x + el.width / 2, el.y)
          ctx.lineTo(el.x, el.y + el.height)
          ctx.lineTo(el.x + el.width, el.y + el.height)
          ctx.closePath()
          ctx.stroke()
        } else if (el.shapeType === 'line') {
          ctx.beginPath()
          ctx.moveTo(el.x, el.y)
          ctx.lineTo(el.x + el.width, el.y + el.height)
          ctx.stroke()
        }
      } else if (el.type === 'image' && el.src) {
        const img = imageCache.current.get(el.src)
        if (img?.complete) ctx.drawImage(img, el.x, el.y, el.width, el.height)
      } else if (el.type === 'text' && el.textValue) {
    
        ctx.font = `${el.fontStyle || 'normal'} ${el.fontSize || 16}px sans-serif`
        ctx.textBaseline = 'top'
        ctx.shadowBlur = 0
        
        // Multi-line rendering parser matching textarea splits
        const lines = el.textValue.split('\n')
        let currentY = el.y
        lines.forEach(line => {
          ctx.fillText(line, el.x, currentY)
          currentY += (el.fontSize || 16) * 1.3
        })
      }
      ctx.restore()
    })

    // Render Selection Boxes
    selectedIdsRef.current.forEach(id => {
      const el = elementsRef.current.find(e => e.id === id)
      if (!el) return
      ctx.save()
      const cx = el.x + el.width / 2, cy = el.y + el.height / 2
      ctx.translate(cx, cy)
      ctx.rotate((el.rotation * Math.PI) / 180)
      ctx.translate(-cx, -cy)
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 1.5 / s
      ctx.shadowBlur = 0
      ctx.strokeRect(el.x, el.y, el.width, el.height)
      
      const hs = 8 / s
      ctx.fillStyle = '#ffffff'
      ;[
        { x: el.x, y: el.y }, { x: el.x + el.width, y: el.y },
        { x: el.x + el.width, y: el.y + el.height }, { x: el.x, y: el.y + el.height },
      ].forEach(b => {
        ctx.fillRect(b.x - hs / 2, b.y - hs / 2, hs, hs)
        ctx.strokeRect(b.x - hs / 2, b.y - hs / 2, hs, hs)
      })
      
      ctx.beginPath()
      ctx.moveTo(el.x + el.width / 2, el.y)
      ctx.lineTo(el.x + el.width / 2, el.y - 30 / s)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(el.x + el.width / 2, el.y - 30 / s, 5 / s, 0, 2 * Math.PI)
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    })

    // Laser Tracking System Render paths
    laserPaths.forEach(path => {
      if (path.length < 2) return
      ctx.save()
      ctx.strokeStyle = '#ee2424'
      ctx.lineWidth = 4 / s
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.shadowColor = '#ee2424'
      ctx.shadowBlur = 12
      ctx.beginPath()
      ctx.moveTo(path[0].x, path[0].y)
      path.forEach(p => ctx.lineTo(p.x, p.y))
      ctx.stroke()
      ctx.restore()
    })

    if (activeToolRef.current === 'laser' && localLaserPos) {
      ctx.save()
      ctx.fillStyle = '#ee2424'
      ctx.shadowColor = '#ee2424'
      ctx.shadowBlur = 18
      ctx.beginPath()
      ctx.arc(localLaserPos.x, localLaserPos.y, 6 / s, 0, 2 * Math.PI)
      ctx.fill()
      ctx.restore()
    }

    if (remoteLaserPointer) {
      ctx.save()
      ctx.fillStyle = '#ee2424'
      ctx.shadowColor = '#ee2424'
      ctx.shadowBlur = 18
      ctx.beginPath()
      ctx.arc(remoteLaserPointer.x, remoteLaserPointer.y, 6 / s, 0, 2 * Math.PI)
      ctx.fill()
      ctx.restore()
    }

    if (lassoPointsRef.current.length > 1) {
      ctx.save()
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 1.5 / s
      ctx.setLineDash([4 / s, 4 / s])
      ctx.shadowBlur = 0
      ctx.beginPath()
      ctx.moveTo(lassoPointsRef.current[0].x, lassoPointsRef.current[0].y)
      lassoPointsRef.current.forEach(p => ctx.lineTo(p.x, p.y))
      ctx.stroke()
      ctx.restore()
    }

    ctx.restore()
  }, [laserPaths, localLaserPos, remoteLaserPointer, lassoPoints])

  useEffect(() => { renderScene() }, [renderScene, elements, scale, pan, selectedIds, laserPaths, lassoPoints, remoteLaserPointer, localLaserPos])

  // ─── Network Infrastructure Sync ──────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleResize = () => {
      if (!containerRef.current || !canvas) return
      const dpr = window.devicePixelRatio || 1
      const w = containerRef.current.clientWidth
      const h = containerRef.current.clientHeight
      
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      renderScene()
    }
    window.addEventListener('resize', handleResize)
    handleResize()

    if (!isReadOnly) {
      const channel = supabase.channel(`room_wb_v4:${roomId}`, {
        config: { broadcast: { self: false } },
      })
      
      channel
        .on('broadcast', { event: 'sync_elements' }, ({ payload }) => {
          setElements(payload.elements)
          payload.elements.forEach((el: VectorElement) => {
            if (el.type === 'image' && el.src && !imageCache.current.has(el.src)) {
              const img = new Image()
              img.src = el.src
              img.onload = () => renderScene()
              imageCache.current.set(el.src, img)
            }
          })
        })
        .on('broadcast', { event: 'laser_track' }, ({ payload }) => {
          setLaserPaths(prev => [...prev, payload.points])
        })
        .on('broadcast', { event: 'laser_pointer_move' }, ({ payload }) => {
          setRemoteLaserPointer(payload.pointer)
          remoteLaserLastTime.current = Date.now()
        })
        
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          isChannelReady.current = true
        }
      })
      
      channelRef.current = channel
      return () => {
        window.removeEventListener('resize', handleResize)
        supabase.removeChannel(channel)
        isChannelReady.current = false
      }
    }
    return () => window.removeEventListener('resize', handleResize)
  }, [roomId, isReadOnly])

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setLaserPaths(prev => {
        const next = prev
          .map(path => path.filter(p => now - p.time < 2000))
          .filter(p => p.length > 0)
        return next.length !== prev.length || next.some((p, i) => p.length !== prev[i]?.length) ? next : prev
      })
      if (remoteLaserPointer && now - remoteLaserLastTime.current > 3000) {
        setRemoteLaserPointer(null)
      }
    }, 60)
    return () => clearInterval(interval)
  }, [remoteLaserPointer])

  const broadcastState = (list: VectorElement[]) => {
    if (!isChannelReady.current) return
    channelRef.current?.send({ type: 'broadcast', event: 'sync_elements', payload: { elements: list } })
  }

  // ─── Interaction Mouse/Pointer Handlers ────────────────────────────────────

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isReadOnly) return

    const clientPos = getCanvasRelativeCoords(e)
    const world = getPointsInWorldSpace(clientPos.x, clientPos.y)

    

    // Close any existing text input layout safely on clicking outside
    if (textInputConfig) {
      
      commitInlineTextElement()
      return
    }

    setIsInteracting(true)
    startTrackPos.current = { x: clientPos.x, y: clientPos.y }

    if (activeTool === 'move') {
      setInteractionMode('pan')
      startPanOffset.current = { ...panRef.current }
      return
    }

    if (activeTool === 'select') {
      if (selectionMode === 'lasso') {
        setInteractionMode('lasso')
        setLassoPoints([world])
        return
      }

      if (selectedIds.length === 1) {
        const el = elementsRef.current.find(e => e.id === selectedIds[0])
        if (el) {
          const handle = getTransformHandle(world.x, world.y, el)
          if (handle) {
            setInteractionMode('transform')
            setTransformHandle(handle)
            initialElementsState.current.clear()
            initialElementsState.current.set(el.id, {
              x: el.x, y: el.y, width: el.width, height: el.height, rotation: el.rotation,
              points: el.points ? el.points.map(p => ({ ...p })) : undefined,
            })
            return
          }
        }
      }

      const hit = getElementAtPosition(world.x, world.y, elementsRef.current)
      if (hit) {
        setSelectedIds([hit.id])
        setInteractionMode('transform')
        setTransformHandle('move')
        initialElementsState.current.clear()
        initialElementsState.current.set(hit.id, {
          x: hit.x, y: hit.y, width: hit.width, height: hit.height, rotation: hit.rotation,
          points: hit.points ? hit.points.map(p => ({ ...p })) : undefined,
        })
      } else {
        setSelectedIds([])
        setInteractionMode('none')
      }
      return
    }

    if (activeTool === 'brush') {
      if (activeBrush === 'eraser') {
        const hit = getElementAtPosition(world.x, world.y, elementsRef.current)
        if (hit) {
          const next = elementsRef.current.filter(el => el.id !== hit.id)
          setElements(next)
          broadcastState(next)
        }
        return
      }
      setInteractionMode('draw')
      const lw = activeBrush === 'marker' ? lineWidth * 2.5 : lineWidth
      const bounds = getStrokeBounds([world], lw)
      const newStroke: VectorElement = {
        id: `stroke_${Date.now()}`,
        type: 'stroke',
        subTool: activeBrush,
        x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height,
        color, lineWidth: lw, rotation: 0,
        points: [world],
      }
      activeElementId.current = newStroke.id
      setElements(prev => [...prev, newStroke])
      return
    }

    if (activeTool === 'laser') {
      setInteractionMode('draw')
      const p = { x: world.x, y: world.y, time: Date.now() }
      setLaserPaths(prev => [...prev, [p]])
      setLocalLaserPos({ x: world.x, y: world.y })
      return
    }

    if (activeTool === 'shape') {
      setInteractionMode('draw')
      const newShape: VectorElement = {
        id: `shape_${Date.now()}`,
        type: 'shape',
        shapeType: activeShape,
        x: world.x, y: world.y, width: 0, height: 0,
        color, lineWidth, rotation: 0,
      }
      activeElementId.current = newShape.id
      setElements(prev => [...prev, newShape])
      return
    }

    // Fixed Figma-Style single click trigger registry
    if (activeTool === 'text') {
      e.preventDefault();
      
      setTextInputConfig({
        worldX: world.x,
        worldY: world.y,
        screenX: clientPos.screenX,
        screenY: clientPos.screenY,
      })
      setLiveTextValue('')
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const clientPos = getCanvasRelativeCoords(e)
    const world = getPointsInWorldSpace(clientPos.x, clientPos.y)
    const now = Date.now()

    if (activeTool === 'laser') {
      setLocalLaserPos({ x: world.x, y: world.y })
      if (isChannelReady.current && now - lastLaserBroadcastTime.current > 40) {
        channelRef.current?.send({
          type: 'broadcast', event: 'laser_pointer_move',
          payload: { pointer: { x: world.x, y: world.y, roomId } },
        })
        lastLaserBroadcastTime.current = now
      }
    }

    if (!isInteracting || isReadOnly) return
    const s = scaleRef.current
    const dx = (clientPos.x - startTrackPos.current.x) / s
    const dy = (clientPos.y - startTrackPos.current.y) / s

    if (interactionMode === 'pan') {
      const rawDX = clientPos.x - startTrackPos.current.x
      const rawDY = clientPos.y - startTrackPos.current.y
      setPan({ x: startPanOffset.current.x + rawDX, y: startPanOffset.current.y + rawDY })
      return
    }

    if (interactionMode === 'lasso') {
      setLassoPoints(prev => [...prev, world])
      return
    }

    if (interactionMode === 'transform' && selectedIdsRef.current.length > 0) {
      setElements(prev => prev.map(el => {
        if (!selectedIdsRef.current.includes(el.id)) return el
        const init = initialElementsState.current.get(el.id)
        if (!init) return el 
        const handle = transformHandleRef.current

        if (handle === 'move') {
          if (el.type === 'stroke' && init.points) {
            const movedPts = init.points.map(p => ({ x: p.x + dx, y: p.y + dy }))
            const bounds = getStrokeBounds(movedPts, el.lineWidth)
            return { ...el, points: movedPts, x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
          }
          return { ...el, x: init.x + dx, y: init.y + dy }
        }
        if (el.type === 'stroke') return el 
        
        if (handle === 'se') {
          let nw = init.width + dx, nh = init.height + dy
          if (e.shiftKey) { const m = Math.max(nw, nh); nw = m; nh = m }
          return { ...el, width: Math.max(12, nw), height: Math.max(12, nh) }
        }
        if (handle === 'sw') return { ...el, x: init.x + dx, width: Math.max(12, init.width - dx), height: Math.max(12, init.height + dy) }
        if (handle === 'ne') return { ...el, y: init.y + dy, width: Math.max(12, init.width + dx), height: Math.max(12, init.height - dy) }
        if (handle === 'nw') return { ...el, x: init.x + dx, y: init.y + dy, width: Math.max(12, init.width - dx), height: Math.max(12, init.height - dy) }
        if (handle === 'rot') {
          const cx = init.x + init.width / 2, cy = init.y + init.height / 2
          const angle = Math.atan2(world.y - cy, world.x - cx) * (180 / Math.PI) - 90
          return { ...el, rotation: angle }
        }
        return el
      }))
      return
    }

    if (interactionMode === 'draw') {
      if (activeTool === 'brush' && activeElementId.current) {
        setElements(prev => prev.map(item => {
          if (item.id !== activeElementId.current) return item
          const nextPts = [...(item.points || []), world]
          const bounds = getStrokeBounds(nextPts, item.lineWidth)
          return { ...item, points: nextPts, x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
        }))
        return
      }
      if (activeTool === 'laser') {
        const p = { x: world.x, y: world.y, time: Date.now() }
        setLaserPaths(prev => {
          const next = [...prev]
          if (next.length > 0) {
            next[next.length - 1] = [...next[next.length - 1], p]
            if (isChannelReady.current) {
              channelRef.current?.send({ type: 'broadcast', event: 'laser_track', payload: { points: next[next.length - 1] } })
            }
          }
          return next
        })
        return
      }
      if (activeTool === 'shape' && activeElementId.current) {
        setElements(prev => prev.map(item => {
          if (item.id !== activeElementId.current) return item
          const startWorld = getPointsInWorldSpace(startTrackPos.current.x, startTrackPos.current.y)
          let ww = world.x - startWorld.x
          let wh = world.y - startWorld.y
          if (e.shiftKey) {
            const m = Math.max(Math.abs(ww), Math.abs(wh))
            ww = ww >= 0 ? m : -m
            wh = wh >= 0 ? m : -m
          }
          return { ...item, width: ww, height: wh }
        }))
      }
    }
  }

  const handleMouseUp = () => {
    if (!isInteracting) return
    setIsInteracting(false)

    if (interactionMode === 'lasso' && lassoPoints.length > 2) {
      const insideIds = elementsRef.current
        .filter(el => isElementInsideLasso(lassoPoints, el))
        .map(el => el.id)
      setSelectedIds(insideIds)
      if (insideIds.length > 0) {
        setSelectionMode('object')
        initialElementsState.current.clear()
        insideIds.forEach(id => {
          const el = elementsRef.current.find(e => e.id === id)
          if (el) initialElementsState.current.set(el.id, {
            x: el.x, y: el.y, width: el.width, height: el.height, rotation: el.rotation,
            points: el.points ? el.points.map(p => ({ ...p })) : undefined,
          })
        })
      }
    }

    if (interactionMode === 'draw' && activeTool === 'brush' && activeElementId.current) {
      setElements(prev => prev.map(el => {
        if (el.id !== activeElementId.current || !el.points) return el
        const bounds = getStrokeBounds(el.points, el.lineWidth)
        return { ...el, x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
      }))
    }

    setLassoPoints([])
    setTransformHandle(null)
    setInteractionMode('none')
    activeElementId.current = null
    
    setTimeout(() => broadcastState(elementsRef.current), 0)
    renderScene()
  }

  const handleMouseLeave = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'laser') setLocalLaserPos(null)
    handleMouseUp()
  }

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const clientPos = getCanvasRelativeCoords(e)
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    const newScale = Math.max(0.15, Math.min(4, scaleRef.current + delta))
    
    const newPanX = clientPos.x - (clientPos.x - panRef.current.x) * (newScale / scaleRef.current)
    const newPanY = clientPos.y - (clientPos.y - panRef.current.y) * (newScale / scaleRef.current)
    
    setScale(newScale)
    setPan({ x: newPanX, y: newPanY })
  }

  // Figma-Style Text Element Compiler Matrix
  const commitInlineTextElement = () => {
    if (!textInputConfig || !liveTextValue.trim()) {
      
      setTextInputConfig(null)
      return
    }
    

    // Auto-calculate structural bounding wrappers based on text character rows length
    const lines = liveTextValue.split('\n')
    let maxChars = 0
    lines.forEach(l => { if (l.length > maxChars) maxChars = l.length })

    const newTxt: VectorElement = {
      id: `text_${Date.now()}`,
      type: 'text',
      x: textInputConfig.worldX,
      y: textInputConfig.worldY,
      width: Math.max(40, maxChars * (fontSize * 0.55)),
      height: Math.max(24, lines.length * (fontSize * 1.3)),
      color,
      lineWidth: 1,
      rotation: 0,
      textValue: liveTextValue,
      fontSize,
      fontStyle,
    }

    
    const next = [...elementsRef.current, newTxt]
    setElements(next)
    broadcastState(next)
    setTextInputConfig(null)
    setLiveTextValue('')
  }

  const placeImageOnBoard = (imgSrc: string, dropEvent: React.DragEvent) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = imgSrc
    img.onload = () => {
      const clientPos = getCanvasRelativeCoords(dropEvent)
      const world = getPointsInWorldSpace(clientPos.x, clientPos.y)

      const sw = 240 / scaleRef.current
      const sh = (img.height * (240 / img.width)) / scaleRef.current

      const newImg: VectorElement = {
        id: `img_${Date.now()}`,
        type: 'image',
        x: world.x - sw / 2,
        y: world.y - sh / 2,
        width: sw,
        height: sh,
        color: 'transparent',
        lineWidth: 0,
        rotation: 0,
        src: imgSrc,
      }
      imageCache.current.set(imgSrc, img)
      const next = [...elementsRef.current, newImg]
      setElements(next)
      broadcastState(next)
    }
  }

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault()

    // ── Case 1: Drag from FileDirectory (JSON payload with storagePath) ──
    const jsonPayload = e.dataTransfer.getData('application/json')
    if (jsonPayload) {
      try {
        const { fullStoragePath } = JSON.parse(jsonPayload) as { fileName: string; fullStoragePath: string }
        const { data, error } = await supabase.storage
          .from('classroom-files')
          .createSignedUrl(fullStoragePath, 60 * 15)
        if (error || !data?.signedUrl) {
          console.error('Signed URL error:', error?.message)
          return
        }
        placeImageOnBoard(data.signedUrl, e)
      } catch (err) {
        console.error('FileDirectory drop parse error:', err)
      }
      return
    }

    // ── Case 2: Native file drop from OS (images only) ──
    const file = e.dataTransfer.files[0] || e.dataTransfer.items[0]?.getAsFile()
    if (!file?.type.startsWith('image/')) return

    const reader = new FileReader()
    reader.onload = () => placeImageOnBoard(reader.result as string, e)
    reader.readAsDataURL(file)
  }

  const executeCut = () => {
    if (selectedIds.length === 0) return
    const selected = elements.filter(el => selectedIds.includes(el.id))
    setClipboard(selected)
    const remaining = elements.filter(el => !selectedIds.includes(el.id))
    setElements(remaining)
    setSelectedIds([])
    broadcastState(remaining)
  }

  const executeCopy = () => {
    if (selectedIds.length === 0) return
    const selected = elements.filter(el => selectedIds.includes(el.id))
    setClipboard(selected)
  }

  const executePaste = () => {
    if (!clipboard || clipboard.length === 0) return
    const pasted = clipboard.map(el => ({
      ...el,
      id: `${el.type}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      x: el.x + 25,
      y: el.y + 25,
    }))
    const next = [...elements, ...pasted]
    setElements(next)
    setSelectedIds(pasted.map(p => p.id))
    broadcastState(next)
  }

  const executeDelete = () => {
    if (selectedIds.length === 0) return
    const remaining = elements.filter(el => !selectedIds.includes(el.id))
    setElements(remaining)
    setSelectedIds([])
    broadcastState(remaining)
  }

  const dynamicCursorStyle = () => {
    if (activeTool === 'move') return isInteracting ? 'grabbing' : 'grab'
    if (activeTool === 'select') return 'default'
    if (activeTool === 'laser') return 'none' 
    if (activeTool === 'shape') return 'crosshair'
    if (activeTool === 'text') return 'text'
    return 'default'
  }

  return (
    <div ref={containerRef} className="relative w-full h-full bg-slate-50 overflow-hidden">
      
      {/* ── Global Command Header Strip ── */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur border border-slate-200 px-4 py-2 rounded-2xl shadow-xl flex items-center gap-3 z-30">
        <button onClick={executeCut} disabled={selectedIds.length === 0} className="p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-40 rounded-xl transition text-sm">✂️ Cut</button>
        <button onClick={executeCopy} disabled={selectedIds.length === 0} className="p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-40 rounded-xl transition text-sm">📋 Copy</button>
        <button onClick={executePaste} disabled={!clipboard} className="p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-40 rounded-xl transition text-sm">📥 Paste</button>
        <button onClick={executeDelete} disabled={selectedIds.length === 0} className="p-2 text-red-600 hover:bg-red-50 disabled:opacity-40 rounded-xl transition text-sm">🗑️ Delete</button>
        <div className="w-px h-5 bg-slate-200" />
        <button onClick={() => { setElements([]); setSelectedIds([]); broadcastState([]) }} className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition text-sm">Clear Board</button>
      </div>

      {/* Infinite Canvas Layer */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleFileDrop}
        style={{ cursor: dynamicCursorStyle() }}
        className="absolute inset-0 block select-none"
      />

      {/* ── Fixed Contextual Figma/Photoshop Vector Overlay Text Input Box ── */}
      {textInputConfig && (
        <div 
          style={{
            position: 'absolute',
            left: `${textInputConfig.screenX}px`,
            top: `${textInputConfig.screenY}px`,
            zIndex: 50,
            transformOrigin: 'top left',
          }}
          className="pointer-events-auto min-w-[120px] h-auto"
        >
          <textarea
            autoFocus
            value={liveTextValue}
            onChange={(e) => { setLiveTextValue(e.target.value)}}
            onBlur={() => {
                // ── PLACE LOG STATEMENT #7 HERE ──
                
                commitInlineTextElement()
              }}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="Type text..."
            style={{
              fontSize: `${fontSize * scale}px`,
              color: color,
              fontStyle: fontStyle === 'italic' ? 'italic' : 'normal',
              fontWeight: fontStyle === 'bold' ? 'bold' : 'normal',
              lineHeight: 1.3,
              fontFamily: 'sans-serif',
              background: 'rgba(255, 255, 255, 0.85)',
              border: '2px solid #3b82f6',
              borderRadius: '4px',
              outline: 'none',
              width: '100%',
              minHeight: `${fontSize * scale * 1.5}px`,
              padding: '4px 6px',
              margin: 0,
              resize: 'both',
              overflow: 'hidden',
              display: 'block',
              whiteSpace: 'pre-wrap',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            }}
          />
        </div>
      )}

      {/* ── Contextual Floating Popup Options Menus ── */}
      {activeMenu && (
        <div 
          className="absolute left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur border border-slate-200 p-3 rounded-2xl shadow-xl flex items-center gap-4 z-30 transition-all duration-200"
          style={{ bottom: '86px' }}
        >
          {activeMenu === 'brush' && (
            <>
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                {(['pen', 'marker', 'highlighter', 'eraser'] as BrushSubTool[]).map(sub => (
                  <button key={sub} onClick={() => setActiveBrush(sub)} className={`px-2 py-1 text-xs rounded-lg font-bold transition capitalize ${activeBrush === sub ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>{sub}</button>
                ))}
              </div>
              {activeBrush !== 'eraser' && (
                <>
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer border border-slate-300" />
                  <input type="range" min="1" max="15" value={lineWidth} onChange={(e) => setLineWidth(Number(e.target.value))} className="w-20" />
                </>
              )}
            </>
          )}

          {activeMenu === 'shape' && (
            <>
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                {(['rectangle', 'oval', 'triangle', 'line'] as ShapeType[]).map(st => (
                  <button key={st} onClick={() => setActiveShape(st)} className={`px-2 py-1 text-xs rounded-lg font-bold transition capitalize ${activeShape === st ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>{st}</button>
                ))}
              </div>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer border border-slate-300" />
              <input type="range" min="1" max="15" value={lineWidth} onChange={(e) => setLineWidth(Number(e.target.value))} className="w-20" />
            </>
          )}

          {activeMenu === 'text' && (
            <>
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                {(['normal', 'bold', 'italic'] as const).map(fs => (
                  <button key={fs} onClick={() => setFontStyle(fs)} className={`px-2 py-1 text-xs rounded-lg font-bold transition capitalize ${fontStyle === fs ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>{fs}</button>
                ))}
              </div>
              <select value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="text-xs bg-slate-100 border border-slate-200 rounded-lg p-1 font-bold text-slate-700">
                {[14, 18, 24, 32, 48, 72].map(sz => <option key={sz} value={sz}>{sz}px</option>)}
              </select>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer border border-slate-300" />
            </>
          )}

          {activeMenu === 'select' && (
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              <button onClick={() => setSelectionMode('object')} className={`px-2 py-1 text-xs rounded-lg font-bold transition ${selectionMode === 'object' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'}`}>Object Selector</button>
              <button onClick={() => setSelectionMode('lasso')} className={`px-2 py-1 text-xs rounded-lg font-bold transition ${selectionMode === 'lasso' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'}`}>Lasso Select</button>
            </div>
          )}
        </div>
      )}

      {/* ── Main Footer Tools Dock Menu ── */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md border border-slate-200 p-2 rounded-2xl shadow-xl flex items-center gap-1 z-20">
        {[
          { tool: 'select', label: 'Select', icon: '🖱️' },
          { tool: 'move', label: 'Move', icon: '✋' },
          { tool: 'brush', label: 'Brush', icon: '🖌️' },
          { tool: 'shape', label: 'Shapes', icon: '📐' },
          { tool: 'text', label: 'Text', icon: '🔤' },
          { tool: 'laser', label: 'Laser', icon: '🔦' },
        ].map(({ tool, label, icon }) => (
          <button
            key={tool}
            onClick={() => {
              setActiveTool(tool as Tool)
              setActiveMenu(activeMenu === tool ? null : (tool as Tool))
              if (tool !== 'select') setSelectedIds([])
            }}
            className={`p-2 rounded-xl flex flex-col items-center transition min-w-[56px] ${activeTool === tool ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            <span className="text-xl">{icon}</span>
            <span className="text-[9px] uppercase tracking-tight mt-0.5">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Workspace Zoom Configuration View ── */}
      <div className="absolute bottom-5 right-5 bg-white/95 backdrop-blur border border-slate-200 px-3 py-1.5 rounded-xl shadow-md text-[11px] font-mono font-bold text-slate-500 flex items-center gap-2 z-20">
        <button onClick={() => setScale(s => Math.max(0.15, s - 0.1))} className="hover:text-blue-600 transition text-sm font-black">−</button>
        <span className="min-w-[36px] text-center">{Math.round(scale * 100)}%</span>
        <button onClick={() => setScale(s => Math.min(4, s + 0.1))} className="hover:text-blue-600 transition text-sm font-black">+</button>
      </div>
    </div>
  )
}