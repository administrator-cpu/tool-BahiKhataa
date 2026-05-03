import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { customerService } from '../customer.service';
import { userService } from '../../users/user.service';
import { useAuth } from '@/app/common/context/AuthContext';
import { useAsyncAction } from '@/app/common/hooks/useAsyncAction';

export function useCreateCustomer() {
  const router = useRouter();
  
  // 💡 THE FIX: Extract the full `user` object directly from your context
  const { user, userRole } = useAuth(); 
  const { execute, isLoading: isSubmitting } = useAsyncAction();

  const [formData, setFormData] = useState({ 
    companyName: '', 
    gst: '', 
    manager: '', 
    address: '' 
  });
  const [activeManagers, setActiveManagers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (!user) return;

    setCurrentUser(user);

    if (user.role === 'admin' || userRole === 'admin') {
      const fetchManagers = async () => {
        try {
          const { data } = await userService.getEmployees();
          console.log("Managers fetched:", data);
          
          // Added a fallback to ensure it doesn't crash if the backend response shape changes slightly
          setActiveManagers(data?.data?.users || data?.users || []);
        } catch (error) {
          console.error(error);
          toast.error("Failed to load manager directory.");
        }
      };
      
      fetchManagers();
    } else {
      // Auto-assign to self if employee
      setFormData(prev => ({ ...prev, managerId: user._id || user.id }));
    }
    
  // 💡 THE FIX: Add user as a dependency so this fires the millisecond auth is ready
  }, [user, userRole]); 

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    await execute(
      () => customerService.createCustomer(formData),
      {
        loadingMessage: 'Registering client...',
        successMessage: 'Client registered successfully!',
        onSuccess: () => router.push('/dashboard')
      }
    );
  };

  return {
    formData,
    activeManagers,
    currentUser,
    isSubmitting,
    handleChange,
    handleSubmit
  };
}