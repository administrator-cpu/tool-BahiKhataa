import { useState } from 'react';
import toast from 'react-hot-toast';

export function useAsyncAction() {
  const [isLoading, setIsLoading] = useState(false);

  /**
   * @param {Function} actionFn - The async API call to execute
   * @param {Object} options - Toast messages and success callbacks
   */
  const execute = async (actionFn, options = {}) => {
    const { 
      loadingMessage = 'Processing...', 
      successMessage = 'Success!', 
      errorMessage = 'An error occurred.',
      onSuccess 
    } = options;

    setIsLoading(true);
    const toastId = toast.loading(loadingMessage);

    try {
      // Execute the API call
      const result = await actionFn();
      
      // Handle Success
      toast.success(successMessage, { id: toastId });
      if (onSuccess) onSuccess(result);
      
      return result;
    } catch (error) {
      console.log(error.response?.data?.message);
      toast.error(error.response?.data?.message || errorMessage, { id: toastId });
      throw error.response?.data?.message; 
    } finally {
      setIsLoading(false);
    }
  };

  return { execute, isLoading };
}