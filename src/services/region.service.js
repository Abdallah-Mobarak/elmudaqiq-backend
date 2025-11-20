const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = {

  createRegion: async (name, cityId) => {
    if (!name || !name.toString().trim()) {
      throw { customMessage: "Region name is required", status: 400 };
    }

    if (!cityId) {
      throw { customMessage: "cityId is required", status: 400 };
    }

    // Check if parent city exists
    const city = await prisma.city.findUnique({
      where: { id: Number(cityId) }
    });

    if (!city) {
      throw { customMessage: "Parent City not found", status: 404 };
    }

    const region = await prisma.region.create({
      data: {
        name: name.trim(),
        cityId: Number(cityId)
      }
    });

    return { message: "Region created", region };
  },

  getAllRegions: async () => {
    return prisma.region.findMany({
      include: { city: true }
    });
  },

  updateRegion: async (id, name, cityId) => {
    id = Number(id);
    cityId = Number(cityId);

    if (!name || !name.toString().trim()) {
      throw { customMessage: "Region name is required", status: 400 };
    }

    if (!cityId) {
      throw { customMessage: "cityId is required", status: 400 };
    }

    const region = await prisma.region.findUnique({ where: { id } });

    if (!region) {
      throw { customMessage: "Region not found", status: 404 };
    }

    const city = await prisma.city.findUnique({
      where: { id: cityId }
    });

    if (!city) {
      throw { customMessage: "Parent City not found", status: 404 };
    }

    const updated = await prisma.region.update({
      where: { id },
      data: {
        name: name.trim(),
        cityId
      }
    });

    return { message: "Region updated", updated };
  },

  deleteRegion: async (id) => {
    id = Number(id);

    const region = await prisma.region.findUnique({ where: { id } });
    if (!region) {
      throw { customMessage: "Region not found", status: 404 };
    }

    await prisma.region.delete({ where: { id } });

    return { message: "Region deleted" };
  }
};
 