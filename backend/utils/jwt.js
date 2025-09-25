import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

class JWTUtils {
  constructor() {
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET || 'default-access-secret-key-change-in-production';
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-key-change-in-production';
    this.encryptionKey = process.env.JWT_ENCRYPTION_KEY || 'default-encryption-key-32-chars!!';
    this.algorithm = 'aes-256-gcm';
    this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';
  }

  /**
   * Generate access token
   * @param {Object} payload - Token payload
   * @returns {string} JWT access token
   */
  generateAccessToken(payload) {
    try {
      return jwt.sign(payload, this.accessTokenSecret, {
        expiresIn: this.accessTokenExpiry,
        issuer: 'jwt-backend-server',
        audience: 'api-client'
      });
    } catch (error) {
      throw new Error(`Failed to generate access token: ${error.message}`);
    }
  }

  /**
   * Generate refresh token
   * @param {Object} payload - Token payload
   * @returns {string} JWT refresh token
   */
  generateRefreshToken(payload) {
    try {
      return jwt.sign(payload, this.refreshTokenSecret, {
        expiresIn: this.refreshTokenExpiry,
        issuer: 'jwt-backend-server',
        audience: 'api-client'
      });
    } catch (error) {
      throw new Error(`Failed to generate refresh token: ${error.message}`);
    }
  }

  /**
   * Generate both access and refresh tokens
   * @param {Object} payload - Token payload
   * @returns {Object} Object containing both tokens
   */
  generateTokens(payload) {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload)
    };
  }

  /**
   * Verify access token
   * @param {string} token - JWT token to verify
   * @returns {Object} Decoded token payload
   */
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, this.accessTokenSecret, {
        issuer: 'jwt-backend-server',
        audience: 'api-client'
      });
    } catch (error) {
      throw new Error(`Invalid access token: ${error.message}`);
    }
  }

  /**
   * Verify refresh token
   * @param {string} token - JWT token to verify
   * @returns {Object} Decoded token payload
   */
  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, this.refreshTokenSecret, {
        issuer: 'jwt-backend-server',
        audience: 'api-client'
      });
    } catch (error) {
      throw new Error(`Invalid refresh token: ${error.message}`);
    }
  }

  /**
   * Decode token without verification (for debugging/inspection)
   * @param {string} token - JWT token to decode
   * @returns {Object} Decoded token (header, payload, signature)
   */
  decodeToken(token) {
    try {
      return {
        header: jwt.decode(token, { complete: true })?.header,
        payload: jwt.decode(token, { complete: true })?.payload,
        signature: jwt.decode(token, { complete: true })?.signature
      };
    } catch (error) {
      throw new Error(`Failed to decode token: ${error.message}`);
    }
  }

  /**
   * Extract token from Authorization header
   * @param {string} authHeader - Authorization header value
   * @returns {string} Extracted token
   */
  extractTokenFromHeader(authHeader) {
    if (!authHeader) {
      throw new Error('Authorization header is missing');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new Error('Invalid authorization header format. Expected: Bearer <token>');
    }

    return parts[1];
  }

  /**
   * Encrypt data using AES-256-GCM
   * @param {string} text - Text to encrypt
   * @returns {Object} Encrypted data with IV and auth tag
   */
  encrypt(text) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(this.algorithm, this.encryptionKey);
      cipher.setAAD(Buffer.from('jwt-backend-server', 'utf8'));
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();

      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   * @param {Object} encryptedData - Object containing encrypted data, IV, and auth tag
   * @returns {string} Decrypted text
   */
  decrypt(encryptedData) {
    try {
      const { encrypted, iv, authTag } = encryptedData;
      
      const decipher = crypto.createDecipher(this.algorithm, this.encryptionKey);
      decipher.setAAD(Buffer.from('jwt-backend-server', 'utf8'));
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Encrypt and create JWT token
   * @param {Object} payload - Token payload
   * @param {string} type - Token type ('access' or 'refresh')
   * @returns {string} Encrypted JWT token
   */
  createEncryptedToken(payload, type = 'access') {
    try {
      const token = type === 'refresh' 
        ? this.generateRefreshToken(payload)
        : this.generateAccessToken(payload);
      
      const encrypted = this.encrypt(token);
      
      // Combine encrypted data into a single string
      return `${encrypted.encrypted}.${encrypted.iv}.${encrypted.authTag}`;
    } catch (error) {
      throw new Error(`Failed to create encrypted token: ${error.message}`);
    }
  }

  /**
   * Decrypt and verify JWT token
   * @param {string} encryptedToken - Encrypted JWT token
   * @param {string} type - Token type ('access' or 'refresh')
   * @returns {Object} Verified token payload
   */
  verifyEncryptedToken(encryptedToken, type = 'access') {
    try {
      const parts = encryptedToken.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted token format');
      }

      const encryptedData = {
        encrypted: parts[0],
        iv: parts[1],
        authTag: parts[2]
      };

      const decryptedToken = this.decrypt(encryptedData);
      
      return type === 'refresh'
        ? this.verifyRefreshToken(decryptedToken)
        : this.verifyAccessToken(decryptedToken);
    } catch (error) {
      throw new Error(`Failed to verify encrypted token: ${error.message}`);
    }
  }

  /**
   * Check if token is expired
   * @param {string} token - JWT token
   * @returns {boolean} True if token is expired
   */
  isTokenExpired(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) {
        return true;
      }
      
      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch (error) {
      return true;
    }
  }

  /**
   * Get token expiration time
   * @param {string} token - JWT token
   * @returns {Date} Token expiration date
   */
  getTokenExpiration(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) {
        throw new Error('Token does not contain expiration information');
      }
      
      return new Date(decoded.exp * 1000);
    } catch (error) {
      throw new Error(`Failed to get token expiration: ${error.message}`);
    }
  }

  /**
   * Get token claims/payload
   * @param {string} token - JWT token
   * @returns {Object} Token payload
   */
  getTokenClaims(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      throw new Error(`Failed to get token claims: ${error.message}`);
    }
  }
}

export default new JWTUtils();