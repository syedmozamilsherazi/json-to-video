import jwtUtils from '../utils/jwt.js';
import passwordUtils from '../utils/password.js';
import { CustomError, asyncHandler } from '../middleware/errorHandler.js';

// Mock user database (replace with actual database implementation)
const users = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@example.com',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeM7dQwF4CG7VY2dO', // password: admin123
    role: 'admin',
    createdAt: new Date(),
    isActive: true
  },
  {
    id: 2,
    username: 'user',
    email: 'user@example.com',
    password: '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: user123
    role: 'user',
    createdAt: new Date(),
    isActive: true
  }
];

// Mock refresh token storage (replace with Redis or database)
const refreshTokens = new Set();

/**
 * User login
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  // Validation
  if (!username || !password) {
    throw new CustomError('Username and password are required', 400, 'MISSING_CREDENTIALS');
  }

  // Find user
  const user = users.find(u => 
    u.username === username || u.email === username
  );

  if (!user) {
    throw new CustomError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  if (!user.isActive) {
    throw new CustomError('Account is deactivated', 401, 'ACCOUNT_DEACTIVATED');
  }

  // Check password
  const isPasswordValid = await passwordUtils.comparePassword(password, user.password);
  
  if (!isPasswordValid) {
    throw new CustomError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  // Generate tokens
  const payload = {
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role
  };

  const tokens = jwtUtils.generateTokens(payload);
  
  // Store refresh token
  refreshTokens.add(tokens.refreshToken);

  // Update last login (in real app, update database)
  user.lastLogin = new Date();

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenType: 'Bearer',
        expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m'
      }
    }
  });
});

/**
 * User registration
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const register = asyncHandler(async (req, res) => {
  const { username, email, password, role = 'user' } = req.body;

  // Validation
  if (!username || !email || !password) {
    throw new CustomError('Username, email, and password are required', 400, 'MISSING_FIELDS');
  }

  // Check if user already exists
  const existingUser = users.find(u => 
    u.username === username || u.email === email
  );

  if (existingUser) {
    throw new CustomError('User with this username or email already exists', 400, 'USER_EXISTS');
  }

  // Validate password strength
  const passwordValidation = passwordUtils.validatePasswordStrength(password);
  
  if (!passwordValidation.isValid) {
    throw new CustomError(
      `Password does not meet requirements: ${passwordValidation.feedback.join(', ')}`,
      400,
      'WEAK_PASSWORD'
    );
  }

  // Hash password
  const hashedPassword = await passwordUtils.hashPassword(password);

  // Create new user
  const newUser = {
    id: users.length + 1,
    username,
    email,
    password: hashedPassword,
    role,
    createdAt: new Date(),
    isActive: true
  };

  users.push(newUser);

  // Generate tokens for automatic login
  const payload = {
    userId: newUser.id,
    username: newUser.username,
    email: newUser.email,
    role: newUser.role
  };

  const tokens = jwtUtils.generateTokens(payload);
  
  // Store refresh token
  refreshTokens.add(tokens.refreshToken);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenType: 'Bearer',
        expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m'
      }
    }
  });
});

/**
 * Refresh access token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new CustomError('Refresh token is required', 400, 'MISSING_REFRESH_TOKEN');
  }

  // Check if refresh token exists in storage
  if (!refreshTokens.has(refreshToken)) {
    throw new CustomError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }

  try {
    // Verify refresh token
    const decoded = jwtUtils.verifyRefreshToken(refreshToken);

    // Find user
    const user = users.find(u => u.id === decoded.userId);
    
    if (!user || !user.isActive) {
      throw new CustomError('User not found or inactive', 401, 'USER_NOT_FOUND');
    }

    // Generate new access token
    const payload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    const newAccessToken = jwtUtils.generateAccessToken(payload);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken,
        tokenType: 'Bearer',
        expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m'
      }
    });
  } catch (error) {
    // Remove invalid refresh token
    refreshTokens.delete(refreshToken);
    throw new CustomError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
  }
});

/**
 * Logout user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    refreshTokens.delete(refreshToken);
  }

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * Verify token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const verifyToken = asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    throw new CustomError('Authorization header is required', 400, 'MISSING_AUTH_HEADER');
  }

  const token = jwtUtils.extractTokenFromHeader(authHeader);
  const decoded = jwtUtils.verifyAccessToken(token);

  // Find user
  const user = users.find(u => u.id === decoded.userId);
  
  if (!user || !user.isActive) {
    throw new CustomError('User not found or inactive', 401, 'USER_NOT_FOUND');
  }

  res.json({
    success: true,
    message: 'Token is valid',
    data: {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      token: {
        isValid: true,
        expiresAt: jwtUtils.getTokenExpiration(token),
        isExpired: jwtUtils.isTokenExpired(token)
      }
    }
  });
});

/**
 * Decode token (for debugging/inspection)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const decodeToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    throw new CustomError('Token is required', 400, 'MISSING_TOKEN');
  }

  const decoded = jwtUtils.decodeToken(token);
  const claims = jwtUtils.getTokenClaims(token);
  
  res.json({
    success: true,
    message: 'Token decoded successfully',
    data: {
      header: decoded.header,
      payload: decoded.payload,
      signature: decoded.signature,
      claims: claims,
      isExpired: jwtUtils.isTokenExpired(token),
      expiresAt: claims?.exp ? new Date(claims.exp * 1000) : null
    }
  });
});

/**
 * Create encrypted token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createEncryptedToken = asyncHandler(async (req, res) => {
  const { payload, type = 'access' } = req.body;
  
  if (!payload) {
    throw new CustomError('Payload is required', 400, 'MISSING_PAYLOAD');
  }

  const encryptedToken = jwtUtils.createEncryptedToken(payload, type);
  
  res.json({
    success: true,
    message: 'Encrypted token created successfully',
    data: {
      encryptedToken,
      type,
      payload
    }
  });
});

/**
 * Decrypt and verify encrypted token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const decryptToken = asyncHandler(async (req, res) => {
  const { encryptedToken, type = 'access' } = req.body;
  
  if (!encryptedToken) {
    throw new CustomError('Encrypted token is required', 400, 'MISSING_ENCRYPTED_TOKEN');
  }

  const decoded = jwtUtils.verifyEncryptedToken(encryptedToken, type);
  
  res.json({
    success: true,
    message: 'Encrypted token decrypted and verified successfully',
    data: {
      decoded,
      type,
      isValid: true
    }
  });
});