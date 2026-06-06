"use client"
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function EditableFileDirectory({ folderPath }: { folderPath: string }) {
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dragging, setDragging] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  useEffect(() => {
    fetchFiles()
  }, [folderPath])

  async function fetchFiles() {
    setLoading(true)
    const { data, error } = await supabase.storage.from('classroom-files').list(folderPath)
    if (!error && data) setFiles(data)
    setLoading(false)
  }

  // File Upload Logic
  async function handleUpload(file: File) {
    const targetPath = `${folderPath}/${file.name}`
    const { error } = await supabase.storage.from('classroom-files').upload(targetPath, file)
    if (error) alert("Upload error: " + error.message)
    else fetchFiles()
  }

  // Delete Action
  async function handleDelete(fileName: string) {
    if (!confirm("Are you sure you want to delete this resource asset?")) return
    const { error } = await supabase.storage.from('classroom-files').remove([`${folderPath}/${fileName}`])
    if (error) alert("Deletion failed")
    else fetchFiles()
  }

  // Rename Pipeline Execute
  async function saveRename(oldName: string) {
    if (!renameValue.trim()) return
    const { error } = await supabase.storage.from('classroom-files').move(
      `${folderPath}/${oldName}`,
      `${folderPath}/${renameValue}`
    )
    if (error) alert("Rename failed: " + error.message)
    else {
      setEditingId(null)
      fetchFiles()
    }
  }

  // Drag and Drop event interception handlers
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); }
  const onDragLeave = () => setDragging(false)
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0])
    }
  }

  return (
    <div 
      onDragOver={onDragOver} 
      onDragLeave={onDragLeave} 
      onDrop={onDrop}
      className={`flex-1 flex flex-col min-h-0 bg-white transition-colors p-4 ${dragging ? 'bg-blue-50/50 border-2 border-dashed border-blue-400' : ''}`}
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Asset Catalog Tree</span>
        <label className="text-[11px] font-black text-blue-600 hover:underline cursor-pointer">
          📤 Upload File
          <input type="file" className="hidden" onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />
        </label>
      </div>

      {loading ? (
        <p className="text-xs text-slate-400 animate-pulse text-center py-20">Refreshing assets matrix...</p>
      ) : files.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
          Drag and drop files here to store them safely.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
          {files.map(file => (
            <div key={file.id} className="p-2.5 border border-slate-100 rounded-xl flex items-center justify-between text-xs hover:bg-slate-50 transition group">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-base">📄</span>
                {editingId === file.id ? (
                  <input 
                    type="text" 
                    value={renameValue} 
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={() => saveRename(file.name)}
                    className="border border-blue-500 rounded px-1 py-0.5 text-xs outline-none bg-white w-2/3"
                    autoFocus
                  />
                ) : (
                  <span className="font-medium text-slate-700 truncate">{file.name}</span>
                )}
              </div>

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                <button 
                  onClick={() => { setEditingId(file.id); setRenameValue(file.name); }}
                  className="text-slate-400 hover:text-blue-600 text-[11px] font-bold"
                >
                  Rename
                </button>
                <button 
                  onClick={() => handleDelete(file.name)}
                  className="text-slate-400 hover:text-red-600 text-[11px] font-bold"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}