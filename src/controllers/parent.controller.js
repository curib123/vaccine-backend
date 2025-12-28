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