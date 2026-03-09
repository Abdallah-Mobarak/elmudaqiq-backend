const service = require("../services/contractReviewGuide.service");

module.exports = {
  /**
   * GET /engagement-contracts/:id/review-guides
   */
  getContractGuides: async (req, res, next) => {
    try {
      const guides = await service.getContractGuides(req.user, req.params.id);
      res.status(200).json({ data: guides });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /engagement-contracts/:id/pending-guides
   */
  getPendingGuides: async (req, res, next) => {
    try {
      const guides = await service.getPendingGuides(req.user, req.params.id);
      res.status(200).json({ data: guides });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PATCH /contract-review-guides/:id
   */
  updateGuideItem: async (req, res, next) => {
    try {
      const updatedItem = await service.updateGuideItem(req.user, req.params.id, req.body);
      res.status(200).json({ message: "Review guide updated successfully.", data: updatedItem });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /contract-review-guides/:id/documents
   */
  addDocument: async (req, res, next) => {
    try {
      const document = await service.addDocument(req.user, req.params.id, req.file);
      res.status(201).json({ message: "Document uploaded successfully.", data: document });
    } catch (error) {
      next(error);
    }
  },
};