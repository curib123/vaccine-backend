import bcrypt from 'bcryptjs';

import { prisma } from '../config/db.js';
import { generateToken } from '../config/jwt.config.js';

export const AuthService = {

  // ✅ LOGIN
  async login({ email, password }) {
    // 1️⃣ Validate input
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // 2️⃣ Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // 3️⃣ Check if account is active
    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // 4️⃣ Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // 5️⃣ Get role
    const role = await prisma.role.findUnique({
      where: { id: user.roleId },
    });

    if (!role || role.isDeleted) {
      throw new Error('Role not found');
    }

    // 6️⃣ Generate JWT
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: role.name,
    });

    // 7️⃣ Return safe data + token
    return {
      token, // 👈 controller will store this in cookie
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        contactNo: user.contactNo,
        address: user.address,
        roleName: role.name,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    };
  },

  // ✅ REGISTER (unchanged)
  async register({
    email,
    password,
    roleId,
    firstName,
    middleName = null,
    lastName,
    contactNo = null,
    address = null,
  }) {

    if (!email || !password || !firstName || !lastName) {
      throw new Error('Missing required fields');
    }

    const exists = await prisma.user.findUnique({
      where: { email },
    });

    if (exists) {
      throw new Error('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    return prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        roleId,
        firstName,
        middleName,
        lastName,
        contactNo,
        address,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        middleName: true,
        contactNo: true,
        address: true,
        roleId: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

};
