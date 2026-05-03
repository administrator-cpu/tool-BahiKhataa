"use client";

import React, { useState } from 'react';
import { UserPlus, Mail, ShieldCheck, Key, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import PageHeader from '@/app/common/components/PageHeader';
import InputField from '@/app/common/components/InputField';
import Button from '@/app/common/components/Button';
import { authService } from '@/app/modules/auth/auth.service';
import DashboardLayout from '@/app/common/layout/DashboardLayout';

export default function CreateUserPage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({ 
    fullName: '', email: '', password: '', role: 'sales' 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Start loading toast
    const toastId = toast.loading('Provisioning new user credentials...');

    try {
      // 1. Call your modular API service
      await authService.createEmployee(formData);
      
      // 2. Success Toast & Redirect
      toast.success('User account provisioned successfully!', { id: toastId });
      router.push('/dashboard');

    } catch (error) {
      // 3. Error Toast (Catches the AppError messages from your Express controller)
      toast.error(error.message || 'Failed to create user account.', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout breadcrumbs={<span className="font-bold">Provision User</span>}>
      <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        
        <PageHeader 
          title="User Onboarding" 
          subtitle="Create secure access credentials and define system roles." 
          icon={UserPlus} 
          theme="blue"
        />

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            <InputField 
              className="sm:col-span-2" label="Full Name" name="fullName"
              required value={formData.fullName} onChange={handleChange} 
              placeholder="e.g. Rahul Sharma" 
            />

            <InputField 
              icon={Mail} label="Work Email" type="email" name="email"
              required value={formData.email} onChange={handleChange} 
              placeholder="rahul@bahikhata.pro" 
            />

            <InputField 
              icon={Key} label="Temporary Password" type="password" name="password"
              required value={formData.password} onChange={handleChange} 
              placeholder="••••••••" 
            />

            <div className="sm:col-span-2 pt-4 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-1.5"><Shield size={14}/> Access Role</label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Sales Role Option */}
                <label className={`flex items-start gap-4 p-4 border rounded-2xl cursor-pointer transition-all ${formData.role === 'sales' ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600 shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                  <input type="radio" name="role" value="sales" checked={formData.role === 'sales'} onChange={handleChange} className="hidden" />
                  <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${formData.role === 'sales' ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-slate-50'}`}>
                    {formData.role === 'sales' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div>
                    <p className={`font-bold text-sm ${formData.role === 'sales' ? 'text-blue-900' : 'text-slate-900'}`}>Sales Agent (Maker)</p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">Can view assigned portfolio and log payments from the field.</p>
                  </div>
                </label>

                {/* Admin Role Option */}
                <label className={`flex items-start gap-4 p-4 border rounded-2xl cursor-pointer transition-all ${formData.role === 'admin' ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900 shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                  <input type="radio" name="role" value="admin" checked={formData.role === 'admin'} onChange={handleChange} className="hidden" />
                  <div className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${formData.role === 'admin' ? 'border-slate-900 bg-slate-900' : 'border-slate-300 bg-slate-50'}`}>
                    {formData.role === 'admin' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div>
                    <p className={`font-bold text-sm ${formData.role === 'admin' ? 'text-slate-900' : 'text-slate-900'}`}>Administrator (Checker)</p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">Full access to global ledger, invoicing, and payment approvals.</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <ShieldCheck size={16} className="text-green-500" /> Account activates immediately upon creation.
            </div>
            
            {/* Modular Button Component */}
            <Button type="submit" isLoading={isSubmitting} variant="primary" className="w-full sm:w-auto">
              Create User
            </Button>
            
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}