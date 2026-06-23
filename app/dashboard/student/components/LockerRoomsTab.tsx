"use client"
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface StorageFile {
  name: string
  id?: string | null
  updated_at?: string | null
  metadata?: any
}

export default function LockerRoomsTab({ studentId }: { studentId: string }) {
  const folderPath = `student_${studentId}`
  
  // State Matrix
  const [files, setFiles] = useState<StorageFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [viewerFile, setViewerFile] = useState<{ name: string; url: string } | null>(null)

  const dropdownRef = useRef<HTMLDivElement>(null)

  // Sync files from Supabase Storage bucket
  async function syncLockerFiles() {
    if (!studentId) return
    setLoading(true)
    
    const { data, error } = await supabase.storage
      .from('classroom-files')
      .list(folderPath, {
        limit: 100,
        sortBy: { column: 'name', order: 'asc' }
      })

    if (error) {
      console.error("Storage query error:", error.message)
    } else if (data) {
      // Filter out hidden system files if present
      const cleanFiles = data.filter(file => file.name !== '.keep')
      setFiles(cleanFiles)
    }
    setLoading(false)
  }

  useEffect(() => {
    syncLockerFiles()
  }, [studentId])

  // Close actions dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdown(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Action: File Direct Upload Pipeline
  async function uploadFileToStorage(file: File) {
    if (!file) return
    try {
      setUploading(true)
      const targetPath = `${folderPath}/${file.name}`
      
      const { error } = await supabase.storage
        .from('classroom-files')
        .upload(targetPath, file, { cacheControl: '3600', upsert: true })

      if (error) throw error
      
      syncLockerFiles()
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  // Drag & Drop Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFileToStorage(e.dataTransfer.files[0])
    }
  }

  // Action: Open / Preview File Attachment
  const handleFileOpenFile = async (fileName: string) => {
    const path = `${folderPath}/${fileName}`
    const { data } = supabase.storage.from('classroom-files').getPublicUrl(path)
    if (data?.publicUrl) {
      setViewerFile({ name: fileName, url: data.publicUrl })
    }
  }

  // Action: Rename File Row
  const handleFileRename = async (currentName: string) => {
    const newName = window.prompt(`Enter new name for "${currentName}":`, currentName)
    if (!newName || newName.trim() === "" || newName === currentName) return

    const oldPath = `${folderPath}/${currentName}`
    const newPath = `${folderPath}/${newName.trim()}`

    const { error } = await supabase.storage.from('classroom-files').move(oldPath, newPath)

    if (error) {
      alert(`Rename declined: ${error.message}`)
    } else {
      setActiveDropdown(null)
      syncLockerFiles()
    }
  }

  // Action: Delete File Attachment
  const handleFileDelete = async (fileName: string) => {
    const confirmAction = window.confirm(`Are you sure you want to permanently delete "${fileName}"?`)
    if (!confirmAction) return

    const path = `${folderPath}/${fileName}`
    const { error } = await supabase.storage.from('classroom-files').remove([path])

    if (error) {
      alert(`Delete operation failed: ${error.message}`)
    } else {
      setActiveDropdown(null)
      syncLockerFiles()
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-2">
        <span className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Syncing Personal Storage Drive...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">🎒 Locker Rooms & Asset Hub</h1>
        <p className="text-xs text-slate-400">Instantly drop, store, preview, and organize assignments and resource files.</p>
      </div>

      {/* DRAG AND DROP ZONE */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition relative ${
          dragActive 
            ? 'border-blue-600 bg-blue-50/50' 
            : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
        }`}
      >
        <input
          type="file"
          id="locker-file-upload"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && uploadFileToStorage(e.target.files[0])}
        />
        <label htmlFor="locker-file-upload" className="cursor-pointer space-y-2 block">
          <span className="text-3xl block">{uploading ? '⏳' : '📤'}</span>
          <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide">
            {uploading ? 'Uploading your asset to drive...' : 'Drag & Drop files here, or click to browse'}
          </h4>
          <p className="text-[11px] text-slate-400 font-medium">Supports PDF, Images, Word Docs, and Video logs up to 50MB</p>
        </label>
      </div>

      {/* FILE SYSTEM GRID VISUALIZER */}
      <div className="pt-2" ref={dropdownRef}>
        <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3">Stored Items ({files.length})</h3>
        
        {files.length === 0 ? (
          <div className="text-center py-16 border border-slate-100 rounded-2xl bg-white text-slate-400 font-medium text-xs">
            Your locker space is currently empty. Drop files above to fill it.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {files.map((file) => {
              const isDropdownOpen = activeDropdown === file.name
              const ext = file.name.split('.').pop()?.toLowerCase() || ''
              
              let fileIcon = "📄"
              if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) fileIcon = "🖼️"
              if (ext === 'pdf') fileIcon = "📕"
              if (['doc', 'docx'].includes(ext)) fileIcon = "📘"
              if (['mp4', 'mov', 'avi'].includes(ext)) fileIcon = "🎬"

              return (
                <div
                  key={file.name}
                  onDoubleClick={() => handleFileOpenFile(file.name)}
                  className="group relative bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center text-center justify-between select-none hover:border-blue-500 hover:shadow-md transition cursor-pointer h-36"
                >
                  {/* Context Actions System Button */}
                  <div className="absolute top-2 right-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveDropdown(isDropdownOpen ? null : file.name)
                      }}
                      className="w-6 h-6 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 font-bold text-xs transition flex items-center justify-center"
                    >
                      ⋮
                    </button>
                    
                    {isDropdownOpen && (
                      <div className="absolute right-0 mt-1 w-28 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1 text-left">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleFileOpenFile(file.name) }}
                          className="w-full px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition flex items-center gap-1.5"
                        >
                          👁️ Open file
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleFileRename(file.name) }}
                          className="w-full px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition flex items-center gap-1.5"
                        >
                          ✏️ Rename
                        </button>
                        <hr className="border-slate-100 my-0.5" />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleFileDelete(file.name) }}
                          className="w-full px-3 py-2 text-[11px] font-bold text-rose-600 hover:bg-rose-50 transition flex items-center gap-1.5"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    )}
                  </div>

                  <span className="text-3xl mt-2 block group-hover:scale-110 transition duration-150">{fileIcon}</span>
                  <div className="w-full">
                    <p className="text-[11px] font-bold text-slate-700 max-w-full truncate px-1">
                      {file.name}
                    </p>
                    <span className="text-[9px] font-mono font-bold text-slate-400 uppercase mt-0.5 block">
                      .{ext} file
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* FULL-SCREEN MODAL LIGHTBOX FILE PREVIEW PORTAL */}
      {viewerFile && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] shadow-2xl flex flex-col overflow-hidden border border-slate-800">
            
            <div className="bg-slate-900 px-5 py-3 text-white flex justify-between items-center border-b border-slate-800">
              <div className="truncate pr-4">
                <h4 className="text-[10px] uppercase font-black tracking-widest text-blue-400">Resource Attachment Viewer</h4>
                <p className="text-xs font-bold text-slate-300 truncate mt-0.5">{viewerFile.name}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <a
                  href={viewerFile.url}
                  download={viewerFile.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-[11px] uppercase tracking-wider rounded-lg transition"
                >
                  📥 Download File
                </a>
                <button
                  type="button"
                  onClick={() => setViewerFile(null)}
                  className="text-slate-400 hover:text-white font-black text-sm p-1"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 flex items-center justify-center p-6 overflow-auto">
              {(() => {
                const extension = viewerFile.name.split('.').pop()?.toLowerCase() || ''
                
                if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(extension)) {
                  return (
                    <img
                      src={viewerFile.url}
                      alt={viewerFile.name}
                      className="max-w-full max-h-full object-contain rounded-lg shadow-md bg-white"
                    />
                  )
                }
                
                if (extension === 'pdf') {
                  return (
                    <iframe
                      src={`${viewerFile.url}#toolbar=1`}
                      className="w-full h-full border-0 bg-white rounded-lg shadow-md"
                      title={viewerFile.name}
                    />
                  )
                }

                return (
                  <div className="text-center space-y-3 bg-white p-8 rounded-2xl shadow-sm max-w-sm border">
                    <span className="text-4xl block">📦</span>
                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-wide">No Inline Preview Configured</h5>
                    <p className="text-xs text-slate-400 leading-normal">
                      The system can't render <span className="font-mono font-bold text-slate-600">.{extension}</span> files directly inside the app. Download the document to view it on your device.
                    </p>
                  </div>
                )
              })()}
            </div>

          </div>
        </div>
      )}

    </div>
  )
}