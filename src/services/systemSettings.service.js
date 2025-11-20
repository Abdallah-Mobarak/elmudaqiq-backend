const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = {
  getSettings: async () => {
    const settings = await prisma.systemSettings.findFirst();
    return settings;
  },

  updateSettings: async (data) => {
    // لو مفيش row — نعمل واحد
    const existing = await prisma.systemSettings.findFirst();

    if (!existing) {
      return prisma.systemSettings.create({ data });
    }

    return prisma.systemSettings.update({
      where: { id: existing.id },
      data,
    });
  }
};
