import { checkDbHealth } from '../config/db.js';

export const getHealth = async (req, res, next) => {
  try {
    const dbHealth = await checkDbHealth();

    const healthStatus = {
      status: 'ok',
      service: 'PrimePrep API',
      version: '1.0.0',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: dbHealth,
    };

    return res.status(200).json(healthStatus);
  } catch (error) {
    next(error);
  }
};
