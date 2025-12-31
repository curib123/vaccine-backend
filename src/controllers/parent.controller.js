import { ParentService } from '../services/parent.service.js';

/* =========================
   GET ALL PARENTS
   (PAGINATED + SEARCH + FILTER + SORT)
========================= */
export const getAllParents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      isActive,
      sortBy,
      sortOrder,
    } = req.query;

    const result = await ParentService.getAllParents({
      page: Number(page),
      limit: Number(limit),
      search,
      isActive,
      sortBy,
      sortOrder,
    });

    return res.status(200).json({
      success: true,
      message: 'Successfully retrieved all parents',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================
   GET CHILDREN BY PARENT ID
   (PAGINATED + SEARCH + FILTER + SORT)
========================= */
export const getChildrenByParentId = async (req, res) => {
  try {
    const parentId = Number(req.params.parentId);
    const {
      page = 1,
      limit = 10,
      search = '',
      gender,
      sortBy,
      sortOrder,
    } = req.query;

    if (isNaN(parentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid parent ID',
      });
    }

    const result = await ParentService.getChildrenByParentId(
      parentId,
      {
        page: Number(page),
        limit: Number(limit),
        search,
        gender,
        sortBy,
        sortOrder,
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Children retrieved successfully',
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
