import { ParentDashboardService } from '../services/parentDashboard.service.js';
import { NotificationService } from '../services/notification.service.js';

export const ParentDashboardController = {
  async getDashboard(req, res) {
    try {
      const parentId = req.user.id;
      await NotificationService.syncUpcomingScheduleReminders();

      const data =
        await ParentDashboardService.getDashboard(parentId);

      return res.json({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: 'Failed to load dashboard',
      });
    }
  },
};
