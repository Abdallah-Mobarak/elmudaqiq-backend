const complaintService = require("../services/complaint.service");

//  Create Complaint
exports.create = async (req, res, next) => {
  try {
    const data = await complaintService.create(req.body);
    res.status(201).json({
      message: "Complaint sent successfully",
      data,
    });
  } catch (err) {
    next(err);
  }
};

//  View Complaints List + Search & Filters
exports.getAll = async (req, res, next) => {
  try {
    const result = await complaintService.getAll(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

//  View My Complaints (Subscriber)
exports.getMyComplaints = async (req, res, next) => {
  try {
    // التحقق من أن المستخدم يمتلك صلاحية الـ Subscriber Owner الفعلي
    if (req.user.role !== "SUBSCRIBER_OWNER") {
      return res.status(403).json({ 
        message: "Access denied. Only the Subscriber Owner can view complaints." 
      });
    }

    const subscriberId = req.user.subscriberId;
    if (!subscriberId) {
      return res.status(400).json({ message: "Subscriber ID is missing from token." });
    }

    const result = await complaintService.getAll({ ...req.query, subscriberId });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

//  Respond To Complaint
exports.respond = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { response } = req.body;

    const result = await complaintService.respond(id, response);

    res.json({
      message: "Response sent successfully",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};


//  DELETE Complaint
exports.delete = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await complaintService.delete(id);

    res.json(result);
  } catch (err) {
    next(err);
  }
};
