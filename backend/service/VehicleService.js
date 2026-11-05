import BaseService from './BaseService.js';
import Vehicle from '../models/Vehicle.js';
import AppError from '../utility/AppError.js';
import FleetValidator from '../api/fleetValidation.js';

/**
 * VehicleService — business rules for vehicle master data.
 *
 * Layering: routes → controller → service → model.
 * OOP concepts: static domain service extending BaseService.
 */
export default class VehicleService extends BaseService {
  /** List vehicles with optional status/type/search filters. */
  static async list(query = {}) {
    const VehicleModel = Vehicle.getModel();
    const filter = {};
    if (query.status) filter.status = query.status;
    if (query.type) filter.type = query.type;
    if (query.search) {
      filter.registrationNo = {
        $regex: String(query.search).trim(),
        $options: 'i',
      };
    }
    return VehicleModel.find(filter)
      .sort({ registrationNo: 1 })
      .lean();
  }

  static async getById(id) {
    const VehicleModel = Vehicle.getModel();
    const vehicle = await VehicleModel.findById(id).lean();
    if (!vehicle) throw new AppError('Vehicle not found', 404);
    return vehicle;
  }

  static async create(body) {
    FleetValidator.assert(FleetValidator.validateVehicle(body));
    const VehicleModel = Vehicle.getModel();
    const registrationNo = String(body.registrationNo).trim().toUpperCase();

    const existing = await VehicleModel.findOne({ registrationNo });
    if (existing) {
      throw new AppError('Vehicle with this registration number already exists', 409);
    }

    return VehicleModel.create({
      registrationNo,
      type: body.type,
      brand: String(body.brand || '').trim(),
      model: String(body.model || '').trim(),
      year: Number.isFinite(body.year) ? body.year : null,
      fuelType: body.fuelType || 'DIESEL',
      status: body.status || 'ACTIVE',
      notes: String(body.notes || '').trim(),
    });
  }

  static async update(id, body) {
    FleetValidator.assert(FleetValidator.validateVehicle(body));
    const VehicleModel = Vehicle.getModel();
    const registrationNo = String(body.registrationNo).trim().toUpperCase();

    const clash = await VehicleModel.findOne({
      registrationNo,
      _id: { $ne: id },
    });
    if (clash) {
      throw new AppError('Vehicle with this registration number already exists', 409);
    }

    const vehicle = await VehicleModel.findByIdAndUpdate(
      id,
      {
        registrationNo,
        type: body.type,
        brand: String(body.brand || '').trim(),
        model: String(body.model || '').trim(),
        year: Number.isFinite(body.year) ? body.year : null,
        status: body.status || 'ACTIVE',
        notes: String(body.notes || '').trim(),
      },
      { new: true, runValidators: true },
    );
    if (!vehicle) throw new AppError('Vehicle not found', 404);
    return vehicle;
  }

  static async remove(id) {
    const VehicleModel = Vehicle.getModel();
    const vehicle = await VehicleModel.findByIdAndDelete(id);
    if (!vehicle) throw new AppError('Vehicle not found', 404);
    return { deleted: true, id };
  }
}
