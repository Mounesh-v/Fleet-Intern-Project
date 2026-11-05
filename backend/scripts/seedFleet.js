import database from '../utility/db.js';
import env from '../utility/env.js';
import User from '../models/User.js';
import Vehicle from '../models/Vehicle.js';
import Driver from '../models/Driver.js';
import Quarry from '../models/Quarry.js';
import Material from '../models/Material.js';
import RateCard from '../models/RateCard.js';
import Customer from '../models/Customer.js';
import WorkEntry from '../models/WorkEntry.js';
import Payment from '../models/Payment.js';
import Expense from '../models/Expense.js';

/**
 * seedFleet — creates demo fleet data for the admin dashboard:
 * vehicles, drivers (+ DRIVER logins), quarries, materials, rates,
 * customers, 14 days of work entries, payments, and expenses.
 *
 * Idempotent: skips entirely when vehicles already exist.
 *
 * Usage: npm run seed   (from backend/)
 */
async function seedFleet() {
  env.assertEnv();
  await database.connect();

  try {
    const VehicleModel = Vehicle.getModel();
    const existing = await VehicleModel.countDocuments();
    if (existing > 0) {
      console.log(`Fleet data already exists (${existing} vehicles) — skipping.`);
      return { created: false };
    }

    // --- Master data -----------------------------------------------------
    const vehicles = await VehicleModel.create([
      { registrationNo: 'MH12 AB 1234', type: 'JCB', brand: 'JCB', model: '3DX', year: 2021 },
      { registrationNo: 'MH12 CD 5678', type: 'JCB', brand: 'JCB', model: '3CX', year: 2019 },
      { registrationNo: 'MH12 EF 9012', type: 'TIPPER', brand: 'Tata', model: 'Signa 2518', year: 2020 },
      { registrationNo: 'MH12 GH 3456', type: 'TIPPER', brand: 'Ashok Leyland', model: '3520', year: 2018 },
      { registrationNo: 'MH12 JK 7890', type: 'TATA_ACE', brand: 'Tata', model: 'Ace Gold', year: 2022 },
      { registrationNo: 'MH12 LM 2468', type: 'TATA_ACE', brand: 'Tata', model: 'Intra V30', year: 2023 },
    ]);

    const drivers = await Driver.getModel().create([
      { name: 'Ramesh Pawar', phone: '9876543210', employeeId: 'EMP001', licenseNo: 'MH12 20190012345', joinedAt: new Date('2023-04-01'), vehicle: vehicles[0]._id },
      { name: 'Suresh Jadhav', phone: '9876543211', employeeId: 'EMP002', licenseNo: 'MH12 20180067890', joinedAt: new Date('2022-06-15'), vehicle: vehicles[2]._id },
      { name: 'Mahesh Kadam', phone: '9876543212', employeeId: 'EMP003', licenseNo: 'MH12 20200023456', joinedAt: new Date('2023-01-10'), vehicle: vehicles[4]._id },
      { name: 'Vikas Shinde', phone: '9876543213', employeeId: 'EMP004', licenseNo: 'MH12 20170078901', joinedAt: new Date('2021-09-20'), vehicle: vehicles[1]._id },
      { name: 'Anil More', phone: '9876543214', employeeId: 'EMP005', licenseNo: 'MH12 20210034567', joinedAt: new Date('2024-02-05'), vehicle: vehicles[3]._id },
      { name: 'Deepak Chavan', phone: '9876543215', employeeId: 'EMP006', licenseNo: 'MH12 20220045678', joinedAt: new Date('2024-07-12'), vehicle: vehicles[5]._id },
    ]);

    const quarries = await Quarry.getModel().create([
      { name: 'Pune Stone Quarry', location: 'Hinjawadi, Pune', contactPerson: 'Ganesh Patil', phone: '9822011001' },
      { name: 'Riverbed Supplier', location: 'Mula River, Pune', contactPerson: 'Sharma Traders', phone: '9822011002' },
      { name: 'Khopoli M-Sand', location: 'Khopoli, Raigad', contactPerson: 'Ravi Mills', phone: '9822011003' },
      { name: 'Local Soil Depot', location: 'Chinchwad, Pune', contactPerson: 'Bhau Depot', phone: '9822011004' },
    ]);

    const materials = await Material.getModel().create([
      { name: 'M-Sand', unit: 'LOAD' },
      { name: 'Jelly 20mm', unit: 'LOAD' },
      { name: 'Soil', unit: 'LOAD' },
      { name: 'Murum', unit: 'LOAD' },
      { name: 'Boulder', unit: 'TONNE' },
    ]);

    const customers = await Customer.getModel().create([
      { name: 'Sri Balaji Constructions', phone: '9922001101', address: 'Baner, Pune' },
      { name: 'Green Fields Developers', phone: '9922001102', address: 'Wakad, Pune' },
      { name: 'Om Sai Builders', phone: '9922001103', address: 'Hinjawadi, Pune' },
      { name: 'City Roadworks Dept', phone: '9922001104', address: 'PMC Office, Pune', gstNo: '27AAAPC1234F1Z5' },
      { name: 'Krishna Estates', phone: '9922001105', address: 'Thane, Mumbai' },
      { name: 'Walk-in Customer', phone: '', address: '' },
    ]);

    // --- Rates (effective from 60 days ago) ------------------------------
    const effectiveFrom = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    await RateCard.getModel().create([
      { vehicleType: 'JCB', rateType: 'HOUR', amount: 1200, effectiveFrom },
      { vehicleType: 'TIPPER', rateType: 'LOAD', amount: 2800, effectiveFrom },
      { vehicleType: 'TIPPER', rateType: 'LOAD', amount: 3200, material: materials[0]._id, effectiveFrom },
      { vehicleType: 'TIPPER', rateType: 'LOAD', amount: 3000, material: materials[1]._id, effectiveFrom },
      { vehicleType: 'TATA_ACE', rateType: 'TRIP', amount: 900, effectiveFrom },
      { vehicleType: 'TATA_ACE', rateType: 'TRIP', amount: 1100, customer: customers[0]._id, effectiveFrom },
      { vehicleType: 'JCB', rateType: 'HOUR', amount: 1350, customer: customers[3]._id, effectiveFrom },
    ]);

    // --- Driver logins ---------------------------------------------------
    const UserModel = User.getModel();
    for (let i = 0; i < drivers.length; i += 1) {
      const username = `driver${i + 1}`;
      const existingUser = await UserModel.findOne({ username }).select(
        '+password',
      );
      if (!existingUser) {
        await UserModel.create({
          username,
          password: 'Driver@12345',
          role: 'DRIVER',
          driverId: drivers[i]._id,
          status: 'ACTIVE',
        });
      } else {
        // Repair stale demo accounts so they match the seeded drivers.
        existingUser.password = 'Driver@12345';
        existingUser.driverId = drivers[i]._id;
        existingUser.status = 'ACTIVE';
        await existingUser.save();
      }
    }

    // --- Work entries: last 14 days --------------------------------------
    const rates = { JCB: 1200, TIPPER: 2800, TATA_ACE: 900 };
    const tipperMaterialRates = { 0: 3200, 1: 3000 };
    const entryDocs = [];

    for (let day = 13; day >= 0; day -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - day);
      date.setHours(12, 0, 0, 0);
      const dow = date.getDay();
      if (dow === 0) continue; // no work on Sundays

      const count = 2 + ((13 - day) % 3); // 2–4 entries per working day
      for (let i = 0; i < count; i += 1) {
        const vehicle = vehicles[(day + i) % vehicles.length];
        const driver = drivers[(day + i) % drivers.length];
        const customer = customers[(day + i * 2) % customers.length];
        const type = vehicle.type;

        let quantity = 0;
        let billed = 0;
        let material = null;
        let quarry = quarries[(day + i) % quarries.length]._id;

        if (type === 'JCB') {
          quantity = 3 + ((day + i) % 5); // 3–7 hours
          const rate = String(customer._id) === String(customers[3]._id) ? 1350 : rates.JCB;
          billed = rate * quantity;
        } else if (type === 'TIPPER') {
          quantity = 2 + ((day + i) % 4); // 2–5 loads
          const matIndex = (day + i) % 2; // M-Sand or Jelly
          material = materials[matIndex]._id;
          billed = tipperMaterialRates[matIndex] * quantity;
        } else {
          quantity = 3 + ((day + i) % 6); // 3–8 trips
          billed = rates.TATA_ACE * quantity;
        }

        entryDocs.push({
          date,
          type,
          vehicle: vehicle._id,
          driver: driver._id,
          customer: customer._id,
          quarry,
          material,
          jcbHours: type === 'JCB' ? quantity : 0,
          tipperLoads: type === 'TIPPER' ? quantity : 0,
          aceTrips: type === 'TATA_ACE' ? quantity : 0,
          dieselAmount: 800 + ((day * 137 + i * 53) % 900),
          dieselLitres: 10 + ((day + i) % 12),
          otherExpense: (day + i) % 3 === 0 ? 150 + ((day + i) % 4) * 50 : 0,
          location: 'Pune Region',
          notes: '',
          billedAmount: billed,
          rateSnapshot: type === 'JCB' ? rates.JCB : type === 'TIPPER' ? 2800 : rates.TATA_ACE,
          status: day > 1 ? 'LOCKED' : day > 0 ? 'VERIFIED' : 'SUBMITTED',
          verifiedAt: day > 0 ? date : null,
        });
      }
    }
    await WorkEntry.getModel().create(entryDocs);

    // --- Payments & expenses ---------------------------------------------
    const paymentDocs = [];
    for (let i = 0; i < customers.length - 1; i += 1) {
      paymentDocs.push({
        customer: customers[i]._id,
        amount: 5000 + i * 2500,
        date: new Date(Date.now() - (i + 2) * 24 * 60 * 60 * 1000),
        mode: ['CASH', 'UPI', 'BANK', 'CHEQUE'][i % 4],
        reference: i % 2 === 0 ? `REF${1000 + i}` : '',
        notes: 'Part payment',
      });
    }
    await Payment.getModel().create(paymentDocs);

    const expenseDocs = [];
    for (let day = 13; day >= 0; day -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - day);
      date.setHours(12, 0, 0, 0);
      if (day % 2 === 0) {
        expenseDocs.push({
          date,
          kind: 'OPERATING',
          category: 'DIESEL',
          amount: 3500 + (day % 5) * 400,
          vehicle: vehicles[day % vehicles.length]._id,
          litres: 40 + (day % 3) * 10,
          notes: 'Bunk fill',
        });
      }
      if (day % 5 === 0) {
        expenseDocs.push({
          date,
          kind: 'OPERATING',
          category: 'TOLL',
          amount: 200 + (day % 4) * 50,
          notes: 'Highway toll',
        });
      }
    }
    expenseDocs.push(
      {
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        kind: 'VEHICLE',
        category: 'INSURANCE',
        amount: 18500,
        vehicle: vehicles[0]._id,
        notes: 'Annual comprehensive',
      },
      {
        date: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
        kind: 'VEHICLE',
        category: 'SERVICE',
        amount: 6200,
        vehicle: vehicles[2]._id,
        notes: '10k service',
      },
    );
    await Expense.getModel().create(expenseDocs);

    console.log('Fleet demo data seeded:');
    console.log(`  vehicles=${vehicles.length} drivers=${drivers.length} quarries=${quarries.length}`);
    console.log(`  materials=${materials.length} customers=${customers.length}`);
    console.log(`  workEntries=${entryDocs.length} payments=${paymentDocs.length} expenses=${expenseDocs.length}`);
    console.log('  driver logins: driver1..driver6 / Driver@12345');
    return { created: true };
  } finally {
    await database.disconnect();
  }
}

import { pathToFileURL } from 'node:url';

// Run only when executed directly (not when imported).
const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  seedFleet()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err.message);
      process.exit(1);
    });
}

export { seedFleet };
