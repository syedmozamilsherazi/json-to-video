import jwtUtils from '../utils/jwt.js';

/**
 * Middleware to verify JWT access token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
        error: 'MISSING_TOKEN'
      });
    }

    const token = jwtUtils.extractTokenFromHeader(authHeader);
    const decoded = jwtUtils.verifyAccessToken(token);
    
    // Add user info to request object
    req.user = decoded;
    req.token = token;
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token.',
      error: error.message
    });
  }
};

/**
 * Middleware to verify encrypted JWT token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const verifyEncryptedToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
        error: 'MISSING_TOKEN'
      });
    }

    const encryptedToken = jwtUtils.extractTokenFromHeader(authHeader);
    const decoded = jwtUtils.verifyEncryptedToken(encryptedToken, 'access');
    
    // Add user info to request object
    req.user = decoded;
    req.token = encryptedToken;
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid encrypted token.',
      error: error.message
    });
  }
};

/**
 * Middleware to verify refresh token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const verifyRefreshToken = (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No refresh token provided.',
        error: 'MISSING_REFRESH_TOKEN'
      });
    }

    const decoded = jwtUtils.verifyRefreshToken(refreshToken);
    
    // Add user info to request object
    req.user = decoded;
    req.refreshToken = refreshToken;
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid refresh token.',
      error: error.message
    });
  }
};

/**
 * Middleware to check if user has specific role
 * @param {string|Array} roles - Required role(s)
 * @returns {Function} Express middleware function
 */
export const requireRole = (roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Access denied. User not authenticated.',
          error: 'USER_NOT_AUTHENTICATED'
        });
      }

      const userRole = req.user.role;
      const requiredRoles = Array.isArray(roles) ? roles : [roles];
      
      if (!requiredRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required role(s): ${requiredRoles.join(', ')}`,
          error: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error checking user permissions.',
        error: error.message
      });
    }
  };
};

/**
 * Optional authentication middleware
 * Sets req.user if token is valid, but doesn't reject if token is missing/invalid
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return next();
    }

    const token = jwtUtils.extractTokenFromHeader(authHeader);
    const decoded = jwtUtils.verifyAccessToken(token);
    
    // Add user info to request object
    req.user = decoded;
    req.token = token;
    
    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};