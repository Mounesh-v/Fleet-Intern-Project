import BaseService from './BaseService.js';
import Customer from '../models/Customer.js';
import WorkEntry from '../models/WorkEntry.js';
import Payment from '../models/Payment.js';
import AppError from '../utility/AppError.js';

/**
 * StatementService — customer account statement: opening balance,
 * every bill and payment merged in date order with a running
 * balance, plus opening/billed/paid/closing totals.
 *
 * Layering: routes → controller → service → model.
 * OOP concepts:
 * - Static domain service extending BaseService.
 * - Client-side merge of two collections (no statement collection).
 */
export default class StatementService extends BaseService {
  static #quantity(entry) {
    if (entry.type === 'JCB') return `${entry.jcbHours} hrs`;
    if (entry.type === 'TIPPER') return `${entry.tipperLoads} loads`;
    if (entry.type === 'TATA_ACE') return `${entry.aceTrips} trips`;
    return '';
  }

  /** Build the full statement for one customer. */
  static async getStatement(customerId) {
    if (!/^[a-f0-9]{24}$/i.test(String(customerId || ''))) {
      throw new AppError('Invalid customer id', 400);
    }

    const CustomerModel = Customer.getModel();
    const customer = await CustomerModel.findById(customerId).lean();
    if (!customer) throw new AppError('Customer not found', 404);

    const WorkEntryModel = WorkEntry.getModel();
    const PaymentModel = Payment.getModel();

    const [entries, payments] = await Promise.all([
      WorkEntryModel.find({ customer: customer._id })
        .populate([
          { path: 'vehicle', select: 'registrationNo type' },
          { path: 'material', select: 'name unit' },
        ])
        .sort({ date: 1, createdAt: 1 })
        .lean(),
      PaymentModel.find({ customer: customer._id })
        .sort({ date: 1, createdAt: 1 })
        .lean(),
    ]);

    const openingBalance = Number(customer.openingBalance) || 0;
    const items = [];

    if (openingBalance !== 0) {
      items.push({
        type: 'OPENING',
        date: customer.createdAt,
        createdAt: customer.createdAt,
        amount: openingBalance,
        reference: '',
        description: 'Opening balance carried forward',
      });
    }

    entries.forEach(entry => {
      items.push({
        type: 'BILL',
        id: `bill-${entry._id}`,
        date: entry.date,
        createdAt: entry.createdAt,
        amount: entry.billedAmount || 0,
        reference: entry.billNumber || '',
        description: [
          entry.vehicle?.registrationNo,
          StatementService.#quantity(entry),
          entry.material?.name,
        ]
          .filter(Boolean)
          .join(' · '),
      });
    });

    payments.forEach(payment => {
      items.push({
        type: 'PAYMENT',
        id: `payment-${payment._id}`,
        date: payment.date,
        createdAt: payment.createdAt,
        amount: payment.amount || 0,
        reference: payment.reference || '',
        description: [payment.mode, payment.notes].filter(Boolean).join(' · '),
      });
    });

    // Chronological merge first, then the running balance pass.
    items.sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      if (da !== db) return da - db;
      return (
        new Date(a.createdAt || a.date).getTime() -
        new Date(b.createdAt || b.date).getTime()
      );
    });

    let running = openingBalance;
    const transactions = items.map(item => {
      if (item.type === 'BILL') running += item.amount;
      if (item.type === 'PAYMENT') running -= item.amount;
      return {
        id: item.id || `opening-${customer._id}`,
        type: item.type,
        date: item.date,
        amount: item.amount,
        balance: running,
        reference: item.reference,
        description: item.description,
      };
    });

    const billedTotal = entries.reduce(
      (sum, entry) => sum + (entry.billedAmount || 0),
      0,
    );
    const paidTotal = payments.reduce(
      (sum, payment) => sum + (payment.amount || 0),
      0,
    );

    return {
      customer: {
        _id: customer._id,
        name: customer.name,
        phone: customer.phone || '',
        address: customer.address || '',
        gstNo: customer.gstNo || '',
        status: customer.status,
        createdAt: customer.createdAt,
      },
      totals: {
        openingBalance,
        billed: billedTotal,
        paid: paidTotal,
        closingBalance: openingBalance + billedTotal - paidTotal,
        bills: entries.length,
        payments: payments.length,
      },
      transactions,
    };
  }
}
