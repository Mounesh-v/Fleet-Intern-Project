import BaseService from './BaseService.js';
import WorkEntry from '../models/WorkEntry.js';
import Vehicle from '../models/Vehicle.js';
import Counter from '../models/Counter.js';
import AppError from '../utility/AppError.js';
import FleetValidator from '../api/fleetValidation.js';
import RateService from './RateService.js';

/**
 * WorkEntryService — work entry listing, creation with rate-card
 * billing, and status transitions (verify / lock / reopen).
 *
 * Layering: routes → controller → service → model.
 * OOP concepts:
 * - Static domain service extending BaseService.
 * - Composition: delegates rate lookup to RateService.
 */
export default class WorkEntryService extends BaseService {
  static #populate = [
    { path: 'vehicle', select: 'registrationNo type' },
    { path: 'driver', select: 'name phone employeeId' },
    { path: 'customer', select: 'name phone' },
    { path: 'material', select: 'name unit' },
    { path: 'quarry', select: 'name location' },
  ];

  /** Next bill number for an entry date: BILL-2026-0001 (per-year counter). */
  static async #nextBillNumber(date) {
    const year = new Date(date).getFullYear();
    const seq = await Counter.next(`bill-${year}`);
    return `BILL-${year}-${String(seq).padStart(4, '0')}`;
  }

  /** Assign bill numbers to legacy entries created before the field existed. */
  static async #ensureBillNumbers() {
    const WorkEntryModel = WorkEntry.getModel();
    const missing = await WorkEntryModel.find({
      $or: [{ billNumber: { $exists: false } }, { billNumber: '' }],
    })
      .select('date createdAt')
      .sort({ createdAt: 1 })
      .lean();
    if (missing.length === 0) return;
    for (const entry of missing) {
      const billNumber = await WorkEntryService.#nextBillNumber(
        entry.date || entry.createdAt,
      );
      await WorkEntryModel.updateOne(
        { _id: entry._id },
        { $set: { billNumber } },
      );
    }
  }

  /** List entries with optional date/status/vehicle/driver filters. */
  static async list(query = {}) {
    const WorkEntryModel = WorkEntry.getModel();
    await WorkEntryService.#ensureBillNumbers();
    const filter = {};

    if (query.from || query.to) {
      filter.date = {};
      if (query.from) filter.date.$gte = new Date(query.from);
      if (query.to) {
        const to = new Date(query.to);
        to.setHours(23, 59, 59, 999);
        filter.date.$lte = to;
      }
    }
    if (query.status) filter.status = query.status;
    if (query.vehicle) filter.vehicle = query.vehicle;
    if (query.driver) filter.driver = query.driver;
    if (query.type) filter.type = query.type;

    let cursor = WorkEntryModel.find(filter)
      .populate(WorkEntryService.#populate)
      .sort({ date: -1, createdAt: -1 });

    if (query.limit) {
      cursor = cursor.limit(Math.min(Number(query.limit) || 200, 500));
    }
    return cursor.lean();
  }

  /**
   * Create an entry and snapshot its billed amount from the rate card:
   * JCB → hours × hourly rate, Tipper → loads × material rate,
   * Tata Ace → trips × trip rate.
   */
  static async create(body, actorId = null) {
    FleetValidator.assert(FleetValidator.validateWorkEntry(body));

    const VehicleModel = Vehicle.getModel();
    const vehicle = await VehicleModel.findById(body.vehicle).lean();
    if (!vehicle) throw new AppError('Vehicle not found', 404);
    if (vehicle.type !== body.type) {
      throw new AppError(
        `Entry type ${body.type} does not match vehicle type ${vehicle.type}`,
        400,
      );
    }

    const date = new Date(body.date);
    const rate = await RateService.resolveAmount(vehicle.type, {
      material: body.material || null,
      customer: body.customer || null,
      date,
    });

    let quantity = 0;
    if (body.type === 'JCB') quantity = body.jcbHours;
    if (body.type === 'TIPPER') quantity = body.tipperLoads;
    if (body.type === 'TATA_ACE') quantity = body.aceTrips;

    const billedAmount = Math.round(rate * quantity * 100) / 100;
    const billNumber = await WorkEntryService.#nextBillNumber(date);

    const WorkEntryModel = WorkEntry.getModel();
    return WorkEntryModel.create({
      date,
      type: body.type,
      vehicle: body.vehicle,
      driver: body.driver,
      customer: body.customer || null,
      quarry: body.quarry || null,
      material: body.material || null,
      jcbHours: body.type === 'JCB' ? body.jcbHours : 0,
      tipperLoads: body.type === 'TIPPER' ? body.tipperLoads : 0,
      aceTrips: body.type === 'TATA_ACE' ? body.aceTrips : 0,
      dieselAmount: body.dieselAmount || 0,
      dieselLitres: body.dieselLitres || 0,
      otherExpense: body.otherExpense || 0,
      mobile: String(body.mobile || '').trim(),
      expenseCategory: String(body.expenseCategory || '').trim(),
      expenseDescription: String(body.expenseDescription || '').trim(),
      location: String(body.location || '').trim(),
      notes: String(body.notes || '').trim(),
      billedAmount,
      billNumber,
      rateSnapshot: rate,
      status: 'SUBMITTED',
      verifiedBy: actorId || null,
    });
  }

  /**
   * Admin status transition: SUBMITTED ↔ VERIFIED → LOCKED.
   * VERIFIED stamps verifiedAt/verifiedBy; SUBMITTED clears them.
   */
  static async setStatus(id, status, actorId = null) {
    FleetValidator.assert(FleetValidator.validateWorkEntryStatus({ status }));
    const WorkEntryModel = WorkEntry.getModel();

    const entry = await WorkEntryModel.findById(id);
    if (!entry) throw new AppError('Work entry not found', 404);

    entry.status = status;
    if (status === 'VERIFIED') {
      entry.verifiedAt = new Date();
      entry.verifiedBy = actorId || null;
    } else if (status === 'SUBMITTED') {
      entry.verifiedAt = null;
      entry.verifiedBy = null;
    }
    await entry.save({ validateBeforeSave: false });

    return WorkEntryModel.findById(id)
      .populate(WorkEntryService.#populate)
      .lean();
  }

  static async remove(id) {
    const WorkEntryModel = WorkEntry.getModel();
    const entry = await WorkEntryModel.findByIdAndDelete(id);
    if (!entry) throw new AppError('Work entry not found', 404);
    return { deleted: true, id };
  }

  /** Bulk delete for the admin entries list. */
  static async removeMany(ids) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new AppError('No entries selected', 400);
    }
    const valid = ids.filter(
      id => typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id),
    );
    if (!valid.length) throw new AppError('No valid entry ids', 400);
    const WorkEntryModel = WorkEntry.getModel();
    const result = await WorkEntryModel.deleteMany({ _id: { $in: valid } });
    return { deleted: result.deletedCount || 0 };
  }

  static async getById(id) {
    const WorkEntryModel = WorkEntry.getModel();
    const entry = await WorkEntryModel.findById(id)
      .populate(WorkEntryService.#populate)
      .lean();
    if (!entry) throw new AppError('Work entry not found', 404);
    return entry;
  }
}
