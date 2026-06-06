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

  // 🔄 Fetch files inside the teacher_parent folder
  const fetchFiles = async () => {
    setLoading(true)
    const { data, error } = await supabase.storage
      .from('classroom-files')
      .list(folderPath, {
        limit: 100,
        sortBy: { column: 'name', order: 'asc' },
      })

    if (error) {
      console.error("Error fetching storage files:", error.message)
    } else {
      // Filter out placeholder system directory objects if any exist
      const userFiles = (data as unknown as FileObject[]).filter(f => f.name !== '.emptyFolderPlaceholder')
      setFiles(userFiles)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (folderPath) {
      fetchFiles()
    }
  }, [folderPath])

  // 📤 Upload handler logic
  const handleFileUpload = async (file: File) => {
    if (!file) return
    setUploading(true)

    const targetPath = `${folderPath}/${file.name}`

    const { error } = await supabase.storage
      .from('classroom-files')
      .upload(targetPath, file, { upsert: true })

    if (error) {
      alert(`Upload failed: ${error.message}`)
    } else {
      fetchFiles() // Refresh directory listing automatically
    }
    setUploading(false)
  }

  // 📦 Generate temporary secure download/view URLs when clicked
  const handleFileClick = async (fileName: string) => {
    const { data, error } = await supabase.storage
      .from('classroom-files')
      .createSignedUrl(`${folderPath}/${fileName}`, 60 * 15) // URL valid for 15 minutes

    if (error) {
      alert("Error generating download link")
    } else if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank') // Open image/PDF in new tab
    }
  }

  // 🎛️ Drag and Drop event listeners
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

  return (
    <div 
      className={`flex-1 flex flex-col min-h-0 transition rounded-xl ${isDragOver ? 'bg-blue-50/50 border-2 border-dashed border-blue-400' : 'bg-slate-50 border border-slate-200'}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Dynamic Drag Drop Info Overlay / Upload State indicator */}
      {uploading && (
        <div className="p-3 text-center text-xs text-blue-600 bg-blue-50 font-medium animate-pulse border-b border-blue-100 rounded-t-xl">
          Uploading item to shared locker drive...
        </div>
      )}

      {/* Interactive Files Map Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {loading ? (
          <p className="text-[11px] text-slate-400 text-center py-8">Syncing files...</p>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-center px-4">
            <svg className="w-8 h-8 text-slate-300 mb-1" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.008 1.24l.885 1.77a2.25 2.25 0 002.007 1.24h1.98a2.25 2.25 0 002.007-1.24l.885-1.77a2.25 2.25 0 012.007-1.24h3.86m-18 0h18a2.25 2.25 0 012.25 2.25v4.25a2.25 2.25 0 01-2.25 2.25H2.25A2.25 2.25 0 010 20.25v-4.25a2.25 2.25 0 012.25-2.25zM16.5 7.5h.008v.008H16.5V7.5z" /></svg>
            <p className="text-xs font-medium">Locker is empty</p>
            <p className="text-[10px] text-slate-300 mt-0.5">Drag files here or click below to upload</p>
          </div>
        ) : (
          files.map((file) => {
            const isWhiteboard = file.name.startsWith('Whiteboard_')
            return (
              <button
                key={file.id}
                onClick={() => handleFileClick(file.name)}
                className="w-full flex items-center justify-between p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg text-left transition group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {/* Visual Icons swapping based on item name matching */}
                  {isWhiteboard ? (
                    <span className="p-1 bg-amber-50 rounded text-amber-600 text-xs font-bold shrink-0">🎨</span>
                  ) : (
                    <span className="p-1 bg-blue-50 rounded text-blue-600 text-xs font-bold shrink-0">📄</span>
                  )}
                  <span className="text-xs font-medium text-slate-700 truncate group-hover:text-blue-600 transition">
                    {file.name}
                  </span>
                </div>
                <span className="text-[9px] text-slate-400 shrink-0 opacity-0 group-hover:opacity-100 transition font-medium">Open ↗</span>
              </button>
            )
          })
        )}
      </div>

      {/* Direct File Selector Trigger Bar */}
      <div className="p-2 border-t border-slate-200 bg-white rounded-b-xl flex justify-end">
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="text-[11px] px-2.5 py-1.5 font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition"
        >
          + Upload File
        </button>
      </div>
    </div>
  )
}