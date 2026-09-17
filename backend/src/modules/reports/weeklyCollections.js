import Ledger from "../ledger/ledger.model.js";

/**
 * Week-of-month buckets used for the "Collections by Week" chart.
 *   W1: day 1  - 7
 *   W2: day 8  - 14
 *   W3: day 15 - 21
 *   W4: day 22 - 28
 *   W5: day 29 - end of month (the leftover days)
 *
 * Note: the boundary was adjusted from "21-28" to "22-28" so day 21 isn't
 * counted twice (once in W3, once in W4).
 */
const WEEK_KEYS = ["W1", "W2", "W3", "W4", "W5"];

const weekBucketStage = {
  $addFields: {
    week: {
      $switch: {
        branches: [
          { case: { $lte: ["$day", 7] }, then: "W1" },
          { case: { $lte: ["$day", 14] }, then: "W2" },
          { case: { $lte: ["$day", 21] }, then: "W3" },
          { case: { $lte: ["$day", 28] }, then: "W4" }
        ],
        default: "W5"
      }
    }
  }
};

/**
 * Builds the last `monthsBack` months (oldest -> newest), ending at the current month.
 */
const getLastNMonths = (monthsBack) => {
  const months = [];
  const now = new Date();
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: d.toLocaleString("default", { month: "short" })
    });
  }
  return months;
};

/**
 * Returns week-wise (W1-W5) collected totals for each of the last `monthsBack` months,
 * shaped for a grouped bar/column chart: [{ month, W1, W2, W3, W4, W5 }, ...]
 *
 * @param {number} monthsBack - how many months (including current) to include
 * @param {Array}  employeePipelineStages - extra aggregation stages to scope to one employee
 */
export const getWeeklyCollections = async (monthsBack = 4, employeePipelineStages = []) => {
  const months = getLastNMonths(monthsBack);
  const rangeStart = new Date(months[0].year, months[0].month - 1, 1);

  const rows = await Ledger.aggregate([
    { $match: { status: "approved", date: { $gte: rangeStart } } },
    ...employeePipelineStages,
    {
      $project: {
        credit: { $ifNull: ["$credit", 0] },
        year: { $year: "$date" },
        month: { $month: "$date" },
        day: { $dayOfMonth: "$date" }
      }
    },
    weekBucketStage,
    {
      $group: {
        _id: { year: "$year", month: "$month", week: "$week" },
        collected: { $sum: "$credit" }
      }
    }
  ]);

  const byMonth = new Map();
  rows.forEach((r) => {
    const key = `${r._id.year}-${r._id.month}`;
    if (!byMonth.has(key)) byMonth.set(key, {});
    byMonth.get(key)[r._id.week] = Math.round((r.collected || 0) * 100) / 100;
  });

  return months.map(({ year, month, label }) => {
    const weekData = byMonth.get(`${year}-${month}`) || {};
    const entry = { month: label };
    WEEK_KEYS.forEach((wk) => {
      entry[wk] = weekData[wk] || 0;
    });
    return entry;
  });
};