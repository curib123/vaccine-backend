import { RecordsService } from '../services/records.service.js';

/* =====================================================
   HELPERS
===================================================== */
const parseId = (value, name) => {
  const id = Number(value);
  if (!value || Number.isNaN(id) || id <= 0) {
    throw new Error(`${name} is required and must be a valid number`);
  }
  return id;
};

/* =====================================================
   GET ALL IMMUNIZATION RECORDS
===================================================== */
export const getAllRecords = async (req, res) => {
  try {
    const result = await RecordsService.getAllRecords(req.query);

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
      message: error.message || 'Failed to retrieve immunization records',
    });
  }
};

/* =====================================================
   UPDATE IMMUNIZATION RECORD STATUS
===================================================== */
export const updateRecordStatus = async (req, res) => {
  try {
    const recordId = parseId(req.params.id, 'Record ID');

    const updated = await RecordsService.updateRecordStatus(
      recordId,
      req.body,
      req.user.id // ✅ FROM BEARER TOKEN
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
      message: error.message || 'Failed to update immunization record',
    });
  }
};

/* =====================================================
   GET ALL IMMUNIZATION STATUSES
===================================================== */
export const getAllStatus = async (_req, res) => {
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
   MANUAL GENERATION (ADMIN / DEBUG)
===================================================== */
export const generateRecordsForChild = async (req, res) => {
  try {
    const childId = parseId(req.params.childId, 'Child ID');

    const result = await RecordsService.generateForChild(
      childId,
      req.user.id // ✅ FROM BEARER TOKEN
    );

    return res.status(200).json({
      success: true,
      message: 'Immunization records generated successfully',
      data: result,
    });
  } catch (error) {
    console.error('❌ GENERATE RECORDS ERROR:', error);

    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to generate immunization records',
    });
  }
};

/* =====================================================
   RECOMPUTE IMMUNIZATION SUMMARY
===================================================== */
export const recomputeSummary = async (req, res) => {
  try {
    const childId = parseId(req.params.childId, 'Child ID');

    await RecordsService.updateSummary(childId);

    return res.status(200).json({
      success: true,
      message: 'Immunization summary updated successfully',
    });
  } catch (error) {
    console.error('❌ SUMMARY ERROR:', error);

    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to recompute immunization summary',
    });
  }
};

/* =====================================================
   GET IMMUNIZATION RECORDS BY CHILD ID
===================================================== */
export const getRecordsByChildId = async (req, res) => {
  try {
    const childId = parseId(req.params.childId, 'Child ID');

    const result = await RecordsService.getRecordsByChildId({ childId });

    return res.status(200).json({
      success: true,
      message: 'Child immunization records retrieved successfully',
      data: result.data,
      summary: result.summary,
    });
  } catch (error) {
    console.error('❌ GET RECORDS BY CHILD ERROR:', error);

    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to retrieve child immunization records',
    });
  }
};
