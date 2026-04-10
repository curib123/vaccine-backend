import { VaccineService } from '../services/vaccine.service.js';

/* =====================================================
   CREATE VACCINE (+ OPTIONAL SCHEDULES)
===================================================== */
export const createVaccine = async (req, res) => {
  try {
    const vaccine = await VaccineService.createVaccine(req.body, req.user?.id);

    return res.status(201).json({
      success: true,
      message: 'Vaccine created successfully',
      data: vaccine,
    });
  } catch (error) {
    console.error('❌ CREATE VACCINE ERROR:', error);

    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to create vaccine',
    });
  }
};

/* =====================================================
   UPDATE VACCINE (+ OPTIONAL SCHEDULE RESET)
===================================================== */
export const updateVaccineById = async (req, res) => {
  try {
    const { id } = req.params;

    const vaccine = await VaccineService.updateVaccineById(
      Number(id),
      req.body,
      req.user?.id
    );

    return res.status(200).json({
      success: true,
      message: 'Vaccine updated successfully',
      data: vaccine,
    });
  } catch (error) {
    console.error('❌ UPDATE VACCINE ERROR:', error);

    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to update vaccine',
    });
  }
};

/* =====================================================
   TOGGLE SOFT DELETE / RESTORE
===================================================== */
export const toggleVaccineIsDeleted = async (req, res) => {
  try {
    const { id } = req.params;

    const vaccine = await VaccineService.toggleIsDeleted(Number(id));

    return res.status(200).json({
      success: true,
      message: vaccine.isDeleted
        ? 'Vaccine deleted successfully'
        : 'Vaccine restored successfully',
      data: vaccine,
    });
  } catch (error) {
    console.error('❌ TOGGLE VACCINE DELETE ERROR:', error);

    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to update vaccine status',
    });
  }
};

/* =====================================================
   GET VACCINE BY ID (WITH SCHEDULES)
===================================================== */
export const getVaccineById = async (req, res) => {
  try {
    const { id } = req.params;

    const vaccine = await VaccineService.getVaccineById(Number(id));

    if (!vaccine) {
      return res.status(404).json({
        success: false,
        message: 'Vaccine not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: vaccine,
    });
  } catch (error) {
    console.error('❌ GET VACCINE ERROR:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch vaccine',
    });
  }
};

/* =====================================================
   GET ALL VACCINES (SEARCH + SORT + PAGINATION)
===================================================== */
export const getAllVaccines = async (req, res) => {
  try {
    const result = await VaccineService.getAllVaccines(req.query);

    return res.status(200).json({
      success: true,
      message: 'Vaccines retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('❌ GET ALL VACCINES ERROR:', error);

    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve vaccines',
    });
  }
};
