import { invalidate } from "@/app/common/lib/swrCache";
import apiClient from "@/app/common/lib/apiClient";

// Reads the `exp` claim (seconds) from a JWT without verifying it
const getTokenExpiry = (token) => {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload)).exp || null;
  } catch {
    return null;
  }
};

export const authService = {
  // Maps to: POST /api/auth/login
  login: async (credentials) => {
    const { data } = await apiClient.post("/auth/login", credentials);
    localStorage.setItem("token", data?.token);
    const userRole = data?.user?.role || data?.data?.user?.role || "user";
    // Only the expiry goes into a cookie (for the route guard in proxy.js), never the JWT itself
    const exp = getTokenExpiry(data?.token);
    if (exp) document.cookie = `session_exp=${exp}; path=/; max-age=86400; SameSite=Lax`;
    document.cookie = `role=${userRole}; path=/; max-age=86400; SameSite=Lax`;
    // AuthContext reads this, so the first dashboard load skips the blocking GET /auth/me
    localStorage.setItem("userRole", userRole);
    return data?.user;
  },

  // Maps to: POST /api/auth/create-employee
  createEmployee: async (userData) => {
    const payload = {
      name: userData.fullName,
      email: userData.email,
      password: userData.password,
      role: userData.role === "sales" ? "employee" : "admin",
    };

    const response = await apiClient.post("/auth/create-employee", payload);
    invalidate("employees"); // new employee must show up in manager pickers right away
    return response;
  },

  logout: async () => {
    await apiClient.post("/auth/logout")
  },

  forgotPassword: async (email) => {
     const data =await apiClient.post('/auth/forgot-password', { email });
     
     return data
  },
  verifyOtp: async (data) => {
   const response= await apiClient.post('/auth/verify-otp', data);
     
     return response
  },
  resetPassword: async (data) => {
     const response= await apiClient.patch('/auth/reset-password', data);
     return response
    
  },
};
