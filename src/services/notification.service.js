import { prisma } from '../config/db.js';
import {
  EMAIL_DELIVERY_STATUS,
  NOTIFICATION_TYPES,
} from '../constants/immunization.constants.js';
import { UPCOMING_REMINDER_WINDOW_DAYS } from '../constants/vaccineCatalog.constants.js';
import { EmailService } from './email.service.js';

const STAFF_ROLE_NAMES = ['ADMIN', 'NURSE'];

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const startOfDay = date => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDay = date => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

async function deliverNotification(notificationId, userEmail, payload) {
  try {
    await EmailService.sendMail({
      to: userEmail,
      subject: payload.title,
      text: payload.message,
      html: `<p>${payload.message}</p>`,
    });

    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        emailStatus: EMAIL_DELIVERY_STATUS.SENT,
        emailedAt: new Date(),
      },
    });
  } catch (error) {
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        emailStatus: EMAIL_DELIVERY_STATUS.FAILED,
      },
    });
  }
}

export const NotificationService = {
  async createForUserIds({
    userIds,
    childId,
    recordId,
    title,
    message,
    type,
    sendEmail = true,
  }) {
    const uniqueUserIds = [...new Set((userIds || []).map(Number).filter(Boolean))];
    if (!uniqueUserIds.length) {
      return [];
    }

    const users = await prisma.user.findMany({
      where: {
        id: { in: uniqueUserIds },
        isDeleted: false,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
      },
    });

    const created = [];

    for (const user of users) {
      const notification = await prisma.notification.create({
        data: {
          userId: user.id,
          childId: childId ?? null,
          recordId: recordId ?? null,
          title,
          message,
          type,
        },
      });

      created.push(notification);

      if (sendEmail) {
        await deliverNotification(notification.id, user.email, {
          title,
          message,
        });
      }
    }

    return created;
  },

  async createForRoleNames({
    roleNames,
    childId,
    recordId,
    title,
    message,
    type,
    sendEmail = true,
  }) {
    const users = await prisma.user.findMany({
      where: {
        isDeleted: false,
        isActive: true,
        role: {
          name: { in: roleNames },
        },
      },
      select: { id: true },
    });

    return this.createForUserIds({
      userIds: users.map(user => user.id),
      childId,
      recordId,
      title,
      message,
      type,
      sendEmail,
    });
  },

  async notifyChildRegistered(child) {
    const fullName = `${child.firstName} ${child.lastName}`;

    await Promise.all([
      this.createForRoleNames({
        roleNames: STAFF_ROLE_NAMES,
        childId: child.id,
        title: 'New child registration',
        message: `${fullName} was registered and an immunization schedule was generated automatically.`,
        type: NOTIFICATION_TYPES.CHILD_REGISTERED,
      }),
      this.createForUserIds({
        userIds: [child.parentId],
        childId: child.id,
        title: 'Child registration confirmed',
        message: `${fullName} has been registered. The vaccine schedule based on the child immunization card is now ready.`,
        type: NOTIFICATION_TYPES.SCHEDULE_CREATED,
      }),
    ]);
  },

  async notifyRecordStatusChange(record) {
    const childName = `${record.child.firstName} ${record.child.lastName}`;
    const title = `Immunization ${record.status.toLowerCase()}`;
    const message = `${record.vaccine.name} ${record.doseLabelText || record.dose} for ${childName} is now ${record.status.toLowerCase()}.`;

    await Promise.all([
      this.createForUserIds({
        userIds: [record.child.parentId],
        childId: record.childId,
        recordId: record.id,
        title,
        message,
        type: NOTIFICATION_TYPES.STATUS_UPDATED,
      }),
      this.createForRoleNames({
        roleNames: STAFF_ROLE_NAMES,
        childId: record.childId,
        recordId: record.id,
        title,
        message,
        type: NOTIFICATION_TYPES.STATUS_UPDATED,
      }),
    ]);
  },

  async notifyStockChange(vaccine, changeSummary) {
    const title =
      vaccine.stockQuantity <= vaccine.reorderLevel
        ? 'Low vaccine stock'
        : 'Vaccine stock updated';
    const type =
      vaccine.stockQuantity <= vaccine.reorderLevel
        ? NOTIFICATION_TYPES.LOW_STOCK
        : NOTIFICATION_TYPES.STOCK_UPDATED;

    const message = `${vaccine.name} stock is now ${vaccine.stockQuantity} ${vaccine.unit}${vaccine.stockQuantity === 1 ? '' : 's'}${changeSummary ? ` (${changeSummary})` : ''}.`;

    await this.createForRoleNames({
      roleNames: STAFF_ROLE_NAMES,
      title,
      message,
      type,
    });
  },

  async syncUpcomingScheduleReminders(windowDays = UPCOMING_REMINDER_WINDOW_DAYS) {
    const today = startOfDay(new Date());
    const windowEnd = endOfDay(addDays(new Date(), windowDays));

    const records = await prisma.immunizationRecord.findMany({
      where: {
        isDeleted: false,
        status: 'PENDING',
        reminderSentAt: null,
        nextDueDate: {
          gte: today,
          lte: windowEnd,
        },
      },
      include: {
        child: {
          select: {
            id: true,
            parentId: true,
            firstName: true,
            lastName: true,
          },
        },
        vaccine: {
          select: {
            name: true,
          },
        },
      },
    });

    for (const record of records) {
      const childName = `${record.child.firstName} ${record.child.lastName}`;
      const dueDate = record.nextDueDate
        ? new Date(record.nextDueDate).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : 'soon';

      await Promise.all([
        this.createForUserIds({
          userIds: [record.child.parentId],
          childId: record.childId,
          recordId: record.id,
          title: 'Upcoming vaccine schedule',
          message: `${record.vaccine.name} ${record.dose} for ${childName} is due on ${dueDate}.`,
          type: NOTIFICATION_TYPES.UPCOMING_SCHEDULE,
        }),
        this.createForRoleNames({
          roleNames: STAFF_ROLE_NAMES,
          childId: record.childId,
          recordId: record.id,
          title: 'Upcoming vaccine schedule',
          message: `${childName} is due for ${record.vaccine.name} ${record.dose} on ${dueDate}.`,
          type: NOTIFICATION_TYPES.UPCOMING_SCHEDULE,
        }),
      ]);

      await prisma.immunizationRecord.update({
        where: { id: record.id },
        data: {
          reminderSentAt: new Date(),
        },
      });
    }

    return records.length;
  },

  async getMyNotifications(userId, { limit = 15 } = {}) {
    return prisma.notification.findMany({
      where: { userId: Number(userId) },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
    });
  },

  async markAsRead(notificationId, userId) {
    return prisma.notification.updateMany({
      where: {
        id: Number(notificationId),
        userId: Number(userId),
      },
      data: {
        readAt: new Date(),
      },
    });
  },
};
