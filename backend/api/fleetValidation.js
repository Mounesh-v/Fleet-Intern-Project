import AppError from '../utility/AppError.js';
import Vehicle from '../models/Vehicle.js';
import Driver from '../models/Driver.js';
import RateCard from '../models/RateCard.js';
import Expense from '../models/Expense.js';
import Payment from '../models/Payment.js';

/**
 * FleetValidator — request validation for all fleet admin endpoints.
 *
 * Layer position: api/ validates the HTTP contract before the
 * service layer runs business rules.
 *
 * OOP concepts:
 * - Static utility class: stateless helpers grouped by domain.
 * - One validator class per bounded context (fleet), mirroring AuthValidator.
 */
export default class FleetValidator {
  static #isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  static #isOptionalString(value) {
    return value === undefined || value === null || typeof value === 'string';
  }

  static #isObjectId(value) {
    return typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value.trim());
  }

  static #isDate(value) {
    return !Number.isNaN(Date.parse(value));
  }

  static #isMoney(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
  }

  /** @returns {string[]} list of error messages (empty when valid) */
  static validateVehicle(body) {
    const errors = [];
    if (!FleetValidator.#isNonEmptyString(body?.registrationNo)) {
      errors.push('registrationNo is required');
    } else if (body.registrationNo.trim().length > 20) {
      errors.push('registrationNo must be at most 20 characters');
    }
    if (!Vehicle.TYPES.includes(body?.type)) {
      errors.push(`type must be one of: ${Vehicle.TYPES.join(', ')}`);
    }
    if (!FleetValidator.#isOptionalString(body?.brand)) {
      errors.push('brand must be a string');
    }
    if (!FleetValidator.#isOptionalString(body?.model)) {
      errors.push('model must be a string');
    }
    if (body?.status !== undefined && !Vehicle.STATUSES.includes(body.status)) {
      errors.push(`status must be one of: ${Vehicle.STATUSES.join(', ')}`);
    }
    return errors;
  }

  static validateDriver(body) {
    const errors = [];
    if (!FleetValidator.#isNonEmptyString(body?.name)) {
      errors.push('name is required');
    }
    if (!FleetValidator.#isOptionalString(body?.phone)) {
      errors.push('phone must be a string');
    }
    if (!FleetValidator.#isOptionalString(body?.employeeId)) {
      errors.push('employeeId must be a string');
    }
    if (
      body?.vehicle !== undefined &&
      body.vehicle !== null &&
      !FleetValidator.#isObjectId(body.vehicle)
    ) {
      errors.push('vehicle must be a valid record identifier');
    }
    if (body?.status !== undefined && !Driver.STATUSES.includes(body.status)) {
      errors.push(`status must be one of: ${Driver.STATUSES.join(', ')}`);
    }
    return errors;
  }

  /** Admin vehicle assignment: { vehicle: <id> | null }. */
  static validateAssignVehicle(body) {
    const errors = [];
    if (body?.vehicle === undefined || body.vehicle === null) {
      return errors; // null/absent = unassign, always valid
    }
    if (!FleetValidator.#isObjectId(body.vehicle)) {
      errors.push('vehicle must be a valid record identifier or null');
    }
    return errors;
  }

  static validateQuarry(body) {
    const errors = [];
    if (!FleetValidator.#isNonEmptyString(body?.name)) {
      errors.push('name is required');
    }
    if (!FleetValidator.#isOptionalString(body?.location)) {
      errors.push('location must be a string');
    }
    return errors;
  }

  static validateMaterial(body) {
    const errors = [];
    if (!FleetValidator.#isNonEmptyString(body?.name)) {
      errors.push('name is required');
    }
    if (
      body?.unit !== undefined &&
      !['LOAD', 'TONNE', 'CUBIC_METER'].includes(body.unit)
    ) {
      errors.push('unit must be LOAD, TONNE, or CUBIC_METER');
    }
    return errors;
  }

  static validateRate(body) {
    const errors = [];
    if (!RateCard.VEHICLE_TYPES.includes(body?.vehicleType)) {
      errors.push(`vehicleType must be one of: ${RateCard.VEHICLE_TYPES.join(', ')}`);
    }
    if (!RateCard.RATE_TYPES.includes(body?.rateType)) {
      errors.push(`rateType must be one of: ${RateCard.RATE_TYPES.join(', ')}`);
    } else if (
      RateCard.VEHICLE_TYPES.includes(body?.vehicleType) &&
      RateCard.PAIRS[body.vehicleType] !== body.rateType
    ) {
      errors.push(
        `rateType for ${body.vehicleType} must be ${RateCard.PAIRS[body.vehicleType]}`,
      );
    }
    if (typeof body?.amount !== 'number' || !Number.isFinite(body.amount) || body.amount < 0) {
      errors.push('amount must be a number greater than or equal to 0');
    }
    if (!FleetValidator.#isDate(body?.effectiveFrom)) {
      errors.push('effectiveFrom is required and must be a valid date');
    }
    if (body?.material !== undefined && body.material !== null && !FleetValidator.#isObjectId(body.material)) {
      errors.push('material must be a valid record identifier');
    }
    if (body?.customer !== undefined && body.customer !== null && !FleetValidator.#isObjectId(body.customer)) {
      errors.push('customer must be a valid record identifier');
    }
    return errors;
  }

  static validateCustomer(body) {
    const errors = [];
    if (!FleetValidator.#isNonEmptyString(body?.name)) {
      errors.push('name is required');
    }
    if (!FleetValidator.#isOptionalString(body?.phone)) {
      errors.push('phone must be a string');
    }
    if (!FleetValidator.#isOptionalString(body?.address)) {
      errors.push('address must be a string');
    }
    return errors;
  }

  static validateWorkEntry(body) {
    const errors = [];
    if (!FleetValidator.#isDate(body?.date)) {
      errors.push('date is required and must be a valid date');
    }
    if (!WorkEntryTypes.includes(body?.type)) {
      errors.push(`type must be one of: ${WorkEntryTypes.join(', ')}`);
    }
    if (!FleetValidator.#isObjectId(body?.vehicle)) {
      errors.push('vehicle must be a valid record identifier');
    }
    if (!FleetValidator.#isObjectId(body?.driver)) {
      errors.push('driver must be a valid record identifier');
    }
    if (body?.customer !== undefined && body.customer !== null && !FleetValidator.#isObjectId(body.customer)) {
      errors.push('customer must be a valid record identifier');
    }
    if (body?.type === 'JCB') {
      if (typeof body?.jcbHours !== 'number' || body.jcbHours <= 0) {
        errors.push('jcbHours must be a number greater than 0 for JCB entries');
      }
    }
    if (body?.type === 'TIPPER') {
      if (typeof body?.tipperLoads !== 'number' || body.tipperLoads <= 0) {
        errors.push('tipperLoads must be a number greater than 0 for Tipper entries');
      }
      if (!FleetValidator.#isObjectId(body?.material)) {
        errors.push('material is required for Tipper entries');
      }
    }
    if (body?.type === 'TATA_ACE') {
      if (typeof body?.aceTrips !== 'number' || body.aceTrips <= 0) {
        errors.push('aceTrips must be a number greater than 0 for Tata Ace entries');
      }
    }
    for (const key of ['dieselAmount', 'dieselLitres', 'otherExpense']) {
      if (body?.[key] !== undefined && !FleetValidator.#isMoney(body[key])) {
        errors.push(`${key} must be a number greater than or equal to 0`);
      }
    }
    return errors;
  }

  static validateWorkEntryStatus(body) {
    const errors = [];
    if (!['SUBMITTED', 'VERIFIED', 'LOCKED'].includes(body?.status)) {
      errors.push('status must be SUBMITTED, VERIFIED, or LOCKED');
    }
    return errors;
  }

  static validatePayment(body) {
    const errors = [];
    if (!FleetValidator.#isObjectId(body?.customer)) {
      errors.push('customer must be a valid record identifier');
    }
    if (typeof body?.amount !== 'number' || !(body.amount > 0)) {
      errors.push('amount must be a number greater than 0');
    }
    if (!FleetValidator.#isDate(body?.date)) {
      errors.push('date is required and must be a valid date');
    }
    if (body?.mode !== undefined && !Payment.MODES.includes(body.mode)) {
      errors.push(`mode must be one of: ${Payment.MODES.join(', ')}`);
    }
    return errors;
  }

  static validateExpense(body) {
    const errors = [];
    if (!FleetValidator.#isDate(body?.date)) {
      errors.push('date is required and must be a valid date');
    }
    if (!Expense.KINDS.includes(body?.kind)) {
      errors.push(`kind must be one of: ${Expense.KINDS.join(', ')}`);
    } else if (
      body?.category !== undefined &&
      !Expense.CATEGORIES_BY_KIND[body.kind].includes(body.category)
    ) {
      errors.push(
        `category for ${body.kind} must be one of: ${Expense.CATEGORIES_BY_KIND[body.kind].join(', ')}`,
      );
    } else if (body?.category === undefined) {
      errors.push('category is required');
    }
    if (typeof body?.amount !== 'number' || !(body.amount > 0)) {
      errors.push('amount must be a number greater than 0');
    }
    if (body?.vehicle !== undefined && body.vehicle !== null && !FleetValidator.#isObjectId(body.vehicle)) {
      errors.push('vehicle must be a valid record identifier');
    }
    if (body?.litres !== undefined && !FleetValidator.#isMoney(body.litres)) {
      errors.push('litres must be a number greater than or equal to 0');
    }
    return errors;
  }

  /**
   * Throw AppError when any validator returns messages.
   * @param {string[]} errors
   */
  static assert(errors) {
    if (errors.length > 0) {
      throw new AppError('Validation failed', 400, errors);
    }
  }
}

/** Local alias — avoids importing WorkEntry just for the type list. */
const WorkEntryTypes = Object.freeze(['JCB', 'TIPPER', 'TATA_ACE']);
