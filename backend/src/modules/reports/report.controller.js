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
    // 1. monthlyTrend — billed vs collected per month (feeds collectionVsOutstanding)
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

    // 5. growthRows — live collections growth, broken out by resolved employee name (feeds collectionsGrowth)
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

    // 6. priorTotals — everything billed/collected BEFORE the chart window, used to seed the
    // running outstanding balance so month 1 reflects real carried-over debt, not a false zero
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

    // 7. priorGrowthTotals — billed/collected per resolved employee BEFORE liveGrowthStart,
    // used to seed each employee's running outstanding balance for the "revenue" calc
    // (revenue = this period's billed + outstanding carried from the previous period)
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

  // ---- shape monthly trend, filling in zero months ----
  // "outstanding" is a running cumulative balance: prior carried-over debt + this month's
  // billing, minus this month's collections. It is NOT reset to zero each month, since unpaid
  // balances from earlier months don't disappear just because a new month started.
  const monthMap = new Map(monthlyTrend.map((m) => [`${m._id.y}-${m._id.m}`, m]));
  const priorEff = priorTotals[0] || { billed: 0, collected: 0 };
  let runningOutstanding = priorEff.billed - priorEff.collected;

  const collectionVsOutstanding = getLastNMonths(monthsBack).map(({ year, month, label }) => {
    const rec = monthMap.get(`${year}-${month}`);
    const billed = rec ? rec.billed : 0;
    const collected = rec ? rec.collected : 0;

    // TARGET OUTSTANDING: The total amount we need to collect this month.
    // Which is = (Unpaid debt from ALL previous months) + (New bills generated THIS month)
    const targetOutstandingForChart = runningOutstanding + billed;

    // UPDATE RUNNING BALANCE FOR NEXT MONTH: 
    // Now subtract this month's collections to get the carry-forward debt for the next loop
    runningOutstanding = runningOutstanding + billed - collected;

    return {
      month: label,
      collected: Math.round(collected * 100) / 100,
      outstanding: Math.round(targetOutstandingForChart * 100) / 100
    };
  });

  // ---- shape aging buckets ----
  const bucketLabels = { 0: "0-30 Days", 31: "31-60 Days", 61: "61-90 Days", 91: "90+ Days" };
  const agingMap = new Map(agingBuckets.map((b) => [b._id, b.total]));
  const agingAnalysis = [0, 31, 61, 91].map((b) => ({
    label: bucketLabels[b],
    total: Math.round((agingMap.get(b) || 0) * 100) / 100
  }));

  // ---- collection efficiency ----
  const eff = efficiencyTotals[0] || { billed: 0, collected: 0 };
  const collectionEfficiency = eff.billed > 0
    ? Math.round((eff.collected / eff.billed) * 1000) / 10
    : 0;

  // ---- shape live collections growth rows ----
  // group growthRows by period, tracking each employee's billed/collected within that period
  const periodBuckets = new Map(); // period -> { sortDate, employees: Map(name -> {billed, collected}) }
  growthRows.forEach((r) => {
    if (!periodBuckets.has(r.period)) {
      periodBuckets.set(r.period, { sortDate: r.sortDate, employees: new Map() });
    }
    const bucket = periodBuckets.get(r.period);
    if (r.sortDate < bucket.sortDate) bucket.sortDate = r.sortDate;
    bucket.employees.set(r.employeeName, { billed: r.billed || 0, collected: r.collected || 0 });
  });

  // sort periods chronologically so the running outstanding balance carries forward correctly
  const orderedPeriods = Array.from(periodBuckets.entries()).sort(
    (a, b) => a[1].sortDate - b[1].sortDate
  );

  // seed each employee's running outstanding balance from everything before the live window
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

  const legacyGrowthRows = growthRange === "month"
    ? await getLegacyCollectionsGrowth(LIVE_DATA_CUTOFF, isEmployee ? employeeEmail : null)
    : [];

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