import excelJS from 'exceljs';
import PurchaseLedger from './purchaseLedger.model.js';
import Vendor from '../Vendor/vendor.model.js';
import AppError from '../../utils/AppError.js';
import catchAsync from '../../utils/catchAsync.js';

// 🛠️ HELPER: Strict truncation
const toWhole = (num) => Math.trunc(Number(num) || 0);

// ==========================================
// 📊 EXPORT TDS REPORT (EXCEL)
// ==========================================
export const exportTdsReport = catchAsync(async (req, res, next) => {
  const bills = await PurchaseLedger.find({
    status: 'approved',
    credit: { $gt: 0 },
  })
    .populate('vendor', 'companyName panNumber')
    .sort({ date: 1 })
    .lean();

  if (!bills || bills.length === 0) {
    return next(new AppError('No bills found to generate TDS report.', 404));
  }

  const workbook = new excelJS.Workbook();
  const worksheet = workbook.addWorksheet('Vendor TDS Report');

  worksheet.columns = [
    { header: 'Bill Date', key: 'billDate', width: 15 },
    { header: 'Name of the Party', key: 'vendorName', width: 35 },
    { header: 'PAN', key: 'vendorPan', width: 20 },
    { header: 'Section', key: 'tdsHead', width: 15 },
    { header: 'Rate', key: 'tdsRate', width: 15 },
    { header: 'Amount', key: 'baseAmount', width: 20 },
    { header: 'Actual TDS', key: 'tdsAmount', width: 20 },
  ];

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  bills.forEach((bill) => {
    if (bill.tdsAmount > 0 || bill.tdsHead) {
      worksheet.addRow({
        billDate: bill.date
          ? `${String(new Date(bill.date).getDate()).padStart(2, '0')}-${new Date(bill.date).toLocaleString('en-US', { month: 'short' })}-${String(new Date(bill.date).getFullYear()).slice(-2)}`
          : 'N/A',
        vendorName: bill.vendor?.companyName || 'Unknown Vendor',
        vendorPan: bill.vendor?.panNumber || 'NOT PROVIDED',
        tdsHead: bill.tdsHead || 'N/A',
        tdsRate: bill.tdsPercentage ? `${bill.tdsPercentage}%` : '0%',
        baseAmount: bill.baseAmount || 0,
        tdsAmount: bill.tdsAmount || 0,
      });
    }
  });

  worksheet.getColumn('baseAmount').numFmt = '₹#,##0.00';
  worksheet.getColumn('tdsAmount').numFmt = '₹#,##0.00';

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=Vendor_TDS_Report_${new Date().toISOString().split('T')[0]}.xlsx`
  );

  await workbook.xlsx.write(res);
  res.end();
});

// ==========================================
// 📥 DOWNLOAD BULK UPLOAD TEMPLATE
// ==========================================
export const downloadBulkTemplate = catchAsync(async (req, res, next) => {
  const workbook = new excelJS.Workbook();
  const worksheet = workbook.addWorksheet('Bulk Bills');

  // Define strict columns
  worksheet.columns = [
    { header: 'Date (DD-MM-YYYY)', key: 'date', width: 25 },
    { header: 'Invoice Number', key: 'invoiceNo', width: 20 },
    { header: 'Description', key: 'description', width: 35 },
    { header: 'Base Amount', key: 'baseAmount', width: 15 },
    { header: 'Product Type', key: 'productType', width: 25 },
    { header: 'Logical Circuit ID', key: 'logicalCircuitId', width: 20 },
    { header: 'TDS Head', key: 'tdsHead', width: 20 },
    { header: 'TDS Percentage', key: 'tdsPercentage', width: 20 },
    { header: 'Remarks', key: 'remarks', width: 45 }
  ];

  // Style header
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  for (let i = 2; i <= 1000; i++) {

    worksheet.getCell(`A${i}`).numFmt = 'dd-mm-yyyy';
    worksheet.getCell(`A${i}`).dataValidation = {
      type: 'date',
      operator: 'greaterThan',
      showErrorMessage: true,
      allowBlank: true,
      formulae: [new Date('2000-01-01')],
      errorStyle: 'error',
      errorTitle: 'Invalid Date',
      error: 'Please enter a valid date in DD-MM-YYYY format (e.g. 07-09-2026).',
      showInputMessage: true,
      promptTitle: 'Date Required',
      prompt: 'Enter date format: DD-MM-YYYY'
    };

    worksheet.getCell(`E${i}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"NLD,Enterprise ILL,Others"'],
      showErrorMessage: true,
      errorStyle: 'error',
      errorTitle: 'Invalid Product Type',
      error: 'Please select a valid Product Type from the dropdown list.'
    };

    worksheet.getCell(`G${i}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"194J,194I,194C,194H,Others"'],
      showErrorMessage: true,
      errorStyle: 'error',
      errorTitle: 'Invalid TDS Head',
      error: 'Please select a valid TDS Head from the dropdown list.'
    };
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=Bulk_Bills_Template.xlsx');

  await workbook.xlsx.write(res);
  res.end();
});

// ==========================================
// 🔍 DRY RUN & VALIDATE BULK UPLOAD
// ==========================================
export const validateBulkUpload = catchAsync(async (req, res, next) => {
  const { vendorId, bills } = req.body;

  if (!vendorId || !Array.isArray(bills) || bills.length === 0) {
    return next(new AppError('Vendor ID and an array of bills are required.', 400));
  }

  const existingInvoices = await PurchaseLedger.find({ vendor: vendorId })
    .select('invoiceNo')
    .lean();

  const existingInvoiceSet = new Set(
    existingInvoices.map(b => b.invoiceNo?.trim().toLowerCase())
  );

  const currentUploadInvoiceSet = new Set();
  const validatedBills = [];
  let hasErrors = false;

  for (let i = 0; i < bills.length; i++) {
    const row = bills[i];
    let rowErrors = [];

    let standardDate = row.date;
    if (typeof row.date === 'string' && row.date.includes('-')) {
      const parts = row.date.split('-');
      if (parts.length === 3 && parts[2].length === 4) {
        standardDate = `${parts[2]}-${parts[1]}-${parts[0]}`; // Reorder to YYYY-MM-DD
      }
    }
    if (!standardDate || isNaN(new Date(standardDate).getTime())) {
      rowErrors.push("Valid Date (DD-MM-YYYY) is required.");
    }
    if (!row.invoiceNo) rowErrors.push("Invoice Number is required.");
    if (!row.description) rowErrors.push("Description is required.");
    if (!row.baseAmount || isNaN(row.baseAmount) || Number(row.baseAmount) <= 0) {
      rowErrors.push("Valid Base Amount is required.");
    }

    const invTrimmed = row.invoiceNo ? row.invoiceNo.toString().trim().toLowerCase() : '';
    if (invTrimmed) {
      if (existingInvoiceSet.has(invTrimmed)) {
        rowErrors.push(`Invoice "${row.invoiceNo}" already exists in the database.`);
      }
      if (currentUploadInvoiceSet.has(invTrimmed)) {
        rowErrors.push(`Invoice "${row.invoiceNo}" is duplicated within this upload sheet.`);
      }
      currentUploadInvoiceSet.add(invTrimmed);
    }

    const base = toWhole(row.baseAmount);
    const total = toWhole(base * 1.18);
    const tdsPct = row.tdsPercentage ? Number(row.tdsPercentage) : 0;
    const tdsAmount = toWhole(base * (tdsPct / 100));
    const payable = toWhole(total - tdsAmount);

    const previewRow = {
      originalRow: i + 1,
      date: standardDate,
      invoiceNo: row.invoiceNo ? row.invoiceNo.toString().trim() : '',
      description: row.description || '',
      productType: row.productType || null,
      logicalCircuitId: row.logicalCircuitId ? String(row.logicalCircuitId).trim() : null,
      tdsHead: row.tdsHead || null,
      tdsPercentage: tdsPct,
      remarks: row.remarks ? String(row.remarks).trim() : null,
      baseAmount: base,
      totalAmount: total,
      tdsAmount: tdsAmount,
      payableAmount: payable,

      isValid: rowErrors.length === 0,
      errors: rowErrors
    };

    if (rowErrors.length > 0) hasErrors = true;
    validatedBills.push(previewRow);
  }

  res.status(200).json({
    status: 'success',
    data: {
      hasErrors,
      validatedBills
    }
  });
});

// ==========================================
// ✅ COMMIT BULK UPLOAD (FINAL SAVE)
// ==========================================
export const commitBulkUpload = catchAsync(async (req, res, next) => {
  const { vendorId, bills } = req.body;

  if (!vendorId || !Array.isArray(bills) || bills.length === 0) {
    return next(new AppError('Vendor ID and a validated array of bills are required.', 400));
  }

  const preparedDocs = bills.map((bill) => ({
    vendor: vendorId,
    date: new Date(bill.date),
    invoiceNo: bill.invoiceNo,
    description: bill.description,
    productType: bill.productType || null,
    logicalCircuitId: bill.logicalCircuitId || null,
    remarks: bill.remarks || null,

    baseAmount: bill.baseAmount,
    totalAmount: bill.totalAmount,
    tdsHead: bill.tdsHead || null,
    tdsPercentage: bill.tdsPercentage || 0,
    tdsAmount: bill.tdsAmount,
    payableAmount: bill.payableAmount,

    credit: bill.payableAmount,
    balanceDue: bill.payableAmount,
    debit: 0,

    status: 'approved',
    addedBy: req.user.id,
    isUsingAdvance: false,
    unallocatedAmount: 0
  }));

  const insertedDocs = await PurchaseLedger.insertMany(preparedDocs);

  res.status(201).json({
    status: 'success',
    data: {
      insertedCount: insertedDocs.length
    }
  });
});