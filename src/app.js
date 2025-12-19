import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';

const app = express();

app.use(cors({
  origin: true,
  credentials: true, // ✅ allow cookies
}));

app.use(express.json());
app.use(cookieParser()); // ✅ cookie parser


app.get('/', (req, res) => {
  res.json({ message: 'Health Center API is running' });
});

export default app;
