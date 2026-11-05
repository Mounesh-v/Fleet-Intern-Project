import BaseService from './BaseService.js';
import Vehicle from '../models/Vehicle.js';
import Driver from '../models/Driver.js';
import WorkEntry from '../models/WorkEntry.js';
import Payment from '../models/Payment.js';
import Expense from '../models/Expense.js';

/**
 * DashboardService — aggregate stats for the admin dashboard:
 * fleet counts, income/expense series, outstanding credit, recents.
 *
 * Layering: routes → controller → service → model.
 * OOP concepts: static domain service extending BaseService;
 * aggregation via Mongoose aggregate() + in-memory merge of series.
 */
export default class DashboardService extends BaseService {
  /**
   * Build the dashboard payload.
   * @param {{ from?: string, to?: string }} [query] optional series range
   *   (defaults to the last 7 days including today)
   */
  static async getStats(query = {}) {
    const VehicleModel = Vehicle.getModel();
    const DriverModel = Driver.getModel();
    const WorkEntryModel = WorkEntry.getModel();
    const PaymentModel = Payment.getModel();
    const ExpenseModel = Expense.getModel();

    const to = query.to ? new Date(query.to) : new Date();
    to.setHours(23, 59, 59, 999);
    const from = query.from
      ? new Date(query.from)
      : new Date(to.getTime() - 6 * 24 * 60 * 60 * 1000);
    from.setHours(0, 0, 0, 0);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      vehicleTotal,
      vehicleActive,
      vehicleMaintenance,
      vehicleInactive,
      driverTotal,
      driverActive,
      todayEntries,
      billedAgg,
      paymentAgg,
      expenseAgg,
      entryExpenseAgg,
      seriesEntries,
      seriesExpenses,
      recentEntries,
    ] = await Promise.all([
      VehicleModel.countDocuments(),
      VehicleModel.countDocuments({ status: 'ACTIVE' }),
      VehicleModel.countDocuments({ status: 'MAINTENANCE' }),
      VehicleModel.countDocuments({ status: 'INACTIVE' }),
      DriverModel.countDocuments(),
      DriverModel.countDocuments({ status: 'ACTIVE' }),
      WorkEntryModel.countDocuments({ date: { $gte: startOfToday } }),
      WorkEntryModel.aggregate([
        { $group: { _id: null, total: { $sum: '$billedAmount' } } },
      ]),
      PaymentModel.aggregate([
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      ExpenseModel.aggregate([
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      WorkEntryModel.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: { $add: ['$dieselAmount', '$otherExpense'] } },
          },
        },
      ]),
      WorkEntryModel.aggregate([
        { $match: { date: { $gte: from, $lte: to } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            income: { $sum: '$billedAmount' },
            entryExpense: {
              $sum: { $add: ['$dieselAmount', '$otherExpense'] },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      ExpenseModel.aggregate([
        { $match: { date: { $gte: from, $lte: to } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            expense: { $sum: '$amount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      WorkEntryModel.find()
        .populate([
          { path: 'vehicle', select: 'registrationNo type' },
          { path: 'driver', select: 'name' },
          { path: 'customer', select: 'name' },
        ])
        .sort({ date: -1, createdAt: -1 })
        .limit(8)
        .lean(),
    ]);

    const totalBilled = billedAgg[0]?.total || 0;
    const totalPayments = paymentAgg[0]?.total || 0;
    const totalExpenses = expenseAgg[0]?.total || 0;
    const totalEntryExpense = entryExpenseAgg[0]?.total || 0;

    // Merge the two series by date (entries carry income + entry costs;
    // Expense records carry overhead costs).
    const byDate = new Map();
    for (const row of seriesEntries) {
      byDate.set(row._id, {
        date: row._id,
        income: row.income,
        expense: row.entryExpense,
        entries: row.count,
      });
    }
    for (const row of seriesExpenses) {
      const existing = byDate.get(row._id) || {
        date: row._id,
        income: 0,
        expense: 0,
        entries: 0,
      };
      existing.expense += row.expense;
      byDate.set(row._id, existing);
    }
    const series = [...byDate.values()].sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    return {
      totals: {
        vehicles: vehicleTotal,
        activeVehicles: vehicleActive,
        maintenanceVehicles: vehicleMaintenance,
        inactiveVehicles: vehicleInactive,
        drivers: driverTotal,
        activeDrivers: driverActive,
        todayEntries,
        totalBilled,
        totalPayments,
        totalExpenses: totalExpenses + totalEntryExpense,
        outstanding: totalBilled - totalPayments,
        net: totalBilled - totalExpenses - totalEntryExpense,
      },
      range: { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) },
      series,
      recentEntries,
    };
  }
}
