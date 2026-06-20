import { useState, useEffect, useCallback } from 'react';
import { customerService } from '../customer.service';
import { useAuth } from '@/app/common/context/AuthContext';

export function useCustomers() {
  const { userRole, isAuthChecking, logout } = useAuth();
  
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 💡 NEW: Wrapped in useCallback so we can safely export it for manual refreshing!
  const fetchCustomers = useCallback(async () => {
    // THE FIX: If auth is done, but the user has no role, kill the spinner!
    if (!userRole) {
      console.warn("⚠️ Auth finished, but userRole is missing. Cannot fetch customers.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      let response = userRole === 'employee'
        ? await customerService.getMyCustomers()
        : await customerService.getAllCustomers();
        
      let rawCustomers = response?.data?.data?.customers || response?.data?.data?.portfolio || response?.data?.customers || response?.customers || [];        

      const formattedData = rawCustomers.map(c => ({
        id: c.id || c._id || Math.random().toString(),
        managerId: c.managerId || 'none',
        manager: c.managerName || 'Unassigned',
        company: c.name || c.companyName || c.company || 'Unknown Company',
        outstanding: c.aging?.total || c?.outstanding || 0,
        current: c.aging?.current || c?.current || 0,
        d30: c.aging?.thirtyPlus || c?.thirtyPlus || 0,
        d60: c.aging?.sixtyPlus || c?.sixtyPlus || 0,
        d90: c.aging?.ninetyPlus || c?.ninetyPlus || 0,
        
        // 💡 THE CRITICAL FIX: Pass the CRM fields through to the table!
        isCrmLinked: c.isCrmLinked || !!c.crmId || false,
        crmId: c.crmId || null
      }));

      setCustomers(formattedData);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
      if (error?.response?.status === 401 || error?.message?.includes('401')) {
        logout(); 
      }
      setCustomers([]); 
    } finally {
      setIsLoading(false);
    }
  }, [userRole, logout]);

  useEffect(() => {
    // Wait patiently if AuthContext is still loading
    if (isAuthChecking) return;
    fetchCustomers();
  }, [isAuthChecking, fetchCustomers]);

  // 💡 THE EXPORT: Now 'refresh' is available to your UnifiedDashboard!
  return { customers, isLoading, refresh: fetchCustomers };
}