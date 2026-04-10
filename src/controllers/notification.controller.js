import { AuditService } from '../services/audit.service.js';
import { NotificationService } from '../services/notification.service.js';

export const getMyNotifications = async (req, res) => {
  try {
    await NotificationService.syncUpcomingScheduleReminders();

    const notifications = await NotificationService.getMyNotifications(req.user.id, {
      limit: req.query.limit || 15,
    });

    return res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to load notifications',
    });
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    await NotificationService.markAsRead(req.params.id, req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to update notification',
    });
  }
};

export const syncUpcomingReminders = async (_req, res) => {
  try {
    const count = await NotificationService.syncUpcomingScheduleReminders();

    return res.status(200).json({
      success: true,
      data: {
        created: count,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to sync reminders',
    });
  }
};

export const getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditService.getLogs({
      limit: req.query.limit || 20,
    });

    return res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to load audit logs',
    });
  }
};
