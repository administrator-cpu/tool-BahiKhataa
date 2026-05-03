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
      // Handle Error automatically
      toast.error(error.message || errorMessage, { id: toastId });
      // We throw the error in case the component still needs to know it failed
      throw error; 
    } finally {
      setIsLoading(false);
    }
  };

  return { execute, isLoading };
}