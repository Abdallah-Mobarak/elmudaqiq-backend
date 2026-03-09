const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure the uploads directory for contracts exists
const uploadDir = path.join(__dirname, "../../uploads/contracts");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + extension);
  },
});

const fileFilter = (req, file, cb) => {
  // Accept PDFs, documents, and images, which are common for contracts and logos
  if (file.mimetype.startsWith("application/pdf") || file.mimetype.startsWith("image/") || file.mimetype === "application/msword" || file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only PDF, DOC, DOCX, and images are allowed."), false);
  }
}; 

const upload = multer({ storage, fileFilter, limits: { fileSize: 1024 * 1024 * 10 } }); // 10MB limit

module.exports = upload;