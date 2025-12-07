/**
 * Admin Authentication Module
 * 
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
