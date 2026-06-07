"use client"
export default function ProfileTab({ parentId }: { parentId: string }) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-black tracking-tight">Account Settings</h1>
        <p className="text-sm text-slate-500">Update your security profile settings and communication parameters</p>
      </div>
      
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <p className="text-xs font-mono text-slate-400 mb-4">Secure Profile Account Reference ID: {parentId}</p>
        <div className="h-32 border border-dashed border-slate-200 rounded-xl bg-slate-50 flex items-center justify-center text-xs font-medium text-slate-400">
          Profile management configuration cards coming soon.
        </div>
      </div>
    </div>
  )
}