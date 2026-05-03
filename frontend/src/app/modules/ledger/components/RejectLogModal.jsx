import React, { useState } from 'react';

export default function RejectLogModal({ onClose, onConfirm, isSubmitting }) {
  const [reason, setReason] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) return; // Prevent empty submissions
    onConfirm(reason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="w-full max-w-md p-6 bg-white rounded-2xl shadow-xl">
        
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-red-600">Reject Entry</h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 focus:outline-none"
          >
            &#x2715;
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-600">
          Please provide a reason for rejecting this transaction. This will be visible to the employee.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            autoFocus
            required
            rows="3"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Incorrect UTR number, amount mismatch..."
            className="w-full px-4 py-3 text-sm transition-all border outline-none resize-none bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 text-slate-900"
          />

          <div className="flex justify-end pt-2 space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium transition-colors rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="px-4 py-2 text-sm font-medium text-white transition-colors bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {isSubmitting ? "Rejecting..." : "Confirm Rejection"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}