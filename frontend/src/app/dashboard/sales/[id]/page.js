"use client";

import React, { useState, useEffect } from 'react';
import { Building2, AlertCircle, TrendingUp, Users, Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';

// Layout & Components
import DashboardLayout from '@/app/common/layout/DashboardLayout';
import StatCard from '@/app/common/components/StatCard';
import CustomerTable from '@/app/modules/customers/components/CustomerTable';
import { formatCurrency } from '@/app/common/lib/utils';

// Services
import { customerService } from '@/app/modules/customers/customer.service';

export default function SalesManagerLedger() {
  const params = useParams(); 
  const managerId = params?.id;
  
  const [assignedClients, setAssignedClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!managerId) return;

    const fetchManagerData = async () => {
      setIsLoading(true);
      try {
        // Fetch only the Portfolio data
        const portfolioRes = await customerService.getManagerPortfolio(managerId);

        
        // Map the backend Portfolio data to fit the CustomerTable
        setAssignedClients(portfolioRes.data.data.portfolio.map(c => (
          {
          
          id: c.id || c._id,
          company: c.name,
          manager: c.managerName || 'Unassigned',
          managerId: c.managerId || 'none',
          outstanding: c?.aging?.total || 0,
          current: c?.aging?.current || 0,
          d30: c?.aging?.thirtyPlus || 0,
          d60: c?.aging?.sixtyPlus || 0,
          d90: c?.aging?.ninetyPlus || 0
        })));

      } catch (error) {
        console.error("Error fetching manager profile:", error);
        toast.error("Failed to load manager profile data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchManagerData();
  }, [managerId]);

  // Calculate Territory Totals dynamically from the fetched data
  const totals = assignedClients.reduce((acc, curr) => {
    acc.outstanding += (curr.outstanding || 0);
    acc.d90 += (curr.d90 || 0);
    return acc;
  }, { outstanding: 0, d90: 0 });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-screen -mt-20">
          <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
          <p className="font-bold text-slate-500">Loading Manager Profile...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumbs={<span className="font-bold">Manager Profile</span>}>
      
      {/* TERRITORY KPI HEADER */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <StatCard 
          title="Assigned Clients" 
          value={assignedClients.length.toString()} 
          icon={Users} 
          colorTheme="purple" 
        />
        <StatCard 
          title="Territory Outstanding" 
          value={formatCurrency(totals.outstanding)} 
          icon={TrendingUp} 
          colorTheme="blue" 
        />
        <StatCard 
          title="Critical (90+ Days)" 
          value={formatCurrency(totals.d90)} 
          icon={AlertCircle} 
          colorTheme="red" 
        />
      </div>

      <div>
        {/* CLIENT PORTFOLIO */}
        <div className="flex flex-col h-[700px]">
          <h2 className="flex items-center gap-2 mb-4 text-lg font-bold text-slate-900">
            <Building2 size={20} className="text-blue-600" /> Assigned Portfolio
          </h2>
          <CustomerTable customers={assignedClients} currentUserRole="employee" />
        </div>
      </div>
      
    </DashboardLayout>
  );
}