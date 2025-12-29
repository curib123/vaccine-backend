import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

export const generateToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined');
  }

  const { id, email, role } = user;

  return jwt.sign(
    {
      user_id: id,
      email,
      role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};
