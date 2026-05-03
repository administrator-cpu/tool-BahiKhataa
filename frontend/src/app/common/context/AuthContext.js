"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
// Import your user service so we can call the profile API
import { userService } from '@/app/modules/users/user.service'; 
import { authService } from '@/app/modules/auth/auth.service';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [userRole, setUserRole] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    if (currentPath === '/login') {
      setIsAuthChecking(false);
      return;
    }

        
    const fetchFreshProfile = async () => {
     try {
        const {data} = await userService.getProfile();
        const secureUser = data?.data?.user || data?.user;

        if (secureUser) {
          setUserRole(secureUser.role); 
        }} catch (error) {
        if (error.data?.status === 401) {
           logout();
        }
      } finally {
        setIsAuthChecking(false);
      }
    };

    fetchFreshProfile();
  }, []);

  const logout = async () => {
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax;';
    document.cookie = 'role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax;';
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    await authService.logout()
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ userRole, isAuthChecking, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);