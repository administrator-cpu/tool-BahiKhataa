import Customer from '../customer/customer.model.js';
import Ledger from '../ledger/ledger.model.js';
import AppError from '../../utils/appError.js';
import catchAsync from '../../utils/catchAsync.js';

// ==========================================
// 🏦 EXPORT FINANCIAL DATA TO OTHER APPS
// ==========================================
export const getExternalCustomerFinancials = catchAsync(async (req, res, next) => {
  const { crmId } = req.params;

  const customer = await Customer.findOne({ crmId }).lean();

  if (!customer) {
    return res.status(404).json({
      status: 'fail',
      message: 'This CRM customer is not linked to Bahi Khata.'
    });
  }

  const agingReport = await Ledger.getAgingReport(customer._id);

  const totalOutstanding = agingReport ?
    (agingReport.days0To30 || 0) +
    (agingReport.days31To60 || 0) +
    (agingReport.days61To90 || 0) +
    (agingReport.above90 || 0) : 0;

  return res.status(200).json({
    status: 'success',
    data: {
      bahiKhataId: customer._id,
      crmId: customer.crmId,
      companyName: customer.companyName,
      availableAdvance: customer.availableAdvance || 0,
      totalOutstanding,
      aging: agingReport
    }
  });
});

// ==========================================
// 🔍 EXPORT FINANCIAL DATA BY NAME (String Match)
// ==========================================
export const getExternalFinancialsByName = catchAsync(async (req, res, next) => {
  const { name } = req.query;

  if (!name) {
    return next(new AppError('Please provide a customer name to search (e.g., ?name=Acme).', 400));
  }

  const searchName = name.trim().toUpperCase();

  const customer = await Customer.findOne({ companyName: searchName }).lean();

  if (!customer) {
    return res.status(404).json({
      status: 'fail',
      matchFound: false,
      message: `No customer matching "${searchName}" was found in Bahi Khata.`
    });
  }

  const agingReport = await Ledger.getAgingReport(customer._id);

  const totalOutstanding = agingReport ?
    (agingReport.days0To30 || 0) +
    (agingReport.days31To60 || 0) +
    (agingReport.days61To90 || 0) +
    (agingReport.above90 || 0) : 0;

  return res.status(200).json({
    status: 'success',
    matchFound: true,
    data: {
      bahiKhataId: customer._id,
      crmId: customer.crmId || null, // Will be null if it hasn't been linked yet!
      companyName: customer.companyName,
      availableAdvance: customer.availableAdvance || 0,
      totalOutstanding,
      aging: agingReport
    }
  });
});

// ==========================================
// 📊 EXPORT FINANCIAL DATA (PAGINATED)
// ==========================================
export const getAllCustomersFinancials = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 50;
  const skip = (page - 1) * limit;

  const customers = await Customer.find()
    .select('companyName crmId availableAdvance')
    .skip(skip)
    .limit(limit)
    .lean();

  const totalCustomers = await Customer.countDocuments();

  const financialPromises = customers.map(async (customer) => {
    const agingReport = await Ledger.getAgingReport(customer._id);

    const totalOutstanding = agingReport ?
      (agingReport.days0To30 || 0) +
      (agingReport.days31To60 || 0) +
      (agingReport.days61To90 || 0) +
      (agingReport.above90 || 0) : 0;

    return {
      bahiKhataId: customer._id,
      crmId: customer.crmId || null,
      companyName: customer.companyName,
      availableAdvance: customer.availableAdvance || 0,
      totalOutstanding,
      aging: agingReport
    };
  });

  const pageData = await Promise.all(financialPromises);

  return res.status(200).json({
    status: 'success',
    pagination: {
      totalRecords: totalCustomers,
      currentPage: page,
      totalPages: Math.ceil(totalCustomers / limit),
      pageSize: limit
    },
    data: pageData
  });
});