import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { adminRouter } from './routes/admin.routes.js';
import { errorHandler } from './middleware/error.middleware.js';

dotenv.config();

const app = express();
const PORT = process.env.ADMIN_PORT || 5002;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'admin-panel' });
});

// Admin API routes
app.use('/api/admin', adminRouter);

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Admin panel server running on port ${PORT}`);
});
