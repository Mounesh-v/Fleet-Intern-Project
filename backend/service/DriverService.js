import BaseService from './BaseService.js';
import Driver from '../models/Driver.js';
import Vehicle from '../models/Vehicle.js';
import AppError from '../utility/AppError.js';
import FleetValidator from '../api/fleetValidation.js';

const VEHICLE_FIELDS = 'registrationNo type brand model status';

/**
 * DriverService — business rules for driver master data and
 * admin vehicle assignment.
 *
 * Layering: routes → controller → service → model.
 * OOP concepts: static domain service extending BaseService.
 */
export default class DriverService extends BaseService {
  /** List drivers (with assigned vehicle) and optional status/search filters. */
  static async list(query = {}) {
    const DriverModel = Driver.getModel();
    const filter = {};
    if (query.status) filter.status = query.status;
    if (query.search) {
      filter.$or = [
        { name: { $regex: String(query.search).trim(), $options: 'i' } },
        { employeeId: { $regex: String(query.search).trim(), $options: 'i' } },
        { phone: { $regex: String(query.search).trim(), $options: 'i' } },
      ];
    }
    return DriverModel.find(filter)
      .populate('vehicle', VEHICLE_FIELDS)
      .sort({ name: 1 })
      .lean();
  }

  static async getById(id) {
    const DriverModel = Driver.getModel();
    const driver = await DriverModel.findById(id)
      .populate('vehicle', VEHICLE_FIELDS)
      .lean();
    if (!driver) throw new AppError('Driver not found', 404);
    return driver;
  }

  static async create(body) {
    FleetValidator.assert(FleetValidator.validateDriver(body));
    const DriverModel = Driver.getModel();
    const employeeId = body.employeeId
      ? String(body.employeeId).trim().toUpperCase()
      : null;

    if (employeeId) {
      const existing = await DriverModel.findOne({ employeeId });
      if (existing) {
        throw new AppError('Driver with this employee ID already exists', 409);
      }
    }

    if (body.vehicle) {
      await DriverService.#assertVehicleExists(body.vehicle);
    }

    return DriverModel.create({
      name: String(body.name).trim(),
      phone: String(body.phone || '').trim(),
      employeeId,
      licenseNo: String(body.licenseNo || '').trim().toUpperCase(),
      vehicle: body.vehicle || null,
      status: body.status || 'ACTIVE',
      joinedAt: body.joinedAt ? new Date(body.joinedAt) : new Date(),
      notes: String(body.notes || '').trim(),
    });
  }

  static async update(id, body) {
    FleetValidator.assert(FleetValidator.validateDriver(body));
    const DriverModel = Driver.getModel();
    const employeeId = body.employeeId
      ? String(body.employeeId).trim().toUpperCase()
      : null;

    if (employeeId) {
      const clash = await DriverModel.findOne({ employeeId, _id: { $ne: id } });
      if (clash) {
        throw new AppError('Driver with this employee ID already exists', 409);
      }
    }

    if (body.vehicle) {
      await DriverService.#assertVehicleExists(body.vehicle);
    }

    const driver = await DriverModel.findByIdAndUpdate(
      id,
      {
        name: String(body.name).trim(),
        phone: String(body.phone || '').trim(),
        employeeId,
        licenseNo: String(body.licenseNo || '').trim().toUpperCase(),
        vehicle: body.vehicle || null,
        status: body.status || 'ACTIVE',
        notes: String(body.notes || '').trim(),
      },
      { new: true, runValidators: true },
    ).populate('vehicle', VEHICLE_FIELDS);
    if (!driver) throw new AppError('Driver not found', 404);
    return driver;
  }

  /**
   * Admin: assign a vehicle to a driver (or unassign with null).
   * Reassignment replaces the link; past work entries keep their
   * own vehicle snapshot and are never rewritten.
   */
  static async assignVehicle(id, body) {
    FleetValidator.assert(FleetValidator.validateAssignVehicle(body));
    const DriverModel = Driver.getModel();

    if (body.vehicle) {
      await DriverService.#assertVehicleExists(body.vehicle);
    }

    const driver = await DriverModel.findByIdAndUpdate(
      id,
      { vehicle: body.vehicle || null },
      { new: true, runValidators: true },
    ).populate('vehicle', VEHICLE_FIELDS);

    if (!driver) throw new AppError('Driver not found', 404);
    return driver;
  }

  static async remove(id) {
    const DriverModel = Driver.getModel();
    const driver = await DriverModel.findByIdAndDelete(id);
    if (!driver) throw new AppError('Driver not found', 404);
    return { deleted: true, id };
  }

  /** @param {string} vehicleId */
  static async #assertVehicleExists(vehicleId) {
    const VehicleModel = Vehicle.getModel();
    const vehicle = await VehicleModel.findById(vehicleId).lean();
    if (!vehicle) throw new AppError('Vehicle not found', 404);
    return vehicle;
  }
}
