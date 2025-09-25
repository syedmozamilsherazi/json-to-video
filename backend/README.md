# JWT Backend Server

A comprehensive Node.js/Express backend server with JWT authentication, token encryption/decryption, and role-based access control.

## Features

- 🔐 **JWT Authentication** - Access and refresh tokens
- 🔒 **Token Encryption/Decryption** - AES-256-GCM encryption for sensitive tokens
- 👥 **Role-based Access Control** - Admin, user, and moderator roles
- 🔑 **Password Hashing** - BCrypt with configurable salt rounds
- 🛡️ **Security Middleware** - Helmet, CORS, rate limiting
- ✅ **Input Validation** - Express-validator for request validation
- 🚫 **Error Handling** - Comprehensive error handling and logging
- 📊 **Request Logging** - Morgan HTTP request logger

## Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn package manager

## Installation

1. **Clone the repository** (if needed):
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment setup**:
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file with your configuration (see Environment Variables section).

4. **Start the server**:
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

The server will start on `http://localhost:3001` by default.

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | No |
| `PORT` | Server port | `3001` | No |
| `FRONTEND_URL` | Allowed CORS origins | `http://localhost:3000,http://localhost:5173` | No |
| `JWT_ACCESS_SECRET` | JWT access token secret | - | **Yes** |
| `JWT_REFRESH_SECRET` | JWT refresh token secret | - | **Yes** |
| `JWT_ENCRYPTION_KEY` | Token encryption key (32 chars) | - | **Yes** |
| `JWT_ACCESS_EXPIRY` | Access token expiry | `15m` | No |
| `JWT_REFRESH_EXPIRY` | Refresh token expiry | `7d` | No |
| `BCRYPT_SALT_ROUNDS` | BCrypt salt rounds | `12` | No |

**⚠️ IMPORTANT**: Generate strong, unique secrets for production environments!

## API Endpoints

### Authentication Routes (`/api/auth`)

#### POST `/api/auth/login`
Login with username/email and password.

**Request Body:**
```json
{
  "username": "admin", // or email
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "role": "admin"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "tokenType": "Bearer",
      "expiresIn": "15m"
    }
  }
}
```

#### POST `/api/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "username": "newuser",
  "email": "user@example.com",
  "password": "SecurePass123!",
  "role": "user" // optional, defaults to "user"
}
```

#### POST `/api/auth/refresh`
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### POST `/api/auth/logout`
Logout user and invalidate refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### GET `/api/auth/verify`
Verify access token validity.

**Headers:**
```
Authorization: Bearer <access_token>
```

### Token Utility Routes (`/api/auth`)

#### POST `/api/auth/decode`
Decode JWT token without verification (for debugging).

**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### POST `/api/auth/encrypt`
Create encrypted JWT token.

**Request Body:**
```json
{
  "payload": {
    "userId": 1,
    "username": "admin",
    "role": "admin"
  },
  "type": "access" // or "refresh"
}
```

#### POST `/api/auth/decrypt`
Decrypt and verify encrypted JWT token.

**Request Body:**
```json
{
  "encryptedToken": "encrypted_token_string.iv.authTag",
  "type": "access" // or "refresh"
}
```

### Protected Routes (`/api/protected`)

All protected routes require the `Authorization: Bearer <token>` header.

#### GET `/api/protected/profile`
Get user profile information.

#### GET `/api/protected/dashboard`
Get user dashboard data.

#### GET `/api/protected/admin`
Admin-only route (requires admin role).

#### GET `/api/protected/moderation`
Admin and moderator route (requires admin or moderator role).

#### GET `/api/protected/secure`
Route that requires encrypted token verification.

**Headers:**
```
Authorization: Bearer <encrypted_token>
```

#### GET `/api/protected/public`
Public route with optional authentication.

#### GET `/api/protected/token-info`
Get detailed token information.

#### POST `/api/protected/test`
Test endpoint for development.

### System Routes

#### GET `/health`
Health check endpoint.

#### GET `/`
API information and documentation.

## Default Users

The server comes with two default users for testing:

| Username | Email | Password | Role |
|----------|-------|----------|------|
| `admin` | `admin@example.com` | `admin123` | `admin` |
| `user` | `user@example.com` | `user123` | `user` |

## JWT Token Structure

### Access Token Payload
```json
{
  "userId": 1,
  "username": "admin",
  "email": "admin@example.com",
  "role": "admin",
  "iat": 1640995200,
  "exp": 1640996100,
  "iss": "jwt-backend-server",
  "aud": "api-client"
}
```

### Refresh Token Payload
```json
{
  "userId": 1,
  "username": "admin",
  "email": "admin@example.com",
  "role": "admin",
  "iat": 1640995200,
  "exp": 1641600000,
  "iss": "jwt-backend-server",
  "aud": "api-client"
}
```

## Token Encryption

The server supports AES-256-GCM encryption for JWT tokens. Encrypted tokens are returned in the format:
```
encrypted_data.iv.auth_tag
```

Use the `/api/auth/encrypt` and `/api/auth/decrypt` endpoints to work with encrypted tokens.

## Rate Limiting

- **General API**: 1000 requests per 15 minutes (development), 100 requests per 15 minutes (production)
- **Auth endpoints**: 5 requests per 15 minutes
- Rate limits are applied per IP address

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "type": "ERROR_TYPE",
    "message": "Human readable error message",
    "statusCode": 400
  }
}
```

### Common Error Types

- `MISSING_TOKEN` - No authorization token provided
- `INVALID_TOKEN` - Token is invalid or malformed
- `TOKEN_EXPIRED` - Token has expired
- `MISSING_CREDENTIALS` - Login credentials not provided
- `INVALID_CREDENTIALS` - Invalid username/password
- `USER_EXISTS` - User already exists during registration
- `INSUFFICIENT_PERMISSIONS` - User lacks required role
- `VALIDATION_ERROR` - Request validation failed
- `RATE_LIMIT_EXCEEDED` - Too many requests

## Security Features

1. **Helmet.js** - Sets security-related HTTP headers
2. **CORS** - Configurable cross-origin resource sharing
3. **Rate Limiting** - Prevents brute force attacks
4. **Password Hashing** - BCrypt with salt rounds
5. **JWT Signing** - HMAC SHA-256 signatures
6. **Token Encryption** - AES-256-GCM for sensitive data
7. **Input Validation** - Express-validator middleware
8. **Error Handling** - No sensitive data exposure

## Development

### Project Structure

```
backend/
├── src/
│   └── app.js              # Main server file
├── controllers/
│   └── authController.js   # Authentication logic
├── middleware/
│   ├── auth.js            # JWT authentication middleware
│   ├── errorHandler.js    # Error handling middleware
│   └── validation.js      # Input validation middleware
├── routes/
│   ├── auth.js           # Authentication routes
│   └── protected.js      # Protected routes
├── utils/
│   ├── jwt.js           # JWT utilities
│   └── password.js      # Password utilities
├── models/              # Database models (future use)
├── .env                # Environment variables
├── .env.example        # Environment template
├── package.json        # Dependencies and scripts
└── README.md          # This file
```

### Scripts

```bash
# Start development server with auto-restart
npm run dev

# Start production server
npm start

# Run tests (if implemented)
npm test

# Lint code
npm run lint

# Format code
npm run format
```

### Testing with cURL

**Login:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

**Access protected route:**
```bash
curl -X GET http://localhost:3001/api/protected/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Decode token:**
```bash
curl -X POST http://localhost:3001/api/auth/decode \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_JWT_TOKEN"}'
```

## Production Deployment

1. **Set environment variables** properly
2. **Generate strong secrets** for JWT keys
3. **Use HTTPS** in production
4. **Set up reverse proxy** (nginx, Apache)
5. **Configure logging** and monitoring
6. **Use a database** instead of in-memory storage
7. **Set up Redis** for refresh token storage

## Database Integration

The server is designed to work with databases. Replace the mock user data in `controllers/authController.js` with your database models.

Example integration points:
- User authentication and storage
- Refresh token storage (Redis recommended)
- User session management
- Audit logging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the API documentation
3. Check server logs for errors
4. Create an issue with detailed information

---

**⚠️ Security Notice**: This server includes default users and secrets for development purposes. **Always change default credentials and generate strong secrets for production use!**