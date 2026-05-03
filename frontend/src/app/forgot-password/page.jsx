"use client";

import React, { useState } from 'react';
import { Mail, Key, ShieldCheck, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import InputField from '../common/components/InputField';
import Button from '../common/components/Button';
import { useAsyncAction } from '../common/hooks/useAsyncAction';
import { authService } from '../modules/auth/auth.service';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { execute, isLoading } = useAsyncAction();
  
  // Track progress: 1 = Email, 2 = OTP, 3 = New Password
  const [step, setStep] = useState(1); 
  
  // Form state
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [temporaryToken, setTemporaryToken] = useState(null);

  // STEP 1: Request OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    await execute(
      () => authService.forgotPassword(email),
      {
        loadingMessage: 'Sending OTP...',
        successMessage: 'OTP sent to your email!',
        onSuccess: () => setStep(2) // Reveal Step 2
      }
    );
  };

  // STEP 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    await execute(
      () => authService.verifyOtp({ email, otp }),
      {
        loadingMessage: 'Verifying...',
        successMessage: 'OTP verified!',
        onSuccess: (res) => {
          
          setTemporaryToken(res.data.temporaryToken || res.temporaryToken);
          setStep(3); // Reveal Step 3
        }
      }
    );
  };

  // STEP 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    await execute(
      () => authService.resetPassword({ temporaryToken, password }),
      {
        loadingMessage: 'Updating password...',
        successMessage: 'Password reset successfully! You can now log in.',
        onSuccess: () => {
          // Send them back to the login page
          router.push('/login'); 
        }
      }
    );
  };

  return (
    <main className="flex items-center justify-center min-h-screen p-4 font-sans bg-[#F8F9FA] text-slate-800">
      <div className="w-full max-w-md overflow-hidden bg-white border shadow-xl border-slate-200 rounded-3xl">
        
        {/* HEADER */}
        <div className="relative p-8 overflow-hidden text-center bg-slate-900">
          {/* Back button (Only show on Step 1) */}
          {step === 1 && (
            <button 
              onClick={() => router.push('/login')}
              className="absolute flex items-center gap-2 text-sm transition-colors top-6 left-6 text-slate-400 hover:text-white"
            >
              <ArrowLeft size={16} /> Back
            </button>
          )}

          <div className="absolute top-0 w-64 h-64 bg-blue-500 rounded-full left-1/2 blur-3xl -translate-y-1/2 -translate-x-1/2 opacity-20" />
          <div className="relative z-10 mt-6">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 border rounded-2xl bg-white/10 border-white/20">
              {step === 1 && <Mail size={32} className="text-blue-400" />}
              {step === 2 && <ShieldCheck size={32} className="text-blue-400" />}
              {step === 3 && <CheckCircle2 size={32} className="text-blue-400" />}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {step === 1 && "Reset Password"}
              {step === 2 && "Enter OTP"}
              {step === 3 && "Secure Account"}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              {step === 1 && "Enter your email to receive a recovery code."}
              {step === 2 && `We sent a 6-digit code to ${email}`}
              {step === 3 && "Create a new, strong password."}
            </p>
          </div>
        </div>

        {/* DYNAMIC FORM AREA */}
        <div className="p-8">
          
          {step === 1 && (
            <form onSubmit={handleRequestOtp} className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <InputField 
                icon={Mail} label="Work Email" type="email" required 
                value={email} onChange={(e) => setEmail(e.target.value)} 
                placeholder="name@company.com" 
              />
              <Button type="submit" isLoading={isLoading} className="w-full">
                Send Recovery Code
              </Button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <InputField 
                icon={Key} label="6-Digit OTP" type="text" required 
                maxLength={6}
                value={otp} onChange={(e) => setOtp(e.target.value)} 
                placeholder="123456" 
                className="text-center font-mono tracking-[0.5em] text-lg"
              />
              <Button type="submit" isLoading={isLoading} className="w-full">
                Verify Code
              </Button>
              <button 
                type="button" 
                onClick={() => setStep(1)}
                className="w-full mt-2 text-sm font-medium transition-colors text-slate-500 hover:text-blue-600"
              >
                Wrong email? Go back
              </button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <InputField 
                icon={Key} label="New Password" type="password" required 
                minLength={8}
                value={password} onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••" 
              />
              <Button type="submit" isLoading={isLoading} className="w-full text-white bg-green-600 hover:bg-green-700 border-green-600">
                Update Password
              </Button>
            </form>
          )}

        </div>
      </div>
    </main>
  );
}