import Customer from "./customer.model.js";
import AppError from "../../utils/AppError.js";
import catchAsync from "../../utils/catchAsync.js";
import Ledger from "../ledger/ledger.model.js";
import excel from "exceljs";
import PDFDocument from 'pdfkit-table';

export const createCustomer = catchAsync(async (req, res, next) => {
  const { companyName, address, gstNumber, email, manager } = req.body;

  if (!manager) {
    return next(new AppError('Please assign a manager to this customer.', 400));
  }

  const existingCustomer = await Customer.findOne({ 
    companyName: companyName.toUpperCase() 
  });
  if (existingCustomer) {
    return next(new AppError(`A customer with the name "${companyName.toUpperCase()}" already exists.`, 409));
  }

  const newCustomer = await Customer.create({
    companyName,
    address,
    gstNumber,
    email: email || null,
    manager: manager,
  });

  res.status(201).json({
    status: "success",
    data: { customer: newCustomer },
  });
});

export const assignManager = catchAsync(async (req, res, next) => {
  const customer = await Customer.findByIdAndUpdate(
    req.params.customerId,
    { manager: req.body.managerId },
    { new: true, runValidators: true },
  );

  if (!customer) return next(new AppError("Customer not found", 404));

  res.status(200).json({
    status: "success",
    message: "Manager successfully assigned!",
  });
});

export const editCustomer = catchAsync(async (req, res, next) => {
  const customerId = req.params.id;

  const filterObj = (obj, ...allowedFields) => {
    const newObj = {};
    Object.keys(obj).forEach(el => {
      if (allowedFields.includes(el)) newObj[el] = obj[el];
    });
    return newObj;
  };

  const filteredBody = filterObj(req.body, 'companyName', 'address', 'gstNumber', 'email', 'isActive');

  const updatedCustomer = await Customer.findByIdAndUpdate(
    customerId,
    filteredBody,
    {
      new: true,
      runValidators: true,
    },
  ).populate("manager", "name email");

  if (!updatedCustomer) {
    return next(new AppError("No customer found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      customer: updatedCustomer,
    },
  });
});

export const getMyCustomers = catchAsync(async (req, res, next) => {
  const userId = req.user._id || req.user.id;

  const customers = await Customer.find({ manager: userId });

  res.status(200).json({
    status: "success",
    results: customers.length,
    data: { customers },
  });
});

export const getAllCustomers = catchAsync(async (req, res, next) => {
  const filter = req.query.manager ? { manager: req.query.manager } : {};

  const customers = await Customer.find(filter).lean().populate({
    path: "manager",
    select: "name email",
  });

  res.status(200).json({
    status: "success",
    results: customers.length,
    data: { customers },
  });
});

export const getCustomerById = catchAsync(async (req, res, next) => {
  const customer = await Customer.findById(req.params.id).populate(
    "manager",
    "name",
  );

  if (!customer) {
    return next(new AppError("No customer found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: { customer },
  });
});

export const getPortfolioDashboard = catchAsync(async (req, res, next) => {
  const targetManager = req.query.manager || req.user.id;
  const customers = await Customer.find({ manager: targetManager }).lean().populate("manager", "name email");


  if (!customers.length) {
    return res.status(200).json({
      status: "success",
      data: { portfolio: [], pendingCount: 0 },
    });
  }

  const portfolio = await Promise.all(
    customers.map(async (customer) => {
      const aging = await Ledger.getAgingReport(customer._id);

      return {
        id: customer._id,
        name: customer.companyName,
        email: customer.email,
        managerName: customer.manager ? customer.manager.name : "Unassigned",
        managerId: customer.manager ? customer.manager._id : "",
        aging: aging,
      };
    }),
  );

  const customerIds = customers.map((c) => c._id);
  const pendingCount = await Ledger.countDocuments({
    customer: { $in: customerIds },
    status: "pending",
  });

  res.status(200).json({
    status: "success",
    data: {
      portfolio,
      pendingCount,
    },
  });
});

export const getMainDashboard = catchAsync(async (req, res, next) => {
  // const page = parseInt(req.query.page) || 1;
  // const limit = parseInt(req.query.limit) || 20;
  // const skip = (page - 1) * limit;

  const query = {};
  if (req.user.role !== "admin") {
    query.manager = req.user.id;
  }

  const customers = await Customer.find(query).populate("manager", "name email").lean();

  const totalCustomers = await Customer.countDocuments(query);

  const dashboardData = await Promise.all(
    customers.map(async (customer) => {
      const aging = await Ledger.getAgingReport(customer._id);
      return {
        id: customer._id,
        name: customer.companyName,
        email: customer.email,
        managerName: customer.manager ? customer.manager.name : "Unassigned",
        managerId: customer.manager ? customer.manager._id : "",
        aging: aging,
      };
    })
  );

  res.status(200).json({
    status: "success",
    data: {
      customers: dashboardData,
    },
  });
});

/* Download Customer Ledger Excel */
export const downloadLedgerExcel = catchAsync(async (req, res, next) => {
  const { customerId } = req.params;

  const customer = await Customer.findById(customerId);
  if (!customer) return next(new AppError('Customer not found', 404));

  const ledgers = await Ledger.find({ 
    customer: customerId, 
    status: 'approved',
    isUsingAdvance: { $ne: true }
  }).sort({ date: 1 });

  const workbook = new excel.Workbook();
  workbook.creator = 'BahiKhata App';
  const worksheet = workbook.addWorksheet('Customer Ledger');

  worksheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Description', key: 'description', width: 40 },
    { header: 'Invoice No', key: 'invoiceNo', width: 15 },
    { header: 'Debit (₹)', key: 'debit', width: 15 },
    { header: 'Credit (₹)', key: 'credit', width: 15 }
  ];

  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F2937' } 
  };
  worksheet.getRow(1).alignment = { horizontal: 'center' };

  ledgers.forEach((log) => {
    const row = worksheet.addRow({
      date: new Date(log.date).toLocaleDateString('en-IN'), 
      description: log.description || '-',
      invoiceNo: log.invoiceNo || '-',
      debit: log.debit > 0 ? log.debit : '',
      credit: log.credit > 0 ? log.credit : ''
    });

    row.getCell('debit').alignment = { horizontal: 'right' };
    row.getCell('credit').alignment = { horizontal: 'right' };
    
  });

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  
  const safeCompanyName = customer.companyName.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Ledger_${safeCompanyName}.xlsx`;
  
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=${fileName}`
  );

  await workbook.xlsx.write(res);
  res.end();
});

/* Download Customer Ledger PDF */
export const downloadLedgerPDF = catchAsync(async (req, res, next) => {
  const { customerId } = req.params;
  const { fromDate, toDate } = req.query;

  const customer = await Customer.findById(customerId);
  if (!customer) return next(new AppError('Customer not found', 404));

  let query = { 
    customer: customerId,
    status: 'approved',
    isUsingAdvance: { $ne: true }
  };
  let openingBalance = 0;

  if (fromDate) {
    query.date = { $gte: new Date(fromDate) };

    const prevLogs = await Ledger.find({
      customer: customerId,
      status: 'approved',
      isUsingAdvance: { $ne: true },
      date: { $lt: new Date(fromDate) }
    });

    let prevDebit = 0;
    let prevCredit = 0;
    prevLogs.forEach(log => {
      prevDebit += (log.debit || 0);
      prevCredit += (log.credit || 0);
    });
    
    openingBalance = prevDebit - prevCredit; 
  }

  if (toDate) {
    query.date = query.date || {};
    query.date.$lte = new Date(toDate);
  }

  const ledgers = await Ledger.find(query).sort({ date: 1 });

  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  const safeCompanyName = customer.companyName.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `${safeCompanyName}_Ledger.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');

  doc.pipe(res);

  doc.fontSize(16).font('Helvetica-Bold').text('Fab Five Network Pvt Ltd', { align: 'center' });
  doc.fontSize(10).font('Helvetica').text('1st Floor Plot No. 2456, A KH no. 82/16 Jain Colony', { align: 'center' });
  doc.text('Contact: 8929882020    E-Mail: info@fab5network.com', { align: 'center' });
  doc.moveDown(1.5);

  doc.fontSize(14).font('Helvetica-Bold').text(customer.companyName.toUpperCase(), { align: 'center' });
  doc.fontSize(12).font('Helvetica').text('Ledger Account', { align: 'center' });
  
  const displayStartDate = fromDate ? new Date(fromDate).toLocaleDateString('en-IN') : (ledgers.length > 0 ? new Date(ledgers[0].date).toLocaleDateString('en-IN') : '-');
  const displayEndDate = toDate ? new Date(toDate).toLocaleDateString('en-IN') : (ledgers.length > 0 ? new Date(ledgers[ledgers.length - 1].date).toLocaleDateString('en-IN') : '-');
  doc.fontSize(10).font('Helvetica').text(`${displayStartDate} to ${displayEndDate}`, { align: 'center' });
  doc.moveDown(1.5);

  let totalDebit = 0;
  let totalCredit = 0;
  const tableRows = [];

  if (fromDate) {
    let opDebitStr = '';
    let opCreditStr = '';

    if (openingBalance > 0) {
      totalDebit += openingBalance;
      opDebitStr = openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    } else if (openingBalance < 0) {
      totalCredit += Math.abs(openingBalance);
      opCreditStr = Math.abs(openingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    } else {
      opDebitStr = '0.00';
    }

    tableRows.push([
      new Date(fromDate).toLocaleDateString('en-IN'),
      'Opening Balance',
      opDebitStr,
      opCreditStr
    ]);
  }

  ledgers.forEach(log => {
    const debitAmt = log.debit || 0;
    const creditAmt = log.credit || 0;
    
    totalDebit += debitAmt;
    totalCredit += creditAmt;

    let particulars = log.description || '-';
    if (log.debit > 0 && log.invoiceNo) {
      particulars = `${log.description} - ${log.invoiceNo}`;
    } else if (log.credit > 0 && log.bankInfo?.bankName) {
      particulars = `Receipt By ${log.bankInfo.bankName} ${log.bankInfo.utrReference ? '(' + log.bankInfo.utrReference + ')' : ''}`;
    }

    tableRows.push([
      new Date(log.date).toLocaleDateString('en-IN'),
      particulars,
      debitAmt > 0 ? debitAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '',
      creditAmt > 0 ? creditAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''
    ]);
  });

  const balance = totalDebit - totalCredit;
  const isDebitBalance = balance > 0;

  tableRows.push(['', '', '', '']);

  tableRows.push([
    '', 
    'Total', 
    totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 
    totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })
  ]);

  if (balance !== 0) {
    tableRows.push([
      '', 
      isDebitBalance ? 'By Closing Balance' : 'To Closing Balance', 
      isDebitBalance ? '' : Math.abs(balance).toLocaleString('en-IN', { minimumFractionDigits: 2 }), 
      isDebitBalance ? Math.abs(balance).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''
    ]);
  }

  const grandTotal = Math.max(totalDebit, totalCredit);
  tableRows.push([
    '', 
    '', 
    grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 
    grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })
  ]);

  const table = {
    headers: [
      { label: "Date", property: "date", width: 70 },
      { label: "Particulars", property: "particulars", width: 270 },
      { label: "Debit", property: "debit", width: 85, align: "right" },
      { label: "Credit", property: "credit", width: 85, align: "right" }
    ],
    rows: tableRows
  };

  await doc.table(table, {
    prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10),
    prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
      if (indexRow >= tableRows.length - 3 || (fromDate && indexRow === 0)) {
        doc.font("Helvetica-Bold").fontSize(10);
      } else {
        doc.font("Helvetica").fontSize(10);
      }
    },
    divider: {
      header: { disabled: false, width: 1, opacity: 1 },
      horizontal: { disabled: true },
    },
    padding: 5
  });

  doc.end();
});
