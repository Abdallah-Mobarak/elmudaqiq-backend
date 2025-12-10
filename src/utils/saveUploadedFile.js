const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = async ({ file, source = "system" }) => {
  if (!file) return;

  return prisma.uploadedFile.create({
    data: {
      name: file.originalname,
      path: file.path,
      size: file.size,
      type: file.mimetype,
      source
    }
  });
};
