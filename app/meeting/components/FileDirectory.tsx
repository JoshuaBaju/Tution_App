"use client"

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface FileDirectoryProps {
  folderPath: string
}

interface FileObject {
  name: string
  id: string
  created_at: string
  metadata: {
    size: number
    mimetype: string
  }
}

export default function FileDirectory({ folderPath }: FileDirectoryProps) {
  const [files, setFiles] = useState<FileObject[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Context UI State parameters
  const [activeMenuFile, setActiveMenuFile] = useState<string | null>(null)
  const [isRenamingFile, setIsRenamingFile] = useState<string | null>(null)
  const [newNameText, setNewNameText] = useState('')

  const menuRef = useRef<HTMLDivElement>(null)

  // Close context dropdowns when clicking elsewhere across workspace
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuFile(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // 🔄 Fetch and screen files inside isolated storage directory
  const fetchFiles = async () => {
    if (!folderPath) return
    setLoading(true)
    
    const { data, error } = await supabase.storage
      .from('classroom-files')
      .list(folderPath, {
        limit: 100,
        sortBy: { column: 'name', order: 'asc' },
      })

    if (error) {
      console.error("Error fetching storage files:", error.message)
    } else if (data) {
      // 🕵️ HIDES system placeholders (.emptyFolderPlaceholder, .keep, etc)
      const filteredUserFiles = (data as unknown as FileObject[]).filter(
        (f) => f.name !== '.emptyFolderPlaceholder' && f.name !== '.keep'
      )
      setFiles(filteredUserFiles)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchFiles()
  }, [folderPath])

  // 📤 Native upload logic pipeline
  const handleFileUpload = async (file: File) => {
    if (!file) return
    setUploading(false)
    setUploading(true)

    // Normalize paths safely to eliminate accidental character breakages
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const targetPath = `${folderPath}/${sanitizedName}`

    const { error } = await supabase.storage
      .from('classroom-files')
      .upload(targetPath, file, { upsert: true })

    if (error) {
      alert(`Upload failed: ${error.message}`)
    } else {
      await fetchFiles()
    }
    setUploading(false)
  }

  // 📦 Secure single-use asset token generation handler
  const handleFileClick = async (fileName: string) => {
    const { data, error } = await supabase.storage
      .from('classroom-files')
      .createSignedUrl(`${folderPath}/${fileName}`, 60 * 15)

    if (error) {
      alert("Error generating download link")
    } else if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank')
    }
  }

  // 🗑️ Delete logic pipeline
  const handleFileDelete = async (fileName: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${fileName}" from the workspace?`)) return
    setActiveMenuFile(null)

    const targetPath = `${folderPath}/${fileName}`
    const { error } = await supabase.storage
      .from('classroom-files')
      .remove([targetPath])

    if (error) {
      alert(`Delete operation failed: ${error.message}`)
    } else {
      await fetchFiles()
    }
  }

  // ✏️ Rename utility transaction processing pipeline
  const handleFileRename = async (oldName: string) => {
    if (!newNameText.trim() || newNameText === oldName) {
      setIsRenamingFile(null)
      return
    }

    const fileExtension = oldName.includes('.') ? oldName.split('.').pop() : ''
    let processedNewName = newNameText.trim().replace(/[^a-zA-Z0-9._-]/g, '_')
    
    if (fileExtension && !processedNewName.endsWith(`.${fileExtension}`)) {
      processedNewName += `.${fileExtension}`
    }

    const sourcePath = `${folderPath}/${oldName}`
    const targetPath = `${folderPath}/${processedNewName}`

    // Supabase handles renames by copying the asset path forward, then dumping the root source
    const { error: moveError } = await supabase.storage
      .from('classroom-files')
      .move(sourcePath, targetPath)

    if (moveError) {
      alert(`Rename processing error: ${moveError.message}`)
    } else {
      setIsRenamingFile(null)
      setActiveMenuFile(null)
      await fetchFiles()
    }
  }

  // 🎛️ Drag and Drop lifecycle events
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const onDragLeave = () => {
    setIsDragOver(false)
  }

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFileUpload(e.dataTransfer.files[0])
    }
  }

  // 🎯 Whiteboard Drag Handlers
  const handleFileDragStart = (e: React.DragEvent, fileName: string) => {
    const assetPayload = {
      fileName,
      fullStoragePath: `${folderPath}/${fileName}`
    }
    // Encapsulate meta configurations into application layout memory
    e.dataTransfer.setData("application/json", JSON.stringify(assetPayload))
    e.dataTransfer.effectAllowed = "copy"
  }

  return (
    <div 
      className={`flex-1 flex flex-col min-h-0 relative transition-all rounded-xl ${
        isDragOver ? 'bg-blue-50/50 border-2 border-dashed border-blue-400' : 'bg-slate-50 border border-slate-200'
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {uploading && (
        <div className="p-3 text-center text-xs text-blue-600 bg-blue-50 font-medium animate-pulse border-b border-blue-100 rounded-t-xl">
          Uploading item to shared locker drive...
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-1 relative">
        {loading ? (
          <p className="text-[11px] text-slate-400 text-center py-8">Syncing files...</p>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-center px-4">
            <span className="text-xl mb-1">📁</span>
            <p className="text-xs font-medium">Locker is empty</p>
            <p className="text-[10px] text-slate-300 mt-0.5">Drag files here or click below to upload</p>
          </div>
        ) : (
          files.map((file) => {
            const isWhiteboard = file.name.startsWith('Whiteboard_')
            const isMenuOpen = activeMenuFile === file.id
            const isEditingThis = isRenamingFile === file.id

            return (
              <div
                key={file.id}
                draggable
                onDragStart={(e) => handleFileDragStart(e, file.name)}
                className="w-full flex items-center justify-between p-1.5 bg-white/40 hover:bg-white border border-slate-150/50 rounded-lg text-left transition group relative cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {isWhiteboard ? (
                    <span className="p-1 bg-amber-50 rounded text-amber-600 text-xs font-bold shrink-0">🎨</span>
                  ) : (
                    <span className="p-1 bg-blue-50 rounded text-blue-600 text-xs font-bold shrink-0">📄</span>
                  )}
                  
                  {isEditingThis ? (
                    <input
                      type="text"
                      value={newNameText}
                      autoFocus
                      onChange={(e) => setNewNameText(e.target.value)}
                      onBlur={() => handleFileRename(file.name)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleFileRename(file.name)
                        if (e.key === 'Escape') setIsRenamingFile(null)
                      }}
                      className="text-xs font-medium bg-slate-50 px-1 py-0.5 border border-blue-400 outline-hidden rounded flex-1 min-w-0"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleFileClick(file.name)}
                      className="text-xs font-medium text-slate-700 truncate hover:text-blue-600 text-left flex-1"
                    >
                      {file.name}
                    </button>
                  )}
                </div>

                {/* Utility Controls Overlay Anchor */}
                <div className="flex items-center gap-1 shrink-0 ml-2 relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setNewNameText(file.name)
                      setActiveMenuFile(isMenuOpen ? null : file.id)
                    }}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 text-xs font-bold transition"
                  >
                    •••
                  </button>

                  {/* Context Actions Menu Panel Popup */}
                  {isMenuOpen && (
                    <div 
                      ref={menuRef}
                      className="absolute right-0 top-6 w-28 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-100"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setIsRenamingFile(file.id)
                          setActiveMenuFile(null)
                        }}
                        className="w-full text-left px-2.5 py-1.5 text-[11px] text-slate-700 hover:bg-slate-50 transition font-medium"
                      >
                        ✏️ Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFileDelete(file.name)}
                        className="w-full text-left px-2.5 py-1.5 text-[11px] text-red-600 hover:bg-red-50 transition font-medium"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="p-2 border-t border-slate-200 bg-white rounded-b-xl flex justify-end shrink-0">
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
        />
        <button 
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-[11px] px-2.5 py-1.5 font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition"
        >
          + Upload File
        </button>
      </div>
    </div>
  )
}