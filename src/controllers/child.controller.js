import { ChildService } from '../services/child.service.js';

/* =====================================================
   CREATE CHILD
===================================================== */
export const createChild = async (req, res) => {
  try {
    const child = await ChildService.createChild(
      req.body,
      req.user.id // 👈 from verifyToken (Bearer decode)
    );

    return res.status(201).json({
      success: true,
      message: 'Child created successfully',
      data: child,
    });
  } catch (error) {
    console.error('❌ CREATE CHILD ERROR:', error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* =====================================================
   UPDATE CHILD
===================================================== */
export const updateChildById = async (req, res) => {
  try {
    const { id } = req.params;

    const child = await ChildService.updateChildById(
      Number(id),
      req.body
    );

    return res.status(200).json({
      success: true,
      message: 'Child updated successfully',
      data: child,
    });
  } catch (error) {
    console.error('❌ UPDATE CHILD ERROR:', error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* =====================================================
   TOGGLE DELETE
===================================================== */
export const toggleChildIsDeleted = async (req, res) => {
  try {
    const { id } = req.params;

    const child = await ChildService.toggleChildIsDeleted(Number(id));

    return res.status(200).json({
      success: true,
      message: child.isDeleted
        ? 'Child deleted successfully'
        : 'Child restored successfully',
      data: child,
    });
  } catch (error) {
    console.error('❌ DELETE CHILD ERROR:', error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

/* =====================================================
   GET CHILD BY ID
===================================================== */
export const getChildById = async (req, res) => {
  try {
    const { id } = req.params;

    const child = await ChildService.getChildById(Number(id));

    if (!child) {
      return res.status(404).json({
        success: false,
        message: 'Child not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: child,
    });
  } catch (error) {
    console.error('❌ GET CHILD ERROR:', error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =====================================================
   GET ALL CHILDREN
===================================================== */
export const getAllChildren = async (req, res) => {
  try {
    const result = await ChildService.getAllChildren(req.query);

    return res.status(200).json({
      success: true,
      message: 'Children retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('❌ GET ALL CHILDREN ERROR:', error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
