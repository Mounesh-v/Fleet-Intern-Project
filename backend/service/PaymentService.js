import BaseService from './BaseService.js';
import Payment from '../models/Payment.js';
import AppError from '../utility/AppError.js';
import FleetValidator from '../api/fleetValidation.js';

/**
 * PaymentService — customer payment recording against the ledger.
 *
 * Layering: routes → controller → service → model.
 * OOP concepts: static domain service extending BaseService.
 */
export default class PaymentService extends BaseService {
  static async list(query = {}) {
    const PaymentModel = Payment.getModel();
    const filter = {};
    if (query.customer) filter.customer = query.customer;
    if (query.from || query.to) {
      filter.date = {};
      if (query.from) filter.date.$gte = new Date(query.from);
      if (query.to) {
        const to = new Date(query.to);
        to.setHours(23, 59, 59, 999);
        filter.date.$lte = to;
      }
    }
    return PaymentModel.find(filter)
      .populate('customer', 'name phone')
      .sort({ date: -1, createdAt: -1 })
      .lean();
  }

  static async create(body) {
    FleetValidator.assert(FleetValidator.validatePayment(body));
    const PaymentModel = Payment.getModel();

    return PaymentModel.create({
      customer: body.customer,
      amount: body.amount,
      date: new Date(body.date),
      mode: body.mode || 'CASH',
      reference: String(body.reference || '').trim(),
      notes: String(body.notes || '').trim(),
    });
  }

  static async remove(id) {
    const PaymentModel = Payment.getModel();
    const payment = await PaymentModel.findByIdAndDelete(id);
    if (!payment) throw new AppError('Payment not found', 404);
    return { deleted: true, id };
  }

  /** Bulk delete for the finance list. */
  static async removeMany(ids) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new AppError('No payments selected', 400);
    }
    const valid = ids.filter(
      id => typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id),
    );
    if (!valid.length) throw new AppError('No valid payment ids', 400);
    const PaymentModel = Payment.getModel();
    const result = await PaymentModel.deleteMany({ _id: { $in: valid } });
    return { deleted: result.deletedCount || 0 };
  }
}
