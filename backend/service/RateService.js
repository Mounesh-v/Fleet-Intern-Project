import BaseService from './BaseService.js';
import RateCard from '../models/RateCard.js';
import AppError from '../utility/AppError.js';
import FleetValidator from '../api/fleetValidation.js';

/**
 * RateService — rate card CRUD + rate resolution for billing.
 *
 * Resolution priority (highest first):
 *   customer + material → customer → material → default (no scope).
 * Among equal scope, the latest effectiveFrom <= entry date wins.
 *
 * Layering: routes → controller → service → model.
 * OOP concepts: static domain service extending BaseService.
 */
export default class RateService extends BaseService {
  static async list(query = {}) {
    const RateModel = RateCard.getModel();
    const filter = {};
    if (query.vehicleType) filter.vehicleType = query.vehicleType;
    if (query.active !== undefined && query.active !== '') {
      filter.active = query.active === 'true' || query.active === true;
    }
    return RateModel.find(filter)
      .populate('material', 'name unit')
      .populate('customer', 'name')
      .sort({ vehicleType: 1, effectiveFrom: -1 })
      .lean();
  }

  static async create(body) {
    FleetValidator.assert(FleetValidator.validateRate(body));
    const RateModel = RateCard.getModel();

    return RateModel.create({
      vehicleType: body.vehicleType,
      rateType: body.rateType,
      amount: body.amount,
      material: body.material || null,
      customer: body.customer || null,
      effectiveFrom: new Date(body.effectiveFrom),
      active: body.active !== false,
    });
  }

  static async remove(id) {
    const RateModel = RateCard.getModel();
    const rate = await RateModel.findByIdAndDelete(id);
    if (!rate) throw new AppError('Rate not found', 404);
    return { deleted: true, id };
  }

  /**
   * Resolve the billing amount for a vehicle type on a date.
   * @returns {Promise<number>} rate amount per unit
   * @throws {AppError} 404 when no active rate applies
   */
  static async resolveAmount(vehicleType, { material = null, customer = null, date = new Date() } = {}) {
    const RateModel = RateCard.getModel();
    const candidates = await RateModel.find({
      vehicleType,
      active: true,
      effectiveFrom: { $lte: date },
    })
      .sort({ effectiveFrom: -1 })
      .lean();

    if (candidates.length === 0) {
      throw new AppError(
        `No active rate configured for ${vehicleType}. Add one under Rates first.`,
        404,
      );
    }

    // A rate applies only when its optional scopes match the request
    // (unset scope = wildcard; set scope must equal the requested value).
    const applicable = candidates.filter(
      rate =>
        (!rate.customer || String(rate.customer) === String(customer || '')) &&
        (!rate.material || String(rate.material) === String(material || '')),
    );

    const scopeScore = rate =>
      (rate.customer ? 2 : 0) + (rate.material ? 1 : 0);

    let best = null;
    for (const rate of applicable) {
      if (!best || scopeScore(rate) > scopeScore(best)) {
        best = rate;
      }
    }

    if (!best) {
      throw new AppError(
        `No active rate configured for ${vehicleType}. Add one under Rates first.`,
        404,
      );
    }
    return best.amount;
  }
}
