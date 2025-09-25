import express from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/authController.js';
import { verifyRefreshToken } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';

const router = express.Router();

// Validation rules
const loginValidation = [
  body('username')
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters long'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

const registerValidation = [
  body('username')
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Must be a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  body('role')
    .optional()
    .isIn(['user', 'admin', 'moderator'])
    .withMessage('Role must be one of: user, admin, moderator')
];

const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
];

const decodeTokenValidation = [
  body('token')
    .notEmpty()
    .withMessage('Token is required')
];

const createEncryptedTokenValidation = [
  body('payload')
    .notEmpty()
    .withMessage('Payload is required')
    .isObject()
    .withMessage('Payload must be an object'),
  body('type')
    .optional()
    .isIn(['access', 'refresh'])
    .withMessage('Type must be either "access" or "refresh"')
];

const decryptTokenValidation = [
  body('encryptedToken')
    .notEmpty()
    .withMessage('Encrypted token is required'),
  body('type')
    .optional()
    .isIn(['access', 'refresh'])
    .withMessage('Type must be either "access" or "refresh"')
];

// Auth routes
router.post('/login', loginValidation, validate, authController.login);
router.post('/register', registerValidation, validate, authController.register);
router.post('/refresh', refreshTokenValidation, validate, verifyRefreshToken, authController.refreshToken);
router.post('/logout', authController.logout);
router.get('/verify', authController.verifyToken);

// Token utility routes
router.post('/decode', decodeTokenValidation, validate, authController.decodeToken);
router.post('/encrypt', createEncryptedTokenValidation, validate, authController.createEncryptedToken);
router.post('/decrypt', decryptTokenValidation, validate, authController.decryptToken);

export default router;