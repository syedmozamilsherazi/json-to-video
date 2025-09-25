import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import routes
import authRoutes from '../routes/auth.js';
import protectedRoutes from '../routes/protected.js';

// Import middleware
import { errorHandler, notFoundHandler } from '../middleware/errorHandler.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Request logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Limit each IP
  message: {
    success: false,
    error: {
      type: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
      statusCode: 429
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth requests per windowMs
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: {
      type: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later.',
      statusCode: 429
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is healthy',
    data: {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

// API info endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'JWT Backend Server API',
    data: {
      version: '1.0.0',
      description: 'Backend server with JWT authentication and decryption capabilities',
      endpoints: {
        auth: '/api/auth',
        protected: '/api/protected',
        health: '/health'
      },
      features: [
        'JWT Token Generation',
        'JWT Token Verification',
        'Token Encryption/Decryption',
        'Role-based Access Control',
        'Password Hashing',
        'Request Rate Limiting',
        'Input Validation'
      ],
      documentation: 'See README.md for detailed API documentation'
    }
  });
});

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/protected', protectedRoutes);

// Handle undefined routes
app.use('*', notFoundHandler);

// Global error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log('🚀 JWT Backend Server Started');
  console.log('================================');
  console.log(`🌐 Server running on: http://localhost:${PORT}`);
  console.log(`🛡️  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📝 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
  console.log(`🔒 Protected endpoints: http://localhost:${PORT}/api/protected`);
  console.log('================================');
  
  // Log important configuration
  console.log('🔧 Configuration:');
  console.log(`   JWT Access Token Expiry: ${process.env.JWT_ACCESS_EXPIRY || '15m'}`);
  console.log(`   JWT Refresh Token Expiry: ${process.env.JWT_REFRESH_EXPIRY || '7d'}`);
  console.log(`   Rate Limiting: ${process.env.NODE_ENV === 'production' ? '100' : '1000'} requests/15min`);
  console.log(`   Auth Rate Limiting: 5 requests/15min`);
  console.log('================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

export default app;