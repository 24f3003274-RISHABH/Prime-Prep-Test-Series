import { checkDbHealth } from '../config/db.js';

export const getHealth = async (req, res, next) => {
  try {
    const dbHealth = await checkDbHealth();

    const isDbConnected = dbHealth.status === 'connected';

    const healthStatus = {
      success: true,
      status: 'ok',
      message: 'PrimePrep API is running',
      service: 'PrimePrep API',
      version: '1.0.0',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: dbHealth,
    };

    // If database check failed, respond with 503 so monitors detect degradation
    const httpStatus = isDbConnected || dbHealth.status === 'unconfigured' ? 200 : 503;

    return res.status(httpStatus).json(healthStatus);
  } catch (error) {
    next(error);
  }
};
