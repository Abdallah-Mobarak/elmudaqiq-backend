const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = {
  createWebsite: async ({ name, url, category, notes }) => {
    if (!name || !name.toString().trim()) {
      throw { customMessage: "Website name is required", status: 400 };
    }
    if (!url || !url.toString().trim()) {
      throw { customMessage: "Website URL is required", status: 400 };
    }

    const website = await prisma.authorityWebsite.create({
      data: {
        name: name.trim(),
        url: url.trim(),
        category: category || null,
        notes: notes || null
      }
    });

    return { message: "Website created", website };
  },

  getAllWebsites: async () => {
    return prisma.authorityWebsite.findMany();
  },

  updateWebsite: async (id, { name, url, category, notes, isActive }) => {
    id = Number(id);

    const website = await prisma.authorityWebsite.findUnique({ where: { id } });

    if (!website) {
      throw { customMessage: "Website not found", status: 404 };
    }

    const updated = await prisma.authorityWebsite.update({
      where: { id },
      data: {
        name: name?.trim(),
        url: url?.trim(),
        category,
        notes,
        isActive
      }
    });

    return { message: "Website updated", updated };
  },

  deleteWebsite: async (id) => {
    id = Number(id);

    const website = await prisma.authorityWebsite.findUnique({ where: { id } });
    if (!website) {
      throw { customMessage: "Website not found", status: 404 };
    }

    await prisma.authorityWebsite.delete({ where: { id } });

    return { message: "Website deleted" };
  }
};
