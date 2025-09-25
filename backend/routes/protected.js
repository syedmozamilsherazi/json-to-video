import express from 'express';
import { verifyToken, verifyEncryptedToken, requireRole, optionalAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

/**
 * Get user profile (requires authentication)
 */
router.get('/profile', verifyToken, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Profile retrieved successfully',
    data: {
      user: {
        id: req.user.userId,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
        tokenIssuedAt: new Date(req.user.iat * 1000),
        tokenExpiresAt: new Date(req.user.exp * 1000)
      }
    }
  });
}));

/**
 * Get user dashboard (requires authentication)
 */
router.get('/dashboard', verifyToken, asyncHandler(async (req, res) => {
  const dashboardData = {
    user: {
      id: req.user.userId,
      username: req.user.username,
      role: req.user.role
    },
    stats: {
      loginCount: Math.floor(Math.random() * 100) + 1,
      lastLogin: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      accountCreated: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
    },
    recentActivity: [
      { action: 'Login', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) },
      { action: 'Profile Update', timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      { action: 'Password Change', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }
    ]
  };

  res.json({
    success: true,
    message: 'Dashboard data retrieved successfully',
    data: dashboardData
  });
}));

/**
 * Admin only route
 */
router.get('/admin', verifyToken, requireRole('admin'), asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Admin data retrieved successfully',
    data: {
      adminInfo: {
        userId: req.user.userId,
        username: req.user.username,
        role: req.user.role,
        permissions: ['read', 'write', 'delete', 'manage_users']
      },
      systemStats: {
        totalUsers: 150,
        activeUsers: 45,
        systemUptime: '15 days, 4 hours',
        serverLoad: '65%'
      }
    }
  });
}));

/**
 * Admin and moderator route
 */
router.get('/moderation', verifyToken, requireRole(['admin', 'moderator']), asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Moderation panel data retrieved successfully',
    data: {
      user: {
        id: req.user.userId,
        username: req.user.username,
        role: req.user.role
      },
      pendingReports: 5,
      flaggedContent: 12,
      recentActions: [
        { action: 'User banned', target: 'user123', timestamp: new Date() },
        { action: 'Content removed', target: 'post456', timestamp: new Date() }
      ]
    }
  });
}));

/**
 * Route with encrypted token verification
 */
router.get('/secure', verifyEncryptedToken, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Secure data retrieved successfully (encrypted token)',
    data: {
      user: {
        id: req.user.userId,
        username: req.user.username,
        role: req.user.role
      },
      secureData: {
        apiKey: 'sk-' + Math.random().toString(36).substring(2, 15),
        encryptionKey: Buffer.from(Math.random().toString(36)).toString('base64'),
        lastAccess: new Date()
      }
    }
  });
}));

/**
 * Public route with optional authentication
 */
router.get('/public', optionalAuth, asyncHandler(async (req, res) => {
  const responseData = {
    success: true,
    message: 'Public data retrieved successfully',
    data: {
      publicInfo: {
        serverTime: new Date(),
        version: '1.0.0',
        status: 'operational'
      }
    }
  };

  // Add user info if authenticated
  if (req.user) {
    responseData.data.authenticatedUser = {
      username: req.user.username,
      role: req.user.role
    };
    responseData.message += ' (authenticated)';
  } else {
    responseData.message += ' (anonymous)';
  }

  res.json(responseData);
}));

/**
 * Token info endpoint
 */
router.get('/token-info', verifyToken, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Token information retrieved successfully',
    data: {
      token: {
        userId: req.user.userId,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
        issuer: req.user.iss,
        audience: req.user.aud,
        issuedAt: new Date(req.user.iat * 1000),
        expiresAt: new Date(req.user.exp * 1000),
        remainingTime: Math.max(0, req.user.exp - Math.floor(Date.now() / 1000)) + ' seconds'
      }
    }
  });
}));

/**
 * Test protected endpoint for development
 */
router.post('/test', verifyToken, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: 'Test endpoint accessed successfully',
    data: {
      receivedData: req.body,
      user: {
        id: req.user.userId,
        username: req.user.username,
        role: req.user.role
      },
      headers: req.headers,
      timestamp: new Date()
    }
  });
}));

export default router;