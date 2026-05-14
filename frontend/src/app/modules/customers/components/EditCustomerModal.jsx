import Input from '@/app/common/components/Input';
import ModalWrapper from '@/app/common/components/ModalWrapper';
import { useForm } from '@/app/common/hooks/useForm';
import { customerService } from '../customer.service';
import { useParams } from 'next/navigation';

export default function EditCustomerModal({ currentCustomer, onClose, onRefresh }) {
 const {id} = useParams();

  const submitCustomer = async (formData) => {
    await customerService.updateCustomer(id, formData);
    alert("Customer updated successfully!");
    onRefresh(); 
    onClose();   
  };

  

  const { formData, handleChange, handleSubmit, isLoading, error } = useForm(
    {
      companyName: currentCustomer?.company || currentCustomer?.companyName || '',
      address: currentCustomer?.address || '',
      gstNumber: currentCustomer?.gst || currentCustomer?.gstNumber || '',
      email: currentCustomer?.email || '',
      isActive: currentCustomer?.isActive ?? true,
    },
    submitCustomer
  );

  return (
    <ModalWrapper title="Edit Customer" onClose={onClose}>
      
      {error && (
        <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input 
          label="Company Name" 
          name="companyName" 
          value={formData.companyName} 
          onChange={handleChange} 
          required 
          placeholder="e.g. Acme Corp"
        />

        <Input 
          label="Email Address" 
          name="email" 
          type="email"
          value={formData.email} 
          onChange={handleChange} 
          placeholder="e.g. contact@acmecorp.com"
        />
        
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">Address *</label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            required
            rows="3"
            className="w-full px-4 py-2 border border-gray-300 rounded-md outline-none resize-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <Input 
          label="GST Number" 
          name="gstNumber" 
          value={formData.gstNumber} 
          onChange={handleChange} 
          placeholder="22AAAAA0000A1Z5"
        />

        <div className="flex items-center pt-2">
          <input
            type="checkbox"
            id="isActive"
            name="isActive"
            checked={formData.isActive}
            onChange={handleChange}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded"
          />
          <label htmlFor="isActive" className="ml-2 text-sm font-medium text-gray-700">
            Customer is Active
          </label>
        </div>
        <div className="flex justify-end pt-4 space-x-3 border-t">
          <button type="button" onClick={onClose} disabled={isLoading} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
            {isLoading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}