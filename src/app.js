import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';

import AnnouncementRoutes from './routes/announcement.route.js';
import authRoutes from './routes/auth.route.js';
import ChildRoutes from './routes/child.route.js';
import dashboardRoutes from './routes/dashboard.route.js';
import notificationRoutes from './routes/notification.route.js';
import ParentRoutes from './routes/parent.route.js';
import parentDashboardRoutes from './routes/parentDashboard.route.js';
import recordsRoutes from './routes/records.routes.js';
import roleRoutes from './routes/role.route.js';
import UserRoutes from './routes/user.route.js';
import VaccineRoutes from './routes/vaccine.routes.js';

const app = express();

/* 🔥 CORS MUST COME FIRST */
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);

/* 🔥 Then parsers */
app.use(express.json());
app.use(cookieParser());

/* 🔥 Routes */
app.use('/api/auth', authRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/user', UserRoutes);
app.use('/api/parent', ParentRoutes);
app.use('/api/vaccine', VaccineRoutes);
app.use('/api/child', ChildRoutes);
app.use('/api/records', recordsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/announcements', AnnouncementRoutes);
app.use('/api/parentDashboard', parentDashboardRoutes);

/* 🔥 Health check */
app.get('/', (req, res) => {
  res.json({ message: 'Health Center API is running' });
});

export default app;
