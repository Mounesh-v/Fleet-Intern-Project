import BaseService from './BaseService.js';
import Expense from '../models/Expense.js';
import AppError from '../utility/AppError.js';
import FleetValidator from '../api/fleetValidation.js';

/**
 * ExpenseService — operating and vehicle expense recording.
 *
 * Layering: routes → controller → service → model.
 * OOP concepts: static domain service extending BaseService.
 */
export default class ExpenseService extends BaseService {
  static async list(query = {}) {
    const ExpenseModel = Expense.getModel();
    const filter = {};
    if (query.kind) filter.kind = query.kind;
    if (query.category) filter.category = query.category;
    if (query.vehicle) filter.vehicle = query.vehicle;
    if (query.from || query.to) {
      filter.date = {};
      if (query.from) filter.date.$gte = new Date(query.from);
      if (query.to) {
        const to = new Date(query.to);
        to.setHours(23, 59, 59, 999);
        filter.date.$lte = to;
      }
    }
    return ExpenseModel.find(filter)
      .populate('vehicle', 'registrationNo type')
      .sort({ date: -1, createdAt: -1 })
      .lean();
  }

  static async create(body) {
    FleetValidator.assert(FleetValidator.validateExpense(body));
    const ExpenseModel = Expense.getModel();

    const kind = body.kind;
    const category = body.category;
    if (!Expense.CATEGORIES_BY_KIND[kind]?.includes(category)) {
      throw new AppError(
        `Category ${category} is not valid for ${kind} expenses`,
        400,
      );
    }

    return ExpenseModel.create({
      date: new Date(body.date),
      kind,
      category,
      amount: body.amount,
      vehicle: body.vehicle || null,
      litres: body.litres || 0,
      notes: String(body.notes || '').trim(),
    });
  }

  static async remove(id) {
    const ExpenseModel = Expense.getModel();
    const expense = await ExpenseModel.findByIdAndDelete(id);
    if (!expense) throw new AppError('Expense not found', 404);
    return { deleted: true, id };
  }

  /** Bulk delete for the finance list. */
  static async removeMany(ids) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new AppError('No expenses selected', 400);
    }
    const valid = ids.filter(
      id => typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id),
    );
    if (!valid.length) throw new AppError('No valid expense ids', 400);
    const ExpenseModel = Expense.getModel();
    const result = await ExpenseModel.deleteMany({ _id: { $in: valid } });
    return { deleted: result.deletedCount || 0 };
  }
}
