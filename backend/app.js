import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import vehicleRoutes from './routes/vehicleRoutes.js';
import driverRoutes from './routes/driverRoutes.js';
import quarryRoutes from './routes/quarryRoutes.js';
import materialRoutes from './routes/materialRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import rateRoutes from './routes/rateRoutes.js';
import workEntryRoutes from './routes/workEntryRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import AppError from './utility/AppError.js';
import ApiResponse from './utility/apiResponse.js';
import User from './models/User.js';
import Vehicle from './models/Vehicle.js';
import Driver from './models/Driver.js';
import Quarry from './models/Quarry.js';
import Material from './models/Material.js';
import RateCard from './models/RateCard.js';
import Customer from './models/Customer.js';
import WorkEntry from './models/WorkEntry.js';
import Payment from './models/Payment.js';
import Expense from './models/Expense.js';

// Register every Mongoose model eagerly so populate() references
// (which resolve by model name) work regardless of call order.
[
  User,
  Vehicle,
  Driver,
  Quarry,
  Material,
  RateCard,
  Customer,
  WorkEntry,
  Payment,
  Expense,
].forEach(Model => Model.getModel());

/**
 * App — Express application factory / composition root.
 *
 * OOP concepts:
 * - Composition: routes + middleware are assembled here.
 * - Centralized error handling via AppError + ApiResponse.
 */
const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Service is healthy', data: {} });
});

app.use('/api/auth', authRoutes);

// Module 2: fleet admin API (all routes admin-guarded inside each router).
app.use('/api/admin/dashboard', dashboardRoutes);
app.use('/api/admin/vehicles', vehicleRoutes);
app.use('/api/admin/drivers', driverRoutes);
app.use('/api/admin/quarries', quarryRoutes);
app.use('/api/admin/materials', materialRoutes);
app.use('/api/admin/customers', customerRoutes);
app.use('/api/admin/rates', rateRoutes);
app.use('/api/admin/work-entries', workEntryRoutes);
app.use('/api/admin/payments', paymentRoutes);
app.use('/api/admin/expenses', expenseRoutes);

app.use((_req, res) => {
  ApiResponse.failure(res, 'Route not found', 404);
});

// Centralized error handler — must keep 4-arg signature for Express.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err instanceof AppError) {
    return ApiResponse.failure(res, err.message, err.statusCode, err.errors);
  }

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return ApiResponse.failure(res, 'Validation failed', 400, messages);
  }

  if (err.code === 11000) {
    return ApiResponse.failure(res, 'Duplicate value for a unique field', 409);
  }

  if (err.name === 'CastError') {
    return ApiResponse.failure(res, 'Invalid identifier format', 400);
  }

  console.error('Unhandled error:', err);
  return ApiResponse.failure(res, 'Internal server error', 500);
});

export default app;
