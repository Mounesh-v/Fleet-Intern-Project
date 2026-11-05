import BaseService from './BaseService.js';
import Quarry from '../models/Quarry.js';
import Material from '../models/Material.js';
import Customer from '../models/Customer.js';
import AppError from '../utility/AppError.js';
import FleetValidator from '../api/fleetValidation.js';

/**
 * MasterDataService — business rules for quarry, material, and
 * customer master records.
 *
 * Layering: routes → controller → service → model.
 * OOP concepts:
 * - Static domain service extending BaseService.
 * - Small cohesive domain: all "master data" reference entities.
 */
export default class MasterDataService extends BaseService {
  static #registry = {
    quarry: { model: () => Quarry.getModel(), label: 'Quarry', validate: FleetValidator.validateQuarry },
    material: { model: () => Material.getModel(), label: 'Material', validate: FleetValidator.validateMaterial },
    customer: { model: () => Customer.getModel(), label: 'Customer', validate: FleetValidator.validateCustomer },
  };

  static #entry(resource) {
    const entry = MasterDataService.#registry[resource];
    if (!entry) throw new AppError('Unknown master data resource', 400);
    return entry;
  }

  /** List records for a resource with optional status/search filters. */
  static async list(resource, query = {}) {
    const { model } = MasterDataService.#entry(resource);
    const Model = model();
    const filter = {};
    if (query.status) filter.status = query.status;
    if (query.search) {
      filter.name = { $regex: String(query.search).trim(), $options: 'i' };
    }
    return Model.find(filter).sort({ name: 1 }).lean();
  }

  static async getById(resource, id) {
    const { model, label } = MasterDataService.#entry(resource);
    const record = await model().findById(id).lean();
    if (!record) throw new AppError(`${label} not found`, 404);
    return record;
  }

  static async create(resource, body) {
    const { model, label, validate } = MasterDataService.#entry(resource);
    FleetValidator.assert(validate(body));
    const Model = model();

    const name = String(body.name).trim();
    const existing = await Model.findOne({ name });
    if (existing) {
      throw new AppError(`${label} with this name already exists`, 409);
    }

    const doc = { name, status: body.status || 'ACTIVE' };
    if (resource === 'quarry') {
      doc.location = String(body.location || '').trim();
      doc.contactPerson = String(body.contactPerson || '').trim();
      doc.phone = String(body.phone || '').trim();
    }
    if (resource === 'material') {
      doc.unit = body.unit || 'LOAD';
    }
    if (resource === 'customer') {
      doc.phone = String(body.phone || '').trim();
      doc.address = String(body.address || '').trim();
      doc.gstNo = String(body.gstNo || '').trim().toUpperCase();
    }
    return Model.create(doc);
  }

  static async update(resource, id, body) {
    const { model, label, validate } = MasterDataService.#entry(resource);
    FleetValidator.assert(validate(body));
    const Model = model();

    const name = String(body.name).trim();
    const clash = await Model.findOne({ name, _id: { $ne: id } });
    if (clash) {
      throw new AppError(`${label} with this name already exists`, 409);
    }

    const doc = { name, status: body.status || 'ACTIVE' };
    if (resource === 'quarry') {
      doc.location = String(body.location || '').trim();
      doc.contactPerson = String(body.contactPerson || '').trim();
      doc.phone = String(body.phone || '').trim();
    }
    if (resource === 'material') {
      doc.unit = body.unit || 'LOAD';
    }
    if (resource === 'customer') {
      doc.phone = String(body.phone || '').trim();
      doc.address = String(body.address || '').trim();
      doc.gstNo = String(body.gstNo || '').trim().toUpperCase();
    }

    const record = await Model.findByIdAndUpdate(id, doc, {
      new: true,
      runValidators: true,
    });
    if (!record) throw new AppError(`${label} not found`, 404);
    return record;
  }

  static async remove(resource, id) {
    const { model, label } = MasterDataService.#entry(resource);
    const record = await model().findByIdAndDelete(id);
    if (!record) throw new AppError(`${label} not found`, 404);
    return { deleted: true, id };
  }
}
