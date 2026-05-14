import { useState, useEffect } from 'react';
import { customerService } from '../customer.service';
import { useAuth } from '@/app/common/context/AuthContext';

export function useCustomers() {
  const { userRole, isAuthChecking, logout } = useAuth();
  
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Wait patiently if AuthContext is still loading
    if (isAuthChecking) return;

    // 2. THE FIX: If auth is done, but the user has no role, kill the spinner!
    if (!userRole) {
      console.warn("⚠️ Auth finished, but userRole is missing. Cannot fetch customers.");
      setIsLoading(false);
      return;
    }

    const fetchCustomers = async () => {
      setIsLoading(true);
      try {
        let response = userRole === 'employee'
          ? await customerService.getMyCustomers()
          : await customerService.getAllCustomers();
          
        let rawCustomers = response?.data?.data?.customers||response?.data?.data?.portfolio || response?.data?.customers || response?.customers || [];

        

        const formattedData = rawCustomers.map(c => ({
          id: c.id || Math.random().toString(),
          managerId: c.managerId || 'none',
          manager: c.managerName || 'Unassigned',
          company: c.name || c.companyName || c.company || 'Unknown Company',
          outstanding: c.aging?.total || c?.outstanding || 0,
          current: c.aging?.current || c?.current || 0,
          d30: c.aging?.thirtyPlus || c?.thirtyPlus || 0,
          d60: c.aging?.sixtyPlus || c?.sixtyPlus || 0,
          d90: c.aging?.ninetyPlus || c?.ninetyPlus || 0 
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
    };

    fetchCustomers();
  }, [userRole, isAuthChecking, logout]);

  return { customers, isLoading };
}