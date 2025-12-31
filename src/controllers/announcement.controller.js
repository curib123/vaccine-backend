import { AnnouncementService } from '../services/announcement.service.js';

/* =====================================================
   CREATE ANNOUNCEMENT
===================================================== */
export const createAnnouncement = async (req, res) => {
  try {
    const result = await AnnouncementService.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* =====================================================
   GET ALL ANNOUNCEMENTS
===================================================== */
export const getAllAnnouncements = async (req, res) => {
  try {
    const { page, limit, isActive } = req.query;

    const result = await AnnouncementService.getAll({
      page: Number(page) || 1,
      limit: Number(limit) || 10,
      isActive:
        isActive === undefined ? undefined : isActive === 'true',
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =====================================================
   GET ANNOUNCEMENT BY ID
===================================================== */
export const getAnnouncementById = async (req, res) => {
  try {
    const announcement = await AnnouncementService.getById(
      req.params.id
    );

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found',
      });
    }

    res.json({
      success: true,
      data: announcement,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =====================================================
   UPDATE ANNOUNCEMENT
===================================================== */
export const updateAnnouncement = async (req, res) => {
  try {
    const result = await AnnouncementService.update(
      req.params.id,
      req.body
    );

    res.json({
      success: true,
      message: 'Announcement updated successfully',
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* =====================================================
   TOGGLE ACTIVE STATUS
===================================================== */
export const toggleAnnouncementStatus = async (req, res) => {
  try {
    const result = await AnnouncementService.toggleStatus(
      req.params.id
    );

    res.json({
      success: true,
      message: 'Announcement status updated',
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* =====================================================
   DELETE (SOFT)
===================================================== */
export const deleteAnnouncement = async (req, res) => {
  try {
    await AnnouncementService.remove(req.params.id);

    res.json({
      success: true,
      message: 'Announcement deleted successfully',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
