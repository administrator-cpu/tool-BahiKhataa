"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { 
  BarChart3, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Loader2,
  AlertTriangle,
  RefreshCw,
  Search,
  X,
  Download,
  Filter,
  ArrowUpDown,
  TrendingUp,
  Users,
  Link as LinkIcon
} from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

// Architecture & Components
import DashboardLayout from "@/app/common/layout/DashboardLayout";
import PageHeader from "@/app/common/components/PageHeader";
import Button from "@/app/common/components/Button";

// Hooks & Services
import { useAuth } from "@/app/common/context/AuthContext";
import { customerService } from "@/app/modules/customers/customer.service";

export default function CRMAuditPage() {
  const router = useRouter();
  const { userRole, isAuthChecking } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [auditData, setAuditData] = useState(null);
  const [error, setError] = useState(null);

  // 🆕 Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'matched', 'unmatched'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc', 'desc'

  // Fetch the Audit Data
  const fetchAuditData = useCallback(async (showToast = false) => {
    setIsRefreshing(true);
    setError(null);
    try {
      const response = await customerService.getCRMAudit();
      setAuditData(response.data?.data || response.data);
      if (showToast) toast.success("Audit data refreshed successfully!");
    } catch (err) {
      console.error("Failed to fetch CRM audit:", err);
      
      // Better error handling
      if (err.response) {
        const status = err.response.status;
        switch (status) {
          case 502:
          case 503:
            setError("CRM service is temporarily unavailable. Please try again later.");
            break;
          case 401:
            setError("Your session has expired. Please refresh the page.");
            break;
          case 403:
            setError("You don't have permission to access the audit report.");
            break;
          default:
            setError(`Audit failed (Error ${status}). Please try again.`);
        }
      } else if (err.request) {
        setError("Cannot connect to the server. Please check your connection.");
      } else {
        setError("Failed to run the CRM audit. Please try again.");
      }
      
      if (showToast) toast.error("Failed to fetch audit report.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // 1. Wait for AuthContext to figure out who is logged in
    if (isAuthChecking) return;
    
    // 2. Strict Admin Gatekeeper
    if (userRole !== 'admin') {
      toast.error("Unauthorized Access. Admins only.");
      router.replace('/dashboard');
      return;
    }

    // 3. Only fetch data if we confirm they are an admin
    fetchAuditData();
  }, [userRole, isAuthChecking, router, fetchAuditData]);

  // 🆕 Filter and sort data
  const filteredData = useMemo(() => {
    if (!auditData?.lists) return { readyToSync: [], needsAttention: [] };

    let readyToSync = [...(auditData.lists.readyToSync || [])];
    let needsAttention = [...(auditData.lists.needsAttention || [])];

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      readyToSync = readyToSync.filter(name => name.toLowerCase().includes(term));
      needsAttention = needsAttention.filter(name => name.toLowerCase().includes(term));
    }

    // Apply sort
    if (sortOrder === 'desc') {
      readyToSync.reverse();
      needsAttention.reverse();
    }

    return { readyToSync, needsAttention };
  }, [auditData, searchTerm, sortOrder]);

  // 🆕 Calculate enhanced metrics
  const enhancedMetrics = useMemo(() => {
    if (!auditData?.metrics) return null;
    
    const total = auditData.metrics.totalBahiKhataCustomers || 0;
    const matched = auditData.metrics.exactMatchesFound || 0;
    const unmatched = auditData.metrics.missingFromCrm || 0;
    const matchPercentage = total > 0 ? ((matched / total) * 100).toFixed(1) : 0;
    
    return {
      ...auditData.metrics,
      matchPercentage: `${matchPercentage}%`,
      matchPercentageNumber: parseFloat(matchPercentage),
      total,
      matched,
      unmatched
    };
  }, [auditData]);

  // 🆕 Export to CSV
  const exportToCSV = () => {
    if (!auditData?.lists) return;
    
    const csvContent = [
      ['Status', 'Company Name'],
      ...filteredData.readyToSync.map(name => ['Matched', name]),
      ...filteredData.needsAttention.map(name => ['Needs Attention', name])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crm-audit-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Report downloaded!");
  };

  // ==========================================
  // 🔒 SECURITY GATES
  // ==========================================
  
  if (isAuthChecking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
        <p className="text-slate-500 font-medium">Verifying credentials...</p>
      </div>
    );
  }

  if (userRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <Loader2 size={40} className="animate-spin text-red-500 mb-4" />
        <p className="text-slate-500 font-medium">Redirecting to safe zone...</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout hideBack={false}>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
          <p className="text-slate-500 font-medium">Running cross-database comparison...</p>
          <p className="text-xs text-slate-400 mt-2">This may take a moment for large datasets</p>
        </div>
      </DashboardLayout>
    );
  }

  // ==========================================
  // ❌ ERROR STATE
  // ==========================================
  if (error) {
    return (
      <DashboardLayout hideBack={false}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Audit Failed</h2>
          <p className="text-sm text-slate-500 mb-6">{error}</p>
          <div className="flex gap-3">
            <Button onClick={() => fetchAuditData(true)} variant="primary" icon={RefreshCw}>
              Try Again
            </Button>
            <Button onClick={() => router.push('/dashboard')} variant="secondary">
              Back to Dashboard
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ==========================================
  // ✅ MAIN RENDER
  // ==========================================
  return (
    <DashboardLayout
      breadcrumbs={
        <>
          <span 
            className="text-slate-500 cursor-pointer hover:text-slate-900 transition-colors" 
            onClick={() => router.push("/dashboard")}
          >
            Dashboard
          </span>
          <span className="text-slate-300 mx-2">/</span>
          <span className="text-slate-900 font-bold">System Audit</span>
        </>
      }
    >
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <PageHeader
          title="CRM Migration Audit"
          subtitle="Compare Bahi Khata local records against the Central CRM master database."
          icon={ShieldCheck}
          theme="blue"
        />
        <div className="flex items-center gap-2">
          <Button 
            variant="secondary" 
            icon={Download} 
            onClick={exportToCSV}
            disabled={!auditData?.lists}
            className="text-xs"
          >
            Export CSV
          </Button>
          <Button 
            variant="secondary" 
            icon={RefreshCw} 
            onClick={() => fetchAuditData(true)}
            isLoading={isRefreshing}
          >
            Rerun Audit
          </Button>
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        
        {/* Total Local */}
        <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-500 shrink-0 group-hover:scale-110 transition-transform">
              <Database size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Local</p>
              <p className="text-2xl font-black text-slate-800">
                {enhancedMetrics?.totalBahiKhataCustomers?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Total CRM Fetched */}
        <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0 group-hover:scale-110 transition-transform">
              <BarChart3 size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-0.5">CRM Pool</p>
              <p className="text-2xl font-black text-slate-800">
                {enhancedMetrics?.totalCrmCustomersFetched?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Exact Matches */}
        <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow group cursor-pointer" onClick={() => setActiveFilter('matched')}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-110 transition-transform">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-0.5">Ready to Sync</p>
              <p className="text-2xl font-black text-slate-800">
                {enhancedMetrics?.exactMatchesFound?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Needs Attention */}
        <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow group cursor-pointer" onClick={() => setActiveFilter('unmatched')}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center text-amber-500 shrink-0 group-hover:scale-110 transition-transform">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-0.5">Needs Attention</p>
              <p className="text-2xl font-black text-slate-800">
                {enhancedMetrics?.missingFromCrm?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* PROGRESS BAR SECTION */}
      <div className="bg-white p-6 border border-slate-200 rounded-2xl shadow-sm mb-6">
        <div className="flex items-end justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-500" />
              Database Alignment
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {enhancedMetrics?.matchPercentageNumber >= 90 
                ? 'Excellent! Most records are synchronized.' 
                : enhancedMetrics?.matchPercentageNumber >= 50 
                  ? 'Good progress. Some records need attention.'
                  : 'Significant work needed to align databases.'}
            </p>
          </div>
          <div className="text-2xl font-black text-emerald-500">
            {enhancedMetrics?.matchPercentage || '0%'}
          </div>
        </div>
        
        <div className="w-full bg-slate-100 rounded-full h-4 mb-2 overflow-hidden flex border border-slate-200">
          <div 
            className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-4 transition-all duration-1000 ease-out relative"
            style={{ width: `${enhancedMetrics?.matchPercentageNumber || 0}%` }}
          >
            {enhancedMetrics?.matchPercentageNumber > 15 && (
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white">
                {enhancedMetrics?.matchPercentageNumber > 30 ? enhancedMetrics?.matchPercentage : ''}
              </span>
            )}
          </div>
          <div 
            className="bg-gradient-to-r from-amber-300 to-amber-400 h-4 transition-all duration-1000 ease-out relative"
            style={{ width: `${100 - (enhancedMetrics?.matchPercentageNumber || 0)}%` }}
          >
            {enhancedMetrics?.matchPercentageNumber < 85 && (
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white">
                {enhancedMetrics?.matchPercentageNumber < 70 ? `${100 - enhancedMetrics?.matchPercentageNumber}%` : ''}
              </span>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-6 mt-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
            {enhancedMetrics?.matched || 0} matched
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
            {enhancedMetrics?.unmatched || 0} need attention
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <Users size={12} />
            {enhancedMetrics?.total || 0} total
          </div>
        </div>
      </div>

      {/* 🆕 SEARCH & FILTER BAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search companies by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
        
        <div className="flex gap-2">
          <div className="flex bg-slate-100 rounded-xl p-1">
            {[
              { value: 'all', label: 'All' },
              { value: 'matched', label: 'Matched' },
              { value: 'unmatched', label: 'Needs Work' }
            ].map(filter => (
              <button
                key={filter.value}
                onClick={() => setActiveFilter(filter.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeFilter === filter.value
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
            title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
          >
            <ArrowUpDown size={16} className={`text-slate-500 ${sortOrder === 'desc' ? 'rotate-180' : ''} transition-transform`} />
          </button>
        </div>
      </div>

      {/* DATA LISTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* GREEN COLUMN: Ready to Sync */}
        {(activeFilter === 'all' || activeFilter === 'matched') && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[500px]">
            <div className="p-5 border-b border-slate-100 bg-emerald-50/50 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 size={18} />
                <h3 className="font-bold text-sm">Exact Matches Found</h3>
              </div>
              <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">
                {filteredData.readyToSync.length} Clients
              </span>
            </div>
            
            <div className="p-2 overflow-y-auto customScroller flex-1">
              {filteredData.readyToSync.length > 0 ? (
                <ul className="space-y-1">
                  {filteredData.readyToSync.map((name, idx) => (
                    <li 
                      key={idx} 
                      className="flex items-center gap-3 p-3 hover:bg-emerald-50/50 rounded-xl transition-all border border-transparent hover:border-emerald-100 group"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 group-hover:scale-150 transition-transform"></div>
                      <span className="text-sm font-bold text-slate-700 flex-1 truncate">{name}</span>
                      <LinkIcon size={14} className="text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <Search size={24} className="mb-2" />
                  <p className="text-sm font-medium">
                    {searchTerm ? 'No matches found for your search' : 'No automatic matches found'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* RED/ORANGE COLUMN: Needs Attention */}
        {(activeFilter === 'all' || activeFilter === 'unmatched') && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[500px]">
            <div className="p-5 border-b border-slate-100 bg-amber-50/50 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertCircle size={18} />
                <h3 className="font-bold text-sm">Missing / Name Mismatch</h3>
              </div>
              <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                {filteredData.needsAttention.length} Clients
              </span>
            </div>
            
            <div className="p-2 overflow-y-auto customScroller flex-1">
              {filteredData.needsAttention.length > 0 ? (
                <ul className="space-y-1">
                  {filteredData.needsAttention.map((name, idx) => (
                    <li 
                      key={idx} 
                      className="flex items-center gap-3 p-3 hover:bg-amber-50/30 rounded-xl transition-all border border-transparent hover:border-amber-100/50 group"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 group-hover:scale-150 transition-transform"></div>
                      <span className="text-sm font-bold text-slate-700 flex-1 truncate">{name}</span>
                      <AlertCircle size={14} className="text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <CheckCircle2 size={24} className="mb-2 text-emerald-400" />
                  <p className="text-sm font-medium">
                    {searchTerm ? 'No unmatched records for your search' : 'All records match perfectly!'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}