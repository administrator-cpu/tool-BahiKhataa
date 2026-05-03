import { CheckCircle2, XCircle } from 'lucide-react';

export const AdaptiveAction = ({ type, onClick }) => {
  const isApprove = type === 'approve';
  
  return (
    <button 
      onClick={onClick}
      className={`
        flex items-center justify-center gap-2 p-2 md:px-2 rounded-xl transition-all active:scale-95
        ${isApprove 
          ? 'bg-green-100 text-green-700 hover:bg-green-200 shadow-sm shadow-green-100' 
          : 'bg-red-50 text-red-600 hover:bg-red-100 shadow-sm shadow-red-100'}
      `}
    >
      {isApprove ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
      
      <span className="hidden md:inline-block text-[10px] font-black uppercase tracking-wider">
        {isApprove ? 'Approve' : 'Reject'}
      </span>
    </button>
  );
};