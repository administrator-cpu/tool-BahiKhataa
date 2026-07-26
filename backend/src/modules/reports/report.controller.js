import Ledger from "../ledger/ledger.model.js";
import catchAsync from "../../utils/catchAsync.js";
import { getLegacyCollectionsGrowth, LEGACY_KEY_TO_EMAIL } from "./legacyCollectionsGrowth.js";
import User from "../auth/user.model.js";
import mongoose from 'mongoose';

/**
 * Returns the last `count` months as {year, month, label}, ending at the current month.
 */
const getLastNMonths = (count) => {
  const months = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: d.toLocaleString("default", { month: "short", year: "2-digit" })
    });
  }
  return months;
};

// ---- config for the Collections Growth (employee breakout) trend ----
const GROWTH_RANGE_CONFIG = {
  day: { monthsBack: 2, dateFormat: "%Y-%m-%d" },
  month: { monthsBack: 18, dateFormat: "%Y-%m" },
  year: { monthsBack: 60, dateFormat: "%Y" }
};

const LIVE_DATA_CUTOFF = new Date(2026, 6, 1); // 2026

const formatPeriodLabel = (period, range) => {
  if (range === "day") {
    const d = new Date(period);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  }
  if (range === "month") {
    const [y, m] = period.split("-");
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
  }
  return period; // year is already "YYYY"
};

/**
 * GET /reports/dashboard?months=6&range=month&isEmployee=true&employeeName=Arunav%20Moulik
 */
export const getCollectionsOverview = catchAsync(async (req, res, next) => {
  const isEmployee = String(req.query.isEmployee) === 'true';
  const employeeName = req.query.employeeName;
  const employeeEmail = req.query.employeeEmail;

  let employeePipelineStages = [];
  let userRecord = null;

  if (isEmployee && employeeEmail) {
    userRecord = await User.findOne({ email: employeeEmail });

    if (userRecord) {
      employeePipelineStages = [
        {
          $lookup: {
            from: "customers",
            localField: "customer",
            foreignField: "_id",
            as: "customerDoc"
          }
        },
        { $unwind: "$customerDoc" },
        { $match: { "customerDoc.manager": new mongoose.Types.ObjectId(userRecord._id) } }
      ];
    } else {
      employeePipelineStages = [{ $match: { _id: null } }];
    }
  }

  const monthsBack = Number(req.query.months) || 6;
  const growthRange = ["day", "month", "year"].includes(req.query.range) ? req.query.range : "month";
  const { monthsBack: growthMonthsBack, dateFormat } = GROWTH_RANGE_CONFIG[growthRange];

  const rangeStart = new Date();
  rangeStart.setMonth(rangeStart.getMonth() - (monthsBack - 1));
  rangeStart.setDate(1);
  rangeStart.setHours(0, 0, 0, 0);

  const growthRangeStart = new Date();
  growthRangeStart.setMonth(growthRangeStart.getMonth() - growthMonthsBack);

  const liveGrowthStart = growthRange === "month" && growthRangeStart < LIVE_DATA_CUTOFF
    ? LIVE_DATA_CUTOFF
    : growthRangeStart;

  const [monthlyTrend, agingBuckets, efficiencyTotals, defaulters, growthRows, priorTotals, priorGrowthTotals] = await Promise.all([
    Ledger.aggregate([
      { $match: { status: "approved", date: { $gte: rangeStart } } },
      ...employeePipelineStages,
      {
        $group: {
          _id: { y: { $year: "$date" }, m: { $month: "$date" } },
          billed: { $sum: "$debit" },
          collected: { $sum: { $ifNull: ["$credit", 0] } }
        }
      }
    ]),

    // 2. agingBuckets
    Ledger.aggregate([
      { $match: { status: "approved", paymentStatus: { $ne: "Paid" }, debit: { $gt: 0 } } },
      ...employeePipelineStages,
      { $project: { balanceDue: 1, ageDays: { $dateDiff: { startDate: "$date", endDate: "$$NOW", unit: "day" } } } },
      { $bucket: { groupBy: "$ageDays", boundaries: [0, 31, 61, 91], default: 91, output: { total: { $sum: "$balanceDue" } } } }
    ]),

    // 3. efficiencyTotals
    Ledger.aggregate([
      { $match: { status: "approved" } },
      ...employeePipelineStages,
      {
        $group: {
          _id: null,
          billed: { $sum: "$debit" },
          collected: { $sum: { $ifNull: ["$credit", 0] } }
        }
      }
    ]),

    // 4. defaulters
    Ledger.aggregate([
      { $match: { status: "approved", paymentStatus: { $ne: "Paid" }, debit: { $gt: 0 } } },
      ...employeePipelineStages,
      { $group: { _id: "$customer", outstanding: { $sum: "$balanceDue" } } },
      { $sort: { outstanding: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "customers",
          localField: "_id",
          foreignField: "_id",
          as: "customerData",
          pipeline: [{ $project: { companyName: 1 } }]
        }
      },
      { $unwind: "$customerData" },
      {
        $project: {
          _id: 0,
          customerId: "$_id",
          companyName: "$customerData.companyName",
          outstanding: 1
        }
      }
    ]),

    Ledger.aggregate([
      { $match: { status: "approved", date: { $gte: liveGrowthStart } } },
      ...employeePipelineStages,

      {
        $lookup: {
          from: "customers",
          localField: "customer",
          foreignField: "_id",
          as: "growthCustomerDoc"
        }
      },
      { $unwind: { path: "$growthCustomerDoc", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "growthCustomerDoc.manager",
          foreignField: "_id",
          as: "growthManagerDoc"
        }
      },
      { $unwind: { path: "$growthManagerDoc", preserveNullAndEmptyArrays: true } },

      {
        $group: {
          _id: {
            period: { $dateToString: { format: dateFormat, date: "$date" } },
            employeeName: { $ifNull: ["$growthManagerDoc.name", "Unassigned"] }
          },
          billed: { $sum: "$debit" },
          collected: { $sum: "$credit" },
          sortDate: { $min: "$date" }
        }
      },
      {
        $project: {
          _id: 0,
          period: "$_id.period",
          employeeName: "$_id.employeeName",
          billed: 1,
          collected: 1,
          sortDate: 1
        }
      },
      { $sort: { sortDate: 1 } }
    ]),

    Ledger.aggregate([
      { $match: { status: "approved", date: { $lt: rangeStart } } },
      ...employeePipelineStages,
      {
        $group: {
          _id: null,
          billed: { $sum: "$debit" },
          collected: { $sum: { $ifNull: ["$credit", 0] } }
        }
      }
    ]),

    Ledger.aggregate([
      { $match: { status: "approved", date: { $lt: liveGrowthStart } } },
      ...employeePipelineStages,
      {
        $lookup: {
          from: "customers",
          localField: "customer",
          foreignField: "_id",
          as: "growthCustomerDoc"
        }
      },
      { $unwind: { path: "$growthCustomerDoc", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "growthCustomerDoc.manager",
          foreignField: "_id",
          as: "growthManagerDoc"
        }
      },
      { $unwind: { path: "$growthManagerDoc", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ["$growthManagerDoc.name", "Unassigned"] },
          billed: { $sum: "$debit" },
          collected: { $sum: { $ifNull: ["$credit", 0] } }
        }
      }
    ])
  ]);

  const legacyGrowthRows = growthRange === "month"
    ? await getLegacyCollectionsGrowth(LIVE_DATA_CUTOFF, isEmployee ? employeeEmail : null)
    : [];

  const legacyMonthMap = new Map();
  legacyGrowthRows.forEach(row => {
    const dateObj = new Date(row.sortDate);
    if (!isNaN(dateObj.getTime())) {
      legacyMonthMap.set(`${dateObj.getFullYear()}-${dateObj.getMonth() + 1}`, {
        billed: row.Global || 0 
      });
    }
  });

  const liveMonthMap = new Map(monthlyTrend.map((m) => [`${m._id.y}-${m._id.m}`, m]));

  const collectionVsOutstanding = getLastNMonths(monthsBack).map(({ year, month, label }) => {
    const key = `${year}-${month}`;
    
    const liveRec = liveMonthMap.get(key);
    let billed = liveRec ? liveRec.billed : 0;
    let collected = liveRec ? liveRec.collected : 0;

    if (year === 2026 && (month === 4 || month === 5 || month === 6)) {
      const legacyRec = legacyMonthMap.get(key);
      billed = legacyRec ? legacyRec.billed : 0; 
    }

    const outstanding = billed - collected;

    return {
      month: label,
      collected: Math.round(collected * 100) / 100,
      outstanding: Math.round(outstanding * 100) / 100
    };
  });

  const bucketLabels = { 0: "0-30 Days", 31: "31-60 Days", 61: "61-90 Days", 91: "90+ Days" };
  const agingMap = new Map(agingBuckets.map((b) => [b._id, b.total]));
  const agingAnalysis = [0, 31, 61, 91].map((b) => ({
    label: bucketLabels[b],
    total: Math.round((agingMap.get(b) || 0) * 100) / 100
  }));

  const eff = efficiencyTotals[0] || { billed: 0, collected: 0 };
  const collectionEfficiency = eff.billed > 0
    ? Math.round((eff.collected / eff.billed) * 1000) / 10
    : 0;

  const periodBuckets = new Map(); 
  growthRows.forEach((r) => {
    if (!periodBuckets.has(r.period)) {
      periodBuckets.set(r.period, { sortDate: r.sortDate, employees: new Map() });
    }
    const bucket = periodBuckets.get(r.period);
    if (r.sortDate < bucket.sortDate) bucket.sortDate = r.sortDate;
    bucket.employees.set(r.employeeName, { billed: r.billed || 0, collected: r.collected || 0 });
  });

  const orderedPeriods = Array.from(periodBuckets.entries()).sort(
    (a, b) => a[1].sortDate - b[1].sortDate
  );

  const runningOutstandingByEmployee = new Map();
  priorGrowthTotals.forEach((p) => {
    runningOutstandingByEmployee.set(p.employeeName, (p.billed || 0) - (p.collected || 0));
  });

  const liveGrowthRows = orderedPeriods.map(([period, bucket]) => {
    const entry = {
      time: formatPeriodLabel(period, growthRange),
      Global: 0,
      sortDate: bucket.sortDate
    };

    bucket.employees.forEach(({ billed, collected }, employeeName) => {
      const prevOutstanding = runningOutstandingByEmployee.get(employeeName) || 0;
      const revenue = billed ;

      entry[employeeName] = (entry[employeeName] || 0) + revenue;
      entry.Global += revenue;

      runningOutstandingByEmployee.set(employeeName,  billed - collected);
    });

    return entry;
  });

  const allGrowthRows = [...legacyGrowthRows, ...liveGrowthRows].sort((a, b) => a.sortDate - b.sortDate);

  const growthEmployees = Array.from(
    new Set(allGrowthRows.flatMap((row) => Object.keys(row).filter((k) => k !== "time" && k !== "Global" && k !== "sortDate")))
  );

  const collectionsGrowth = allGrowthRows.map(({ sortDate, ...rest }) => {
    growthEmployees.forEach((emp) => {
      if (rest[emp] === undefined) rest[emp] = 0;
    });
    return rest;
  });

  res.status(200).json({
    status: "success",
    data: {
      collectionVsOutstanding,
      agingAnalysis,
      collectionEfficiency,
      topDefaulters: defaulters,
      collectionsGrowth: {
        data: collectionsGrowth,
        employees: growthEmployees
      }
    }
  });
});