import apiClient from "@/app/common/lib/apiClient";

export const authService = {
  // Maps to: POST /api/auth/login
  login: async (credentials) => {
    const { data } = await apiClient.post("/auth/login", credentials);
    localStorage.setItem("token", data?.token);
    const userRole = data?.user?.role || data?.data?.user?.role || "user";
    document.cookie = `token=${data?.token}; path=/; max-age=86400; SameSite=Lax`;
    document.cookie = `role=${userRole}; path=/; max-age=86400; SameSite=Lax`;
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

    return await apiClient.post("/auth/create-employee", payload);
  },

  logout: async () => {
    await apiClient.post("/auth/logout")
  },

  forgotPassword: async (email) => {
     const data =await apiClient.post('/auth/forgot-password', { email });
     console.log(data);
     
     return data
  },
  verifyOtp: async (data) => {
   const response= await apiClient.post('/auth/verify-otp', data);
    console.log(response);
     
     return response
  },
  resetPassword: async (data) => {
     const response= await apiClient.patch('/auth/reset-password', data);
     console.log(response);
     return response
    
  }
};
