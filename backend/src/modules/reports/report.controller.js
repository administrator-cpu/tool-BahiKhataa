import Ledger from "../ledger/ledger.model.js";
import catchAsync from "../../utils/catchAsync.js";
 
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
 
/**
 * GET /reports/dashboard
 * Powers the "Collections Overview" panel: trend, aging, efficiency, top defaulters.
 * All four are computed inside MongoDB via aggregation pipelines and run concurrently,
 * so the app server never loads full documents into memory — only the small
 * aggregated result sets (a handful of numbers) come back over the wire.
 */
export const getCollectionsOverview = catchAsync(async (req, res, next) => {
  const monthsBack = Number(req.query.months) || 6;
 
  const rangeStart = new Date();
  rangeStart.setMonth(rangeStart.getMonth() - (monthsBack - 1));
  rangeStart.setDate(1);
  rangeStart.setHours(0, 0, 0, 0);
 
  const [monthlyTrend, agingBuckets, efficiencyTotals, defaulters] = await Promise.all([
    // 1) Collection vs Outstanding by month
    Ledger.aggregate([
      { $match: { status: "approved", date: { $gte: rangeStart } } },
      {
        $group: {
          _id: { y: { $year: "$date" }, m: { $month: "$date" } },
          billed: { $sum: "$debit" },
          collected: { $sum: { $ifNull: ["$credit", 0] } }
        }
      }
    ]),
 
    // 2) Aging analysis buckets (0-30 / 31-60 / 61-90 / 90+)
    Ledger.aggregate([
      { $match: { status: "approved", paymentStatus: { $ne: "Paid" }, debit: { $gt: 0 } } },
      {
        $project: {
          balanceDue: 1,
          ageDays: { $dateDiff: { startDate: "$date", endDate: "$$NOW", unit: "day" } }
        }
      },
      {
        $bucket: {
          groupBy: "$ageDays",
          boundaries: [0, 31, 61, 91],
          default: 91,
          output: { total: { $sum: "$balanceDue" } }
        }
      }
    ]),
 
    // 3) Collection efficiency = collected / billed
    Ledger.aggregate([
      { $match: { status: "approved" } },
      {
        $group: {
          _id: null,
          billed: { $sum: "$debit" },
          collected: { $sum: { $ifNull: ["$credit", 0] } }
        }
      }
    ]),
 
    // 4) Top 5 defaulters by outstanding balance
    Ledger.aggregate([
      { $match: { status: "approved", paymentStatus: { $ne: "Paid" }, debit: { $gt: 0 } } },
      { $group: { _id: "$customer", outstanding: { $sum: "$balanceDue" } } },
      { $sort: { outstanding: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "customers",
          localField: "_id",
          foreignField: "_id",
          as: "customer",
          pipeline: [{ $project: { companyName: 1 } }]
        }
      },
      { $unwind: "$customer" },
      {
        $project: {
          _id: 0,
          customerId: "$_id",
          companyName: "$customer.companyName",
          outstanding: 1
        }
      }
    ])
  ]);
 
  // ---- shape monthly trend, filling in zero months ----
  const monthMap = new Map(monthlyTrend.map((m) => [`${m._id.y}-${m._id.m}`, m]));
  const collectionVsOutstanding = getLastNMonths(monthsBack).map(({ year, month, label }) => {
    const rec = monthMap.get(`${year}-${month}`);
    const billed = rec ? rec.billed : 0;
    const collected = rec ? rec.collected : 0;
    return {
      month: label,
      collected: Math.round(collected * 100) / 100,
      outstanding: Math.round((billed - collected) * 100) / 100
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
 
  res.status(200).json({
    status: "success",
    data: {
      collectionVsOutstanding,
      agingAnalysis,
      collectionEfficiency,
      topDefaulters: defaulters
    }
  });
});