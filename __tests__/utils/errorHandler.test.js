// __tests__/utils/errorHandler.test.js
const {
  asyncHandler,
  createErrorResponse,
  handleValidationErrors,
  handleDatabaseError
} = require('../../utils/errorHandler');

describe('Error Handler Utilities', () => {
  describe('asyncHandler', () => {
    it('should call async function and pass result to next middleware', async () => {
      const mockReq = {};
      const mockRes = { json: jest.fn() };
      const mockNext = jest.fn();

      const asyncFn = async (req, res) => {
        res.json({ success: true });
      };

      const wrapped = asyncHandler(asyncFn);
      await wrapped(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({ success: true });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should catch errors and pass to next', async () => {
      const mockReq = {};
      const mockRes = {};
      const mockNext = jest.fn();
      const testError = new Error('Test error');

      const asyncFn = async () => {
        throw testError;
      };

      const wrapped = asyncHandler(asyncFn);
      await wrapped(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(testError);
    });

    it('should handle promise rejections', async () => {
      const mockReq = {};
      const mockRes = {};
      const mockNext = jest.fn();
      const testError = new Error('Promise rejection');

      const asyncFn = async () => {
        throw testError;
      };

      const wrapped = asyncHandler(asyncFn);
      await wrapped(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(testError);
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response with message and status', () => {
      const error = createErrorResponse('Test error', 404);

      expect(error.error).toBe(true);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(404);
      expect(error.timestamp).toBeDefined();
    });

    it('should default to status 500', () => {
      const error = createErrorResponse('Server error');

      expect(error.statusCode).toBe(500);
    });

    it('should include additional details', () => {
      const error = createErrorResponse('Not found', 404, {
        resourceId: '123',
        resourceType: 'member'
      });

      expect(error.resourceId).toBe('123');
      expect(error.resourceType).toBe('member');
    });

    it('should include valid timestamp', () => {
      const before = new Date().toISOString();
      const error = createErrorResponse('Test');
      const after = new Date().toISOString();

      expect(error.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(error.timestamp >= before).toBe(true);
      expect(error.timestamp <= after).toBe(true);
    });
  });

  describe('handleValidationErrors', () => {
    it('should format validation errors correctly', () => {
      const errors = [
        { param: 'email', msg: 'Email is required', value: '' },
        { param: 'password', msg: 'Password too short', value: '123' }
      ];

      const response = handleValidationErrors(errors);

      expect(response.error).toBe(true);
      expect(response.message).toBe('Validation failed');
      expect(response.statusCode).toBe(400);
      expect(response.validationErrors).toHaveLength(2);
      expect(response.validationErrors[0]).toEqual({
        field: 'email',
        message: 'Email is required',
        value: ''
      });
    });

    it('should handle errors with path instead of param', () => {
      const errors = [
        { path: 'firstName', msg: 'Required', value: null }
      ];

      const response = handleValidationErrors(errors);

      expect(response.validationErrors[0].field).toBe('firstName');
    });

    it('should handle empty error array', () => {
      const response = handleValidationErrors([]);

      expect(response.validationErrors).toHaveLength(0);
    });
  });

  describe('handleDatabaseError', () => {
    it('should handle duplicate key error', () => {
      const error = {
        code: 11000,
        keyPattern: { email: 1 }
      };

      const response = handleDatabaseError(error);

      expect(response.message).toContain('email');
      expect(response.message).toContain('already exists');
      expect(response.statusCode).toBe(409);
      expect(response.field).toBe('email');
      expect(response.type).toBe('duplicate');
    });

    it('should handle validation error', () => {
      const error = {
        name: 'ValidationError',
        errors: {
          firstName: { message: 'First name is required' },
          email: { message: 'Invalid email format' }
        }
      };

      const response = handleDatabaseError(error);

      expect(response.message).toBe('Validation failed');
      expect(response.statusCode).toBe(400);
      expect(response.validationErrors).toHaveLength(2);
    });

    it('should handle cast error', () => {
      const error = {
        name: 'CastError',
        path: 'memberId',
        value: 'invalid-id'
      };

      const response = handleDatabaseError(error);

      expect(response.message).toContain('Invalid memberId');
      expect(response.statusCode).toBe(400);
      expect(response.field).toBe('memberId');
      expect(response.type).toBe('cast');
    });

    it('should handle generic database error', () => {
      const error = new Error('Unknown database error');

      const response = handleDatabaseError(error);

      expect(response.message).toBe('Database operation failed');
      expect(response.statusCode).toBe(500);
    });
  });
});
