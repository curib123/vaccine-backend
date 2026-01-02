import { IMMUNIZATION_STATUS } from '../constants/immunization.constants.js';
import { VisitService } from '../services/visit.service.js';

export const VisitController = {
 /* =========================
   CREATE VISITS
   (1 OR MANY CHILDREN)
========================= */
async createVisit(req, res) {
  try {
    const result = await VisitService.createVisits(
      req.body,
      req.user
    );

    return res.json({
      success: true,
      message: 'Visits created successfully',
      data: result.visits,
      createdCount: result.createdCount,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
},

  /* =========================
     GET VISIT BY ID
  ========================= */
  async getVisitById(req, res) {
    try {
      const visit = await VisitService.getVisitById(
        req.params.id
      );

      if (!visit) {
        return res.status(404).json({
          success: false,
          message: 'Visit not found',
        });
      }

      return res.json({
        success: true,
        data: visit,
      });
    } catch (err) {
      return res.status(404).json({
        success: false,
        message: err.message,
      });
    }
  },

  /* =========================
     GET VISITS BY CHILD ID
  ========================= */
  async getVisitsByChildId(req, res) {
    try {
      const visits =
        await VisitService.getVisitsByChildId(
          req.params.childId
        );

      return res.json({
        success: true,
        data: visits,
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
  },

  /* =========================
     GET ALL VISITS (PAGINATED)
  ========================= */
  async getAllVisits(req, res) {
    try {
      const result = await VisitService.getAllVisits(
        req.query
      );

      return res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
  },

/* =========================
   ATTACH RECORDS TO VISIT
   ✅ STATUS PASSED FROM UI
   ✅ childId REQUIRED
========================= */
async attachRecordsToVisit(req, res) {
  try {
    const { visitId, childId, recordIds, status } = req.body;

    if (!visitId) {
      return res.status(400).json({
        success: false,
        message: 'Visit ID is required',
      });
    }

    if (!childId) {
      return res.status(400).json({
        success: false,
        message: 'Child ID is required',
      });
    }

    if (!Array.isArray(recordIds) || recordIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Record IDs are required',
      });
    }

    if (
      !Object.values(IMMUNIZATION_STATUS).includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid immunization status',
      });
    }

    const result =
      await VisitService.attachRecordsToVisit(
        visitId,
        childId,
        recordIds,
        status,
        req.user
      );

    return res.json({
      success: true,
      data: result,
      message: 'Records attached to visit successfully',
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
}
,
  /* =========================
     UPDATE VISIT
  ========================= */
  async updateVisitById(req, res) {
    try {
      const visit = await VisitService.updateVisit(
        req.params.id,
        req.body
      );

      return res.json({
        success: true,
        data: visit,
        message: 'Visit updated successfully',
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
  },

  /* =========================
     DELETE VISIT
  ========================= */
  async deleteVisitById(req, res) {
    try {
      await VisitService.deleteVisit(
        req.params.id
      );

      return res.json({
        success: true,
        message: 'Visit deleted successfully',
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
  },
};
