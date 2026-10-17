import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import apiRoutes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

const app = express();

// Configure CORS
const allowedOrigins = [
  config.frontendUrl,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (such as mobile apps, curl, or same-origin requests)
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      origin.endsWith('.run.app') ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.onrender.com')
    ) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive in dev, can restrict in production
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Standard body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mount all API routes under /api
app.use('/api', apiRoutes);

// Root route for API welcome / service info
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'PrimePrep API is running',
    service: 'PrimePrep Backend API',
    description: 'CUET PG Test Preparation Platform REST API',
    healthEndpoint: '/api/health',
    version: '1.0.0',
  });
});

// 404 handler for unknown API routes only
app.use('/api/*', notFoundHandler);

// Central error handler
app.use(errorHandler);

export default app;
