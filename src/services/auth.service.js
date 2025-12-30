import bcrypt from 'bcryptjs';

import { prisma } from '../config/db.js';

export const AuthService = {

  /* =========================
     LOGIN
     - returns user + permissions
  ========================= */
  async login({ email, password }) {
    // 1️⃣ Validate input
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // 2️⃣ Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // 3️⃣ Reject invalid credentials
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // ❌ Block inactive user
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

    // 6️⃣ Get USER permissions
    const permissions = await prisma.userPermission.findMany({
      where: {
        userId: user.id,
        allowed: true,
      },
      include: {
        permission: {
          select: {
            id: true,
            code: true,
          },
        },
      },
    });

    // 7️⃣ Return SAFE user data + permissions
    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        contactNo: user.contactNo,
        address: user.address,
        roleId: role.id,
        roleName: role.name,
        isActive: user.isActive,
        createdAt: user.createdAt,
        permissions: permissions.map((p) => ({
          id: p.permission.id,
          code: p.permission.code,
        })),
      },
    };
  },

  /* =========================
     REGISTER
     - copies role permissions → user
  ========================= */
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
    // 1️⃣ Validate
    if (!email || !password || !firstName || !lastName || !roleId) {
      throw new Error('Missing required fields');
    }

    // 2️⃣ Check email
    const exists = await prisma.user.findUnique({
      where: { email },
    });

    if (exists) {
      throw new Error('Email already exists');
    }

    // 3️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4️⃣ Create user
    const user = await prisma.user.create({
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
    });

    // 5️⃣ Get ROLE permissions
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { roleId },
      select: { permissionId: true },
    });

    // 6️⃣ Copy ROLE → USER permissions
    if (rolePermissions.length > 0) {
      await prisma.userPermission.createMany({
        data: rolePermissions.map((rp) => ({
          userId: user.id,
          permissionId: rp.permissionId,
          allowed: true,
        })),
        skipDuplicates: true,
      });
    }

    // 7️⃣ Return SAFE user data
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      middleName: user.middleName,
      lastName: user.lastName,
      contactNo: user.contactNo,
      address: user.address,
      roleId: user.roleId,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  },
};
