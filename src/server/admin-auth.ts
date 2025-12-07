/**
 * Admin Authentication Module
 * 
 * Provides JWT-based authentication for admin-only operations.
 * Uses environment variable ADMIN_PASSWORD and APP_JWT_SECRET for security.
 * 
 * DO NOT expose this to client-side code.
 */

import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '101010';
const APP_JWT_SECRET = process.env.APP_JWT_SECRET || 'replace_this_with_a_strong_random_secret_key';
const TOKEN_EXPIRY = '1h'; // Short-lived tokens

// Validate environment variables - fail in production if not set properly
if (!process.env.APP_JWT_SECRET || APP_JWT_SECRET === 'replace_this_with_a_strong_random_secret_key') {
    console.error('❌ ERROR: APP_JWT_SECRET not set or using default value!');
    console.error('   Set APP_JWT_SECRET environment variable to a strong random secret (32+ characters)');
    if (process.env.NODE_ENV === 'production') {
        throw new Error('APP_JWT_SECRET must be set in production');
    }
    console.warn('⚠️  WARNING: Using default APP_JWT_SECRET in development only!');
}

if (!process.env.ADMIN_PASSWORD || ADMIN_PASSWORD === '101010') {
    console.error('❌ ERROR: ADMIN_PASSWORD not set or using default value (101010)!');
    console.error('   Set ADMIN_PASSWORD environment variable to a strong password');
    if (process.env.NODE_ENV === 'production') {
        throw new Error('ADMIN_PASSWORD must be set in production');
    }
    console.warn('⚠️  WARNING: Using default ADMIN_PASSWORD in development only!');
}

/**
 * Admin JWT payload structure
 */
interface AdminTokenPayload {
    role: 'admin';
    username: string;
    iat?: number;
    exp?: number;
}

/**
 * Login response structure
 */
interface LoginResponse {
    success: boolean;
    token?: string;
    expiresIn?: string;
    error?: string;
}

/**
 * Verify admin password and issue JWT token
 * 
 * @param password - Password to verify
 * @returns Login response with JWT token or error
 */
export async function adminLogin(password: string): Promise<LoginResponse> {
    try {
        // Simple password comparison (can be enhanced with bcrypt if storing hashed passwords)
        if (password !== ADMIN_PASSWORD) {
            return {
                success: false,
                error: 'Invalid password'
            };
        }
        
        // Generate JWT token
        const payload: AdminTokenPayload = {
            role: 'admin',
            username: 'GustheTrader'
        };
        
        const token = jwt.sign(payload, APP_JWT_SECRET, {
            expiresIn: TOKEN_EXPIRY
        });
        
        return {
            success: true,
            token,
            expiresIn: TOKEN_EXPIRY
        };
    } catch (error: any) {
        console.error('Login error:', error);
        return {
            success: false,
            error: 'Internal server error during login'
        };
    }
}

/**
 * Verify JWT token and extract payload
 * 
 * @param token - JWT token to verify
 * @returns Token payload if valid, or null if invalid
 */
export function verifyAdminToken(token: string): AdminTokenPayload | null {
    try {
        // Remove 'Bearer ' prefix if present
        const cleanToken = token.replace(/^Bearer\s+/i, '');
        
        const decoded = jwt.verify(cleanToken, APP_JWT_SECRET) as AdminTokenPayload;
        
        // Verify the role is admin
        if (decoded.role !== 'admin') {
            return null;
        }
        
        return decoded;
    } catch (error: any) {
        console.error('Token verification error:', error.message);
        return null;
    }
}

/**
 * Middleware function to protect routes with admin authentication
 * Use this in your API handlers to ensure only authenticated admins can access
 * 
 * @param authHeader - Authorization header from request
 * @returns Object with isAuthorized flag and optional error message
 */
export function requireAdminAuth(authHeader: string | null | undefined): {
    isAuthorized: boolean;
    payload?: AdminTokenPayload;
    error?: string;
} {
    if (!authHeader) {
        return {
            isAuthorized: false,
            error: 'Missing Authorization header'
        };
    }
    
    const payload = verifyAdminToken(authHeader);
    
    if (!payload) {
        return {
            isAuthorized: false,
            error: 'Invalid or expired token'
        };
    }
    
    return {
        isAuthorized: true,
        payload
    };
}

/**
 * Hash a password using bcrypt (for DB-backed admin users)
 * 
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
}

/**
 * Verify a password against a hash (for DB-backed admin users)
 * 
 * @param password - Plain text password to verify
 * @param hash - Hashed password from database
 * @returns True if password matches
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

/**
 * Example Express/HTTP handler for admin login endpoint
 * 
 * POST /api/admin/login
 * Body: { password: string }
 * Response: { success: boolean, token?: string, error?: string }
 */
export async function handleAdminLoginRequest(requestBody: { password?: string }): Promise<LoginResponse> {
    const { password } = requestBody;
    
    if (!password) {
        return {
            success: false,
            error: 'Password is required'
        };
    }
    
    return adminLogin(password);
}

/**
 * Example usage for protecting an API endpoint
 * 
 * @example
 * const authResult = requireAdminAuth(req.headers.authorization);
 * if (!authResult.isAuthorized) {
 *     return res.status(401).json({ error: authResult.error });
 * }
 * // Proceed with admin-only operation
 */
 * Handles JWT-based authentication for admin users.
 * Only users with the correct ADMIN_PASSWORD can obtain a JWT token.
 */

import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import * as dotenv from 'dotenv';

dotenv.config();

// Security-critical environment variables
// WARNING: These should ALWAYS be set in production. Defaults are for development only.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const APP_JWT_SECRET = process.env.APP_JWT_SECRET;
const APP_JWT_EXPIRY = process.env.APP_JWT_EXPIRY || '1h';

// Validate critical environment variables on module load
if (!ADMIN_PASSWORD) {
  console.error('FATAL: ADMIN_PASSWORD is not set. This is required for admin authentication.');
  process.exit(1);
}

if (!APP_JWT_SECRET) {
  console.error('FATAL: APP_JWT_SECRET is not set. This is required for JWT signing.');
  process.exit(1);
}

if (ADMIN_PASSWORD === '101010') {
  console.warn('WARNING: Using default ADMIN_PASSWORD (101010). This is insecure! Change it in production.');
}

if (APP_JWT_SECRET === 'change-this-secret-in-production') {
  console.warn('WARNING: Using default APP_JWT_SECRET. This is insecure! Change it in production.');
}

export interface AdminTokenPayload {
  role: 'admin';
  iat?: number;
  exp?: number;
}

/**
 * Admin login endpoint handler
 * Validates password and returns JWT token if successful
 */
export async function adminLogin(req: Request, res: Response): Promise<void> {
  try {
    const { password } = req.body;
    
    if (!password) {
      res.status(400).json({
        success: false,
        error: 'Password is required'
      });
      return;
    }
    
    // Validate password
    if (password !== ADMIN_PASSWORD) {
      res.status(401).json({
        success: false,
        error: 'Invalid password'
      });
      return;
    }
    
    // Generate JWT token
    const payload: AdminTokenPayload = {
      role: 'admin'
    };
    
    // APP_JWT_SECRET is validated on module load, so we know it's defined
    const token = jwt.sign(payload, APP_JWT_SECRET!, {
      expiresIn: APP_JWT_EXPIRY as string
    } as jwt.SignOptions);
    
    res.json({
      success: true,
      token,
      expiresIn: APP_JWT_EXPIRY
    });
    
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

/**
 * Middleware to verify admin JWT token
 * Protects routes that require admin authentication
 */
export function verifyAdminJWT(req: Request, res: Response, next: NextFunction): void {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: 'Authorization header missing'
      });
      return;
    }
    
    // Extract token (format: "Bearer <token>")
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({
        success: false,
        error: 'Invalid authorization header format. Use: Bearer <token>'
      });
      return;
    }
    
    const token = parts[1];
    
    // Verify token (APP_JWT_SECRET is validated on module load)
    const decoded = jwt.verify(token, APP_JWT_SECRET!) as AdminTokenPayload;
    
    // Check if role is admin
    if (decoded.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
      return;
    }
    
    // Attach decoded token to request for use in route handlers
    (req as any).admin = decoded;
    
    next();
    
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
      return;
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: 'Token expired'
      });
      return;
    }
    
    console.error('JWT verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

/**
 * Check if admin authentication is properly configured
 */
export function checkAdminConfig(): { configured: boolean; warnings: string[] } {
  const warnings: string[] = [];
  
  if (!process.env.APP_JWT_SECRET || process.env.APP_JWT_SECRET === 'change-this-secret-in-production') {
    warnings.push('APP_JWT_SECRET is not set or using default value. Set a secure secret in production!');
  }
  
  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD === '101010') {
    warnings.push('ADMIN_PASSWORD is not set or using default value (101010). Change this in production!');
  }
  
  return {
    configured: warnings.length === 0,
    warnings
  };
}
