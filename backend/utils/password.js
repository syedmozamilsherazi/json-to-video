import bcrypt from 'bcryptjs';

class PasswordUtils {
  constructor() {
    this.saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
  }

  /**
   * Hash password using bcrypt
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  async hashPassword(password) {
    try {
      if (!password || password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }
      
      return await bcrypt.hash(password, this.saltRounds);
    } catch (error) {
      throw new Error(`Password hashing failed: ${error.message}`);
    }
  }

  /**
   * Compare password with hash
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} True if password matches hash
   */
  async comparePassword(password, hash) {
    try {
      if (!password || !hash) {
        return false;
      }
      
      return await bcrypt.compare(password, hash);
    } catch (error) {
      throw new Error(`Password comparison failed: ${error.message}`);
    }
  }

  /**
   * Generate random password
   * @param {number} length - Password length (default: 12)
   * @returns {string} Generated password
   */
  generateRandomPassword(length = 12) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return password;
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {Object} Validation result
   */
  validatePasswordStrength(password) {
    const result = {
      isValid: true,
      score: 0,
      requirements: {
        minLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumbers: /\d/.test(password),
        hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(password)
      },
      feedback: []
    };

    // Calculate score
    Object.values(result.requirements).forEach(req => {
      if (req) result.score++;
    });

    // Add feedback
    if (!result.requirements.minLength) {
      result.feedback.push('Password must be at least 8 characters long');
    }
    if (!result.requirements.hasUppercase) {
      result.feedback.push('Password must contain at least one uppercase letter');
    }
    if (!result.requirements.hasLowercase) {
      result.feedback.push('Password must contain at least one lowercase letter');
    }
    if (!result.requirements.hasNumbers) {
      result.feedback.push('Password must contain at least one number');
    }
    if (!result.requirements.hasSpecialChars) {
      result.feedback.push('Password must contain at least one special character');
    }

    // Determine if valid (require at least 4 out of 5 criteria)
    result.isValid = result.score >= 4;

    return result;
  }
}

export default new PasswordUtils();