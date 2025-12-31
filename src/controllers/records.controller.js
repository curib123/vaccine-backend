import { RecordsService } from '../services/records.service.js';

/* =====================================================
   GET ALL IMMUNIZATION RECORDS
   (AUTO-GENERATE IF MISSING)
===================================================== */
export const getAllRecords = async (req, res) => {
  try {
    const result = await RecordsService.getAllRecords({
      ...req.query,
      systemUserId: req.user?.id || 1, // fallback admin/system
    });

    return res.status(200).json({
      success: true,
      message: 'Immunization records retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('❌ GET RECORDS ERROR:', error);

    return res.status(500).json({
      success: false,
      message:
        error.message || 'Failed to retrieve immunization records',
    });
  }
};

/* =====================================================
   UPDATE IMMUNIZATION RECORD STATUS
===================================================== */
export const updateRecordStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await RecordsService.updateRecordStatus(
      Number(id),
      req.body,
      req.user?.id || 1
    );

    return res.status(200).json({
      success: true,
      message: 'Immunization record status updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('❌ UPDATE STATUS ERROR:', error);

    return res.status(400).json({
      success: false,
      message:
        error.message || 'Failed to update immunization record',
    });
  }
};

/* =====================================================
   GET ALL IMMUNIZATION STATUSES
===================================================== */
export const getAllStatus = async (req, res) => {
  try {
    const statuses = await RecordsService.getAllStatus();

    return res.status(200).json({
      success: true,
      data: statuses,
    });
  } catch (error) {
    console.error('❌ GET STATUS ERROR:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch immunization statuses',
    });
  }
};

/* =====================================================
   MANUAL GENERATION (OPTIONAL / ADMIN)
===================================================== */
export const generateRecordsForChild = async (req, res) => {
  try {
    const { childId } = req.params;

    if (!childId) {
      return res.status(400).json({
        success: false,
        message: 'Child ID is required',
      });
    }

    const result = await RecordsService.generateForChild(
      Number(childId),
      req.user?.id || 1
    );

    return res.status(200).json({
      success: true,
      message: 'Immunization records generated successfully',
      data: result,
    });
  } catch (error) {
    console.error('❌ GENERATE RECORDS ERROR:', error);

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        'Failed to generate immunization records',
    });
  }
};

/* =====================================================
   RECOMPUTE IMMUNIZATION SUMMARY
===================================================== */
export const recomputeSummary = async (req, res) => {
  try {
    const { childId } = req.params;

    await RecordsService.updateSummary(Number(childId));

    return res.status(200).json({
      success: true,
      message: 'Immunization summary updated successfully',
    });
  } catch (error) {
    console.error('❌ SUMMARY ERROR:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to recompute immunization summary',
    });
  }
};
