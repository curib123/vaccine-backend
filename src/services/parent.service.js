import { prisma } from '../config/db.js';

export const ParentService = {
    

   // Get all users with Parent/Guardian role
async getAllParents() {

  // 1️⃣ Find the Parent/Guardian role
  const role = await prisma.role.findFirst({
    where: { name: 'Parent/Guardian' },
  });

  if (!role) {
    throw new Error('Parent/Guardian role not found');
  }

  // 2️⃣ Find all users with that role
  return prisma.user.findMany({
    where: {
      roleId: role.id,
      isDeleted: false,
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
}

}
