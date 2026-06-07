"use client"
export default function BillingTab() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-black tracking-tight">Billing & Invoices</h1>
        <p className="text-sm text-slate-500">Review your ledger balances, payment history receipts, and subscription states</p>
      </div>
      
      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-12 text-center">
        <span className="text-2xl block mb-2">💳</span>
        <h4 className="text-sm font-bold text-slate-700">Payment Gateway Integration Coming Soon</h4>
        <p className="text-xs text-slate-400 mt-1">Stripe transaction ledgers and automated tuition invoice tracking will mount here shortly.</p>
      </div>
    </div>
  )
}