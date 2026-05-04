import Customer from "./customer.model.js";
import AppError from "../../utils/AppError.js";
import catchAsync from "../../utils/catchAsync.js";
import Ledger from "../ledger/ledger.model.js";

const calculateAging = (logs) => {
  let totalCredit = 0;
  let totalDebit = 0;

  logs.forEach((log) => {
    if (log.credit > 0) totalCredit += log.credit;
    if (log.debit > 0) totalDebit += log.debit;
  });

  let remainingPaymentPool = totalCredit;
  const aging = {
    total: totalDebit - totalCredit,
    current: 0,
    thirtyPlus: 0,
    sixtyPlus: 0,
    ninetyPlus: 0,
  };

  if (aging.total <= 0) return aging;
  const now = new Date();

  const debits = logs
    .filter((log) => log.debit > 0)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  debits.forEach((invoice) => {
    let unpaidAmount = invoice.debit;

    if (remainingPaymentPool > 0) {
      if (remainingPaymentPool >= unpaidAmount) {
        remainingPaymentPool -= unpaidAmount;
        unpaidAmount = 0;
      } else {
        unpaidAmount -= remainingPaymentPool;
        remainingPaymentPool = 0;
      }
    }
    if (unpaidAmount > 0) {
      const daysOld = Math.floor(
        (now - new Date(invoice.date)) / (1000 * 60 * 60 * 24),
      );

      if (daysOld >= 90) aging.ninetyPlus += unpaidAmount;
      else if (daysOld >= 60) aging.sixtyPlus += unpaidAmount;
      else if (daysOld >= 30) aging.thirtyPlus += unpaidAmount;
      else aging.current += unpaidAmount;
    }
  });

  return aging;
};

export const createCustomer = catchAsync(async (req, res, next) => {
  const { companyName, address, gstNumber, manager } = req.body;

  // if (!manager) {
  //   return next(new AppError('Please assign a manager to this customer.', 400));
  // }

  const newCustomer = await Customer.create({
    companyName,
    address,
    gstNumber,
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
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const query = {};
  if (req.user.role !== "admin") {
    query.manager = req.user.id;
  }

  const customers = await Customer.find(query)
    .populate("manager", "name email")
    .lean();

  const totalCustomers = await Customer.countDocuments(query);
  const customerIds = customers.map((c) => c._id);

  const ledgers = await Ledger.find({
    customer: { $in: customerIds },
    status: "approved",
  })
    .sort({ date: 1 })
    .lean();

  const ledgersByCustomer = {};
  ledgers.forEach((log) => {
    const customerId = log.customer.toString();
    if (!ledgersByCustomer[customerId]) ledgersByCustomer[customerId] = [];
    ledgersByCustomer[customerId].push(log);
  });

  const dashboardData = customers.map((customer) => {
    const customerId = customer._id.toString();
    const logs = ledgersByCustomer[customerId] || [];

    const aging = calculateAging(logs);

    return {
      id: customer._id,
      name: customer.companyName,
      managerName: customer.manager ? customer.manager.name : "Unassigned",
      managerId: customer.manager ? customer.manager._id : "",
      aging: aging,
    };
  });

  res.status(200).json({
    status: "success",
    data: {
      customers: dashboardData,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCustomers / limit),
        totalRecords: totalCustomers,
      },
    },
  });
});
