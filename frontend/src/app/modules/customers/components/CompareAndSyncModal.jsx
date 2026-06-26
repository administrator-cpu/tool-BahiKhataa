import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Database, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRightLeft,
  MapPin,
  Receipt,
  Mail
} from 'lucide-react';
import ModalWrapper from '@/app/common/components/ModalWrapper';
import Button from '@/app/common/components/Button';
import { customerService } from '@/app/modules/customers/customer.service';
import toast from 'react-hot-toast';

export default function CompareAndSyncModal({ isOpen, onClose, customerId, customerName, onSuccess }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);
  
  const [matchFound, setMatchFound] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [message, setMessage] = useState('');

  // Fetch the preview data when the modal opens
  useEffect(() => {
    if (!isOpen || !customerId) return;

    const fetchPreview = async () => {
      setIsLoading(true);
      try {
        const response = await customerService.getCRMPreview(customerId);
        
        if (response.data?.matchFound) {
          setMatchFound(true);
          setPreviewData(response.data.data);
        } else {
          setMatchFound(false);
          setMessage(response.data?.message || 'No exact match found in the CRM.');
        }
      } catch (error) {
        console.error("Preview Fetch Error:", error);
        setMatchFound(false);
        setMessage('Failed to communicate with the CRM. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreview();
  }, [isOpen, customerId]);

  // Handle the official linking
  const handleLinkAccounts = async () => {
    if (!previewData?.crmPreview?._id) return;
    
    setIsLinking(true);
    try {
      await customerService.linkCRMCustomer(customerId, previewData.crmPreview._id);
      toast.success('Successfully linked to CRM!');
      onSuccess(); // Triggers a refresh in the parent component
      onClose();
    } catch (error) {
      toast.error('Failed to link accounts. Please try again.');
    } finally {
      setIsLinking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalWrapper title="CRM Synchronization" onClose={onClose}>
      
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="animate-spin text-blue-600" size={32} />
          <p className="text-sm font-medium text-slate-500">Scanning Central CRM for matches...</p>
        </div>
      ) : !matchFound ? (
        <div className="py-8 text-center">
          <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">No Automatic Match Found</h3>
          <p className="text-sm text-slate-500 mb-6 px-4">
            We couldn't find an exact match for <strong>"{customerName}"</strong> in the central CRM. Ensure the spelling matches exactly, or create the customer in the CRM first.
          </p>
          <Button onClick={onClose} variant="secondary">Close</Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm font-medium flex items-start gap-3">
            <CheckCircle2 className="shrink-0 mt-0.5 text-blue-600" size={18} />
            <p>Match found! Please verify that these are the exact same entities before permanently linking them.</p>
          </div>

          {/* SPLIT SCREEN COMPARISON */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
            
            {/* VS Icon in the middle */}
            <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white border border-slate-200 rounded-full items-center justify-center shadow-sm z-10 text-slate-400">
              <ArrowRightLeft size={16} />
            </div>

            {/* LEFT: Local Bahi Khata Data */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><Building2 size={14}/> Bahi Khata</span>
                <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-bold">Local</span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Company Name</p>
                  <p className="font-bold text-slate-900">{previewData.bahiKhataCustomer?.companyName}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Email</p>
                  <p className="text-sm text-slate-700 flex items-center gap-2"><Mail size={14} className="text-slate-400"/> {previewData.bahiKhataCustomer?.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">GST Number</p>
                  <p className="text-sm text-slate-700 flex items-center gap-2 font-mono"><Receipt size={14} className="text-slate-400"/> {previewData.bahiKhataCustomer?.gstNumber || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* RIGHT: Central CRM Data */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-indigo-200">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5"><Database size={14}/> Central CRM</span>
                <span className="text-[10px] bg-indigo-200 text-indigo-700 px-2 py-0.5 rounded font-bold">Master</span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] text-indigo-400 uppercase font-bold mb-1">Company Name</p>
                  <p className="font-bold text-slate-900">{previewData.crmPreview?.name}</p>
                </div>
                <div>
                  <p className="text-[10px] text-indigo-400 uppercase font-bold mb-1">Contact</p>
                  <p className="text-sm text-slate-700 flex items-center gap-2"><Mail size={14} className="text-indigo-400"/> {previewData.crmPreview?.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-indigo-400 uppercase font-bold mb-1">Locations</p>
                  <p className="text-sm text-slate-700 flex items-center gap-2"><MapPin size={14} className="text-indigo-400"/> {previewData.crmPreview?.billingProfile?.length || 0} Registered Address(es)</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
            <Button onClick={onClose} disabled={isLinking} variant="secondary">Cancel</Button>
            <Button onClick={handleLinkAccounts} isLoading={isLinking} variant="primary">
              Yes, Link Accounts
            </Button>
          </div>
        </div>
      )}
    </ModalWrapper>
  );
}