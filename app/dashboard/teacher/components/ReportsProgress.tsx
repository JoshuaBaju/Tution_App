// app/dashboard/teacher/components/ReportsProgress.tsx
export default function ReportsProgress({ teacherId }: { teacherId: string }) {
  return (
    <div className="p-4 text-center space-y-2">
      <span className="text-3xl">📊</span>
      <h3 className="text-sm font-bold text-slate-700">Student Reports & Grading Metrics</h3>
      <p className="text-xs text-slate-400">Context node active for identifier token: {teacherId}</p>
    </div>
  )
}