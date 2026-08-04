"use client"

interface VideoControlsProps {
  appId?: string
  channelName?: string
  uid?: string
  otherPartyJoined: boolean
  otherPartyName: string
}

export default function VideoControls({
  otherPartyJoined,
  otherPartyName,
}: VideoControlsProps) {
  return (
    <div className="flex flex-col h-full w-full gap-2 relative">
      {/* Video Grid Placeholder */}
      <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
        
        {/* Local Tile */}
        <div className="bg-slate-900 rounded-xl relative flex flex-col items-center justify-center border border-slate-800 shadow-inner overflow-hidden min-h-[80px]">
          <span className="text-xl">📷</span>
          <span className="text-[10px] text-slate-400 font-bold mt-1">Local Camera (Offline)</span>
          <span className="text-[9px] text-slate-300 font-black uppercase absolute bottom-1.5 left-2 bg-slate-950/70 px-1.5 py-0.5 rounded z-10">
            You
          </span>
        </div>

        {/* Remote Tile */}
        <div className="bg-slate-900 rounded-xl relative flex flex-col items-center justify-center border border-slate-800 shadow-inner overflow-hidden min-h-[80px]">
          <span className="text-[10px] text-slate-500 font-bold animate-pulse">
            {otherPartyJoined ? `${otherPartyName} is connected` : "Waiting for peer..."}
          </span>
          <span className="text-[9px] text-slate-300 font-black uppercase absolute bottom-1.5 left-2 bg-slate-950/70 px-1.5 py-0.5 rounded z-10">
            {otherPartyJoined ? otherPartyName : "Offline"}
          </span>
        </div>

      </div>
    </div>
  )
}