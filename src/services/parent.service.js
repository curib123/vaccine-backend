import { prisma } from '../config/db.js';

// role name from env (with fallback)
const PARENT_ROLE_NAME =
  process.env.PARENT_ROLE_NAME || 'Parent/Guardian';

export const ParentService = {

  // Get all users with Parent/Guardian role
  async getAllParents() {
    return prisma.user.findMany({
      where: {
        isDeleted: false,
        role: {
          name: PARENT_ROLE_NAME,
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        middleName: true,
        lastName: true,
        contactNo: true,
        address: true,
        isActive: true,
        createdAt: true,
      },
    });
  },

  // Get all children of a parent user
async getChildrenByParentId(parentId) {
  if (!parentId) {
    throw new Error('Parent ID is required');
  }

  // 1️⃣ Check if user is a parent
  const parent = await prisma.user.findFirst({
    where: {
      id: parentId,
      isDeleted: false,
      role: {
        name: PARENT_ROLE_NAME,
      },
    },
  });

  if (!parent) {
    throw new Error('Parent user not found or not a parent');
  }

  // 2️⃣ Get children
  return prisma.child.findMany({
    where: {
      parentId,
      isDeleted: false,
    },
    select: {
      id: true,
      firstName: true,
      middleName: true,
      lastName: true,
      gender: true,
      birthDate: true,
      birthPlace: true,
      createdAt: true,
    },
  });
}

};
