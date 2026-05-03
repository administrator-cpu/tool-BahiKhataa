import React, { useState } from 'react';
import { Clock, CheckCircle2, XCircle, IndianRupee, Loader2, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ledgerService } from '../ledger.service';

export default function ApprovalQueue({ pendingPayments, onResolve }) {
  const [processingId, setProcessingId] = useState(null);

  const handleReview = async (id, newStatus) => {
    setProcessingId(id);
    const toastId = toast.loading(`${newStatus === 'approved' ? 'Approving' : 'Rejecting'} payment...`);

    try {
      // 1. Send the decision to the Node.js backend
      await ledgerService.reviewPendingLog(id, { status: newStatus });
      
      // 2. Show success message
      toast.success(`Payment successfully ${newStatus}!`, { id: toastId });
      onResolve(id); 
      
    } catch (error) {
      console.error(error);
      toast.error(`Failed to process payment.`, { id: toastId });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col h-full">
      
      {/* HEADER */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <h2 className="font-bold flex items-center gap-2 text-slate-900">
          <Clock size={18} className="text-orange-500" /> Pending Approvals
        </h2>
        <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full">
          {pendingPayments.length} Tickets
        </span>
      </div>

      {/* QUEUE LIST */}
      <div className="flex-1 overflow-y-auto customScroller p-5 space-y-4">
        
        {pendingPayments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 space-y-3">
            <CheckCircle2 size={40} className="text-green-100" />
            <p className="font-medium text-sm">All caught up! Queue is empty.</p>
          </div>
        ) : (
          pendingPayments.map((ticket) => (
            <div key={ticket.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-blue-200 transition-colors">
              
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{ticket.date}</p>
                  <p className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Building2 size={14} className="text-slate-400"/> {ticket.company}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-black text-green-600 flex items-center gap-1 justify-end">
                    <IndianRupee size={14} /> {ticket.amount?.toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mt-1 border border-slate-200 inline-block">
                    Ref: {ticket.utr}
                  </p>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button 
                  onClick={() => handleReview(ticket.id, 'rejected')}
                  disabled={processingId !== null}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  <XCircle size={14} /> Reject
                </button>
                <button 
                  onClick={() => handleReview(ticket.id, 'approved')}
                  disabled={processingId !== null}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {processingId === ticket.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} 
                  Approve
                </button>
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
}