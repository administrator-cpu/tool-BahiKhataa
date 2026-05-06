import Customer from "./customer.model.js";
import AppError from "../../utils/AppError.js";
import catchAsync from "../../utils/catchAsync.js";
import Ledger from "../ledger/ledger.model.js";


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
