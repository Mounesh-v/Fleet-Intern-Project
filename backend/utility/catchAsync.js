/**
 * catchAsync — higher-order function that forwards async errors
 * to Express's centralized error handler.
 *
 * OOP / functional note:
 * - Decorator pattern: wraps a controller method without changing its contract.
 */
function catchAsync(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export default catchAsync;
