/**
 * Express Server for Admin API
 * 
 * Provides admin-authenticated endpoints for ingesting results
 * and managing Supabase storage.
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { adminLogin, verifyAdminJWT, checkAdminConfig } from './admin-auth';
import { ingestResult, getLatestResult, getResultHistory } from '../api/ingest';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  const config = checkAdminConfig();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    adminConfigured: config.configured,
    warnings: config.warnings
  });
});

// ================================================================
// Admin Authentication Routes
// ================================================================

/**
 * POST /api/admin/login
 * Admin login endpoint - returns JWT token if password is correct
 * Body: { password: string }
 */
app.post('/api/admin/login', adminLogin);

// ================================================================
// Protected Ingestion Routes (require admin JWT)
// ================================================================

/**
 * POST /api/ingest/results
 * Insert a new result (append-only)
 * Body: { source: string, source_id?: string, content: any, metadata?: any }
 */
app.post('/api/ingest/results', verifyAdminJWT, ingestResult);

/**
 * GET /api/ingest/results/latest
 * Get the latest version for a source+source_id
 * Query: ?source=<source>&source_id=<source_id>
 */
app.get('/api/ingest/results/latest', verifyAdminJWT, getLatestResult);

/**
 * GET /api/ingest/results/history
 * Get all versions for a source+source_id
 * Query: ?source=<source>&source_id=<source_id>
 */
app.get('/api/ingest/results/history', verifyAdminJWT, getResultHistory);

// ================================================================
// Error handling
// ================================================================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// ================================================================
// Start server
// ================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, () => {
    console.log(`\n🚀 Admin API Server running on http://localhost:${PORT}`);
    console.log(`\nAvailable endpoints:`);
    console.log(`  GET  /health - Health check`);
    console.log(`  POST /api/admin/login - Admin login`);
    console.log(`  POST /api/ingest/results - Ingest new result (protected)`);
    console.log(`  GET  /api/ingest/results/latest - Get latest result (protected)`);
    console.log(`  GET  /api/ingest/results/history - Get result history (protected)`);
    
    const config = checkAdminConfig();
    if (!config.configured) {
      console.log(`\n⚠️  Configuration warnings:`);
      config.warnings.forEach(warning => console.log(`  - ${warning}`));
    }
    
    console.log(`\n`);
  });
}

export default app;
