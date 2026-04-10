import { DashboardService } from '../services/dashboard.service.js';
import { NotificationService } from '../services/notification.service.js';

/* =====================================================
   GET DASHBOARD OVERVIEW
===================================================== */
export const getDashboardOverview = async (req, res) => {
  try {
    await NotificationService.syncUpcomingScheduleReminders();
    const data = await DashboardService.getOverview();

    return res.status(200).json({
      success: true,
      message: 'Dashboard overview retrieved successfully',
      data,
    });
  } catch (error) {
    console.error('❌ DASHBOARD OVERVIEW ERROR:', error);

    return res.status(500).json({
      success: false,
      message:
        error.message || 'Failed to retrieve dashboard overview',
    });
  }
};

/* =====================================================
   GET MONTHLY IMMUNIZATION TREND
   (FOR CHARTS)
===================================================== */
export const getMonthlyTrend = async (req, res) => {
  try {
    const { year } = req.query;

    const data = await DashboardService.getMonthlyTrend(
      year ? Number(year) : undefined
    );

    return res.status(200).json({
      success: true,
      message: 'Monthly immunization trend retrieved successfully',
      data,
    });
  } catch (error) {
    console.error('❌ DASHBOARD TREND ERROR:', error);

    return res.status(500).json({
      success: false,
      message:
        error.message || 'Failed to retrieve dashboard trend',
    });
  }
};
