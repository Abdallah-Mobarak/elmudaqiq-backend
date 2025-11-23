const multer = require("multer");

const storage = multer.memoryStorage(); 
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only Excel (.xlsx) files are allowed"), false);
  }
};

module.exports = multer({ storage, fileFilter });
