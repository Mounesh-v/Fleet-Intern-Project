import mongoose from 'mongoose';
import BaseService from './BaseService.js';
import User from '../models/User.js';
import Driver from '../models/Driver.js';
import Vehicle from '../models/Vehicle.js';
import Customer from '../models/Customer.js';
import Material from '../models/Material.js';
import Quarry from '../models/Quarry.js';
import AppError from '../utility/AppError.js';
import WorkEntryService from './WorkEntryService.js';

const VEHICLE_FIELDS = 'registrationNo type brand model status';

/**
 * DriverPortalService — everything a signed-in driver can do:
 * read their own profile, browse form reference data, list their
 * own work entries, and submit new ones.
 *
 * Security: the driver id always comes from the session (userId),
 * never from the request body — drivers cannot read or write
 * another driver's records.
 *
 * OOP concepts: static domain service extending BaseService;
 * composition — entry creation delegates billing to WorkEntryService.
 */
export default class DriverPortalService extends BaseService {
  /** Safe user + driver profile (with assigned vehicle) for the session. */
  static async session(userId) {
    const user = await DriverPortalService.#loadUserWithDriver(userId);
    return { user: User.toSafeUser(user.user), driver: user.driver };
  }

  /** Own work entries, newest first (driver scope forced server-side). */
  static async listEntries(userId, query = {}) {
    const { driver } = await DriverPortalService.#loadUserWithDriver(userId);
    return WorkEntryService.list({ ...query, driver: driver._id });
  }

  /** Reference data: active vehicles, materials and quarries. */
  static async options() {
    const [vehicles, materials, quarries] = await Promise.all([
      Vehicle.getModel()
        .find({ status: 'ACTIVE' })
        .sort({ registrationNo: 1 })
        .lean(),
      Material.getModel()
        .find({ status: 'ACTIVE' })
        .sort({ name: 1 })
        .lean(),
      Quarry.getModel()
        .find({ status: 'ACTIVE' })
        .sort({ name: 1 })
        .lean(),
    ]);
    return { vehicles, materials, quarries };
  }

  /**
   * Submit a work entry for the signed-in driver.
   * - type is derived from the chosen vehicle (never trusted from body)
   * - customer is resolved by name (or registered on first use)
   * - billedAmount is snapshotted by WorkEntryService from the rate card
   */
  static async createEntry(userId, body) {
    const { user, driver } = await DriverPortalService.#loadUserWithDriver(userId);

    const date = body?.date ? new Date(body.date) : null;
    if (!date || Number.isNaN(date.getTime())) {
      throw new AppError('A valid work date is required', 400);
    }

    const vehicleId = body?.vehicle;
    if (!DriverPortalService.#isId(vehicleId)) {
      throw new AppError('A vehicle is required', 400);
    }
    const vehicle = await Vehicle.getModel().findById(vehicleId).lean();
    if (!vehicle) throw new AppError('Vehicle not found', 404);
    if (vehicle.status !== 'ACTIVE') {
      throw new AppError('This vehicle is not active', 400);
    }

    const type = vehicle.type;
    let jcbHours = 0;
    let tipperLoads = 0;
    let aceTrips = 0;

    if (type === 'JCB') {
      jcbHours = DriverPortalService.#num(body?.jcbHours);
      if (jcbHours <= 0) {
        throw new AppError('Working hours must be greater than 0', 400);
      }
    } else if (type === 'TIPPER') {
      tipperLoads = DriverPortalService.#num(body?.tipperLoads);
      if (tipperLoads <= 0) {
        throw new AppError('Number of loads must be greater than 0', 400);
      }
      if (!DriverPortalService.#isId(body?.material)) {
        throw new AppError('Material is required for tipper work', 400);
      }
      const material = await Material.getModel().findById(body.material).lean();
      if (!material) throw new AppError('Material not found', 404);
    } else {
      aceTrips = DriverPortalService.#num(body?.aceTrips);
      if (aceTrips <= 0) {
        throw new AppError('Number of trips must be greater than 0', 400);
      }
    }

    // Optional material on non-tipper entries: must exist when given.
    let materialId = null;
    if (body?.material && type !== 'TIPPER') {
      if (!DriverPortalService.#isId(body.material)) {
        throw new AppError('material must be a valid record identifier', 400);
      }
      const material = await Material.getModel().findById(body.material).lean();
      if (!material) throw new AppError('Material not found', 404);
      materialId = material._id;
    } else if (type === 'TIPPER') {
      materialId = body.material;
    }

    let quarryId = null;
    if (body?.quarry) {
      if (!DriverPortalService.#isId(body.quarry)) {
        throw new AppError('quarry must be a valid record identifier', 400);
      }
      const quarry = await Quarry.getModel().findById(body.quarry).lean();
      if (!quarry) throw new AppError('Quarry not found', 404);
      quarryId = quarry._id;
    }

    const mobile = String(body?.mobile || '').trim();
    if (mobile && !/^\d{10}$/.test(mobile)) {
      throw new AppError('Mobile number must be 10 digits', 400);
    }

    const customer = await DriverPortalService.#resolveCustomer(
      body?.customerName,
      mobile,
    );

    const entry = await WorkEntryService.create(
      {
        date: body.date,
        type,
        vehicle: String(vehicle._id),
        driver: String(driver._id),
        customer: String(customer._id),
        quarry: quarryId ? String(quarryId) : null,
        material: materialId ? String(materialId) : null,
        jcbHours,
        tipperLoads,
        aceTrips,
        dieselAmount: DriverPortalService.#num(body?.dieselAmount),
        dieselLitres: DriverPortalService.#num(body?.dieselLitres),
        otherExpense: DriverPortalService.#num(body?.otherExpense),
        mobile,
        expenseCategory: String(body?.expenseCategory || '').trim(),
        expenseDescription: String(body?.expenseDescription || '').trim(),
        location: String(body?.location || '').trim(),
        notes: String(body?.notes || '').trim(),
      },
      user._id,
    );

    return WorkEntryService.getById(entry._id);
  }

  /**
   * Resolve the customer by exact name (case-insensitive); register
   * a new customer on first use so the driver never has to manage
   * master data while recording work.
   * @returns {Promise<import('mongoose').Document>}
   */
  static async #resolveCustomer(customerName, mobile) {
    const name = String(customerName || '').trim();
    if (!name) throw new AppError('Customer name is required', 400);
    if (name.length > 80) {
      throw new AppError('Customer name must be at most 80 characters', 400);
    }

    const CustomerModel = Customer.getModel();
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existing = await CustomerModel.findOne({
      name: { $regex: `^${escaped}$`, $options: 'i' },
    });

    if (existing) {
      if (!existing.phone && mobile) {
        existing.phone = mobile;
        await existing.save({ validateBeforeSave: false });
      }
      return existing;
    }
    return CustomerModel.create({ name, phone: mobile });
  }

  /** Load the user and their linked driver profile (with vehicle). */
  static async #loadUserWithDriver(userId) {
    const UserModel = User.getModel();
    const user = await UserModel.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    if (!user.driverId) {
      throw new AppError('No driver profile is linked to this account', 400);
    }

    const driver = await Driver.getModel()
      .findById(user.driverId)
      .populate('vehicle', VEHICLE_FIELDS)
      .lean();
    if (!driver) throw new AppError('Driver profile not found', 404);
    return { user, driver };
  }

  /** @param {unknown} value */
  static #isId(value) {
    return typeof value === 'string' && mongoose.Types.ObjectId.isValid(value);
  }

  /** Coerce form input to a safe non-negative number. */
  static #num(value) {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }
}
