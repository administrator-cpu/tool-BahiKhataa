import apiClient from "@/app/common/lib/apiClient";

export const userService = {
  getEmployees: async () => {
    return await apiClient.get('/auth'); 
  },
  getProfile: async () => {
    const response = await apiClient.get('/auth/me');
    const data = response.data;
    const userRole = data?.data?.user?.role || data?.user?.role || "user";
    document.cookie = `role=${userRole}; path=/; max-age=86400; SameSite=Lax`;
    return response;
  },

};