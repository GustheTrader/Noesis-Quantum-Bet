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

// Warning if using default secrets
if (APP_JWT_SECRET === 'replace_this_with_a_strong_random_secret_key') {
    console.warn('⚠️  WARNING: Using default APP_JWT_SECRET. Please set a strong secret in production!');
}

if (ADMIN_PASSWORD === '101010') {
    console.warn('⚠️  WARNING: Using default ADMIN_PASSWORD (101010). Please change in production!');
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
