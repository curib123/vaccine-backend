import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';

import authRoutes from './routes/auth.route.js';
import ParentRoutes from './routes/parent.route.js';
import roleRoutes from './routes/role.route.js';
import UserRoutes from './routes/user.route.js';

const app = express();

app.use(cors({
  origin: true,
  credentials: true, 
}));

app.use(express.json());
app.use(cookieParser()); 

app.use('/api/roles', roleRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', UserRoutes);
app.use('/api/parent', ParentRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Health Center API is running' });
});

export default app;
