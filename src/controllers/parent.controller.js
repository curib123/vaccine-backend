import { ParentService } from '../services/parent.service.js';

export const getAllParents = async (req,res) =>{
 
    try {
        return res.status(201).json({
            success:true,
            message: "Successfully retrieve all parents",
            data: await ParentService.getAllParents()
        });
    } catch (error) {
      res.status(400).json({
      success: false,
      message: error.message,
    });

    }
};

export const getChildrenByParentId = async (req, res) => {
  try {
    const parentId = Number(req.params.parentId);

    const children = await ParentService.getChildrenByParentId(parentId);

    res.status(200).json({
      success: true,
      message: 'Children retrieved successfully',
      data: children,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};