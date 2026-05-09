import Customer from "./customer.model.js";
import AppError from "../../utils/AppError.js";
import catchAsync from "../../utils/catchAsync.js";
import Ledger from "../ledger/ledger.model.js";
import excel from "exceljs";
import PDFDocument from 'pdfkit-table';

export const createCustomer = catchAsync(async (req, res, next) => {
  const { companyName, address, gstNumber, email, manager } = req.body;

  // if (!manager) {
  //   return next(new AppError('Please assign a manager to this customer.', 400));
  // }

  const newCustomer = await Customer.create({
    companyName,
    address,
    gstNumber,
    email,
    manager: manager || null,
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

  if (req.body._id) delete req.body._id;

  const updatedCustomer = await Customer.findByIdAndUpdate(
    customerId,
    req.body,
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
  console.log(req.user._id);
  const userId = req.user._id || req.user.id;

  const customers = await Customer.find({ manager: userId });
  console.log(customers);

  res.status(200).json({
    status: "success",
    results: customers.length,
    data: { customers },
  });
});

export const getAllCustomers = catchAsync(async (req, res, next) => {
  const filter = req.query.manager ? { manager: req.query.manager } : {};

  const customers = await Customer.find(filter).populate({
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
  const customers = await Customer.find({ manager: targetManager }).populate("manager", "name email");


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
    status: 'approved' 
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

  // 1. Fetch Customer and their Approved Ledger entries
  const customer = await Customer.findById(customerId);
  if (!customer) return next(new AppError('Customer not found', 404));

  // Sort by date ascending (oldest to newest) to mimic standard ledgers
  const ledgers = await Ledger.find({ 
    customer: customerId, 
    status: 'approved' 
  }).sort({ date: 1 });

  // 2. Initialize PDF Document
  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  // 3. Set HTTP Headers for PDF Download
  const safeCompanyName = customer.companyName.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `${safeCompanyName}_Ledger.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`); 
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');

  // Pipe the PDF document directly to the Express response
  doc.pipe(res);

  // ==========================================
  // 4. HEADER SECTION (Matches Fab Five Format)
  // ==========================================
  doc.fontSize(16).font('Helvetica-Bold').text('Fab Five Network Pvt Ltd', { align: 'center' });
  doc.fontSize(10).font('Helvetica').text('1st Floor Plot No. 2456, A KH no. 82/16 Jain Colony', { align: 'center' });
  doc.text('Contact: 8929882020    E-Mail: info@fab5network.com', { align: 'center' });
  doc.moveDown(1.5);

  // Dynamic Customer Details
  doc.fontSize(14).font('Helvetica-Bold').text(customer.companyName.toUpperCase(), { align: 'center' });
  doc.fontSize(12).font('Helvetica').text('Ledger Account', { align: 'center' });
  
  // Dynamic Date Range
  const startDate = ledgers.length > 0 ? new Date(ledgers[0].date).toLocaleDateString('en-IN') : 'N/A';
  const endDate = ledgers.length > 0 ? new Date(ledgers[ledgers.length - 1].date).toLocaleDateString('en-IN') : 'N/A';
  doc.fontSize(10).font('Helvetica').text(`${startDate} to ${endDate}`, { align: 'center' });
  doc.moveDown(1.5);

  // ==========================================
  // 5. TABLE DATA PREPARATION
  // ==========================================
  let totalDebit = 0;
  let totalCredit = 0;

  const tableRows = ledgers.map(log => {
    const debitAmt = log.debit || 0;
    const creditAmt = log.credit || 0;
    
    totalDebit += debitAmt;
    totalCredit += creditAmt;

    // Formatting 'Particulars' to mimic "To / By" style
    let particulars = log.description || '-';
    if (log.credit > 0 && log.bankInfo?.bankName) {
      particulars = `Receipt By ${log.bankInfo.bankName} ${log.bankInfo.utrReference ? '(' + log.bankInfo.utrReference + ')' : ''}`;
    }

    // Return the specific 4 columns: Date, Particulars, Debit, Credit
    return [
      new Date(log.date).toLocaleDateString('en-IN'),
      particulars,
      debitAmt > 0 ? debitAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '',
      creditAmt > 0 ? creditAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''
    ];
  });

  // ==========================================
  // 6. TOTALS & CLOSING BALANCE CALCULATION
  // ==========================================
  const balance = totalDebit - totalCredit;
  const isDebitBalance = balance > 0;

  // Add a spacer row before totals
  tableRows.push(['', '', '', '']);

  // Add sub-total row
  tableRows.push([
    '', 
    'Total', 
    totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 
    totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })
  ]);

  // Add Closing Balance to the weaker side to balance the ledger
  if (balance !== 0) {
    tableRows.push([
      '', 
      isDebitBalance ? 'By Closing Balance' : 'To Closing Balance', 
      isDebitBalance ? '' : Math.abs(balance).toLocaleString('en-IN', { minimumFractionDigits: 2 }), 
      isDebitBalance ? Math.abs(balance).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''
    ]);
  }

  // Add Grand Total row
  const grandTotal = Math.max(totalDebit, totalCredit);
  tableRows.push([
    '', 
    '', 
    grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 
    grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })
  ]);

  // ==========================================
  // 7. DRAW THE TABLE
  // ==========================================
  const table = {
    headers: [
      { label: "Date", property: "date", width: 70 },
      { label: "Particulars", property: "particulars", width: 270 }, // Increased width since Vch No is gone
      { label: "Debit", property: "debit", width: 85, align: "right" },
      { label: "Credit", property: "credit", width: 85, align: "right" }
    ],
    rows: tableRows
  };

  await doc.table(table, {
    prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10),
    prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
      // Make the Totals and Closing Balance rows bold at the bottom
      if (indexRow >= ledgers.length) {
        doc.font("Helvetica-Bold").fontSize(10);
      } else {
        doc.font("Helvetica").fontSize(10);
      }
    },
    divider: {
      header: { disabled: false, width: 1, opacity: 1 },
      horizontal: { disabled: true }, // Removes horizontal lines between standard rows like a true ledger
    },
    padding: 5
  });

  doc.end();
});
