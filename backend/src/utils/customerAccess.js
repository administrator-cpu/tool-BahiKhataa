import Customer from '../modules/customer/customer.model.js';
import AppError from './AppError.js';

/**
 * Admins can access every customer. Employees can only access customers
 * they manage. Throws a 404 (same as "not found") so IDs can't be probed.
 */
export const assertCustomerAccess = async (user, customerId) => {
  if (user.role === 'admin') return;

  const customer = await Customer.findById(customerId).select('manager').lean();
  if (!customer || customer.manager?.toString() !== user.id) {
    throw new AppError('Customer not found or not assigned to you', 404);
  }
};
