import Vendor from './vendor.model.js';
import PurchaseLedger from '../PurchaseLedger/purchaseLedger.model.js';
import AppError from '../../utils/AppError.js';
import catchAsync from '../../utils/catchAsync.js';

/**
 * @description Create a new vendor
 * @route POST /api/v1/vendor
 */
export const createVendor = catchAsync(async (req, res, next) => {
  const { companyName, address, gstNumber, email, panNumber } = req.body;

  const existingVendor = await Vendor.findOne({ companyName: companyName.toUpperCase() });
  if (existingVendor) {
    return next(new AppError(`A vendor named "${companyName.toUpperCase()}" already exists.`, 409));
  }

  const newVendor = await Vendor.create({
    companyName,
    address,
    gstNumber,
    email: email || null,
    panNumber: panNumber ? panNumber.toUpperCase() : null
  });

  res.status(201).json({
    status: "success",
    data: { vendor: newVendor },
  });
});

/**
 * @description Edits an existing vendor
 * @route POST /api/v1/vendor
 */
export const editVendor = catchAsync(async (req, res, next) => {
  const vendorId = req.params.id;

  const filterObj = (obj, ...allowedFields) => {
    const newObj = {};
    Object.keys(obj).forEach(el => {
      if (allowedFields.includes(el)) newObj[el] = obj[el];
    });
    return newObj;
  };

  const filteredBody = filterObj(req.body, 'companyName', 'address', 'gstNumber', 'email', 'isActive', 'panNumber');

  if (filteredBody.companyName) {
    filteredBody.companyName = filteredBody.companyName.toUpperCase();
  }
  if (filteredBody.panNumber) {
    filteredBody.panNumber = filteredBody.panNumber.toUpperCase();
  }

  const updatedVendor = await Vendor.findByIdAndUpdate(vendorId, filteredBody, {
    new: true,
    runValidators: true,
  });

  if (!updatedVendor) {
    return next(new AppError("No vendor found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: { vendor: updatedVendor },
  });
});

/**
 * @description Get list of all vendors
 * @route POST /api/v1/vendor
 */
export const getAllVendors = catchAsync(async (req, res, next) => {
  const vendors = await Vendor.find().lean();

  res.status(200).json({
    status: "success",
    results: vendors.length,
    data: { vendors },
  });
});

/**
 * @description Get dashboard data for all vendors
 * @route POST /api/v1/vendor
 */
export const getVendorsDashboard = catchAsync(async (req, res, next) => {
  const vendors = await Vendor.find().lean();

  const dashboardData = await Promise.all(
    vendors.map(async (vendor) => {
      const aging = await PurchaseLedger.getAgingReport(vendor._id);

      return {
        id: vendor._id,
        name: vendor.companyName,
        email: vendor.email,
        availableAdvance: vendor.availableAdvance,
        aging: aging
      };
    })
  );

  res.status(200).json({
    status: "success",
    data: { vendors: dashboardData },
  });
});