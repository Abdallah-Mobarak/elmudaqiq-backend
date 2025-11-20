const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = {

  createCity: async (name, countryId) => {
    if (!name || !name.toString().trim()) {
      throw { customMessage: "City name is required", status: 400 };
    }

    if (!countryId) {
      throw { customMessage: "countryId is required", status: 400 };
    }

    // تأكد أن الـ Country موجود
    const country = await prisma.country.findUnique({
      where: { id: Number(countryId) }
    });

    if (!country) {
      throw { customMessage: "Parent Country not found", status: 404 };
    }

    const city = await prisma.city.create({
      data: {
        name: name.trim(),
        countryId: Number(countryId)
      }
    });

    return { message: "City created", city };
  },

  getAllCities: async () => {
    return prisma.city.findMany({
      include: { country: true }
    });
  },

  updateCity: async (id, name, countryId) => {
    id = Number(id);
    countryId = Number(countryId);

    if (!name || !name.toString().trim()) {
      throw { customMessage: "City name is required", status: 400 };
    }

    if (!countryId) {
      throw { customMessage: "countryId is required", status: 400 };
    }

    // تأكد أن الـ City موجود
    const city = await prisma.city.findUnique({ where: { id } });
    if (!city) {
      throw { customMessage: "City not found", status: 404 };
    }

    // تأكد أن parent country موجود
    const country = await prisma.country.findUnique({
      where: { id: countryId }
    });

    if (!country) {
      throw { customMessage: "Parent Country not found", status: 404 };
    }

    const updated = await prisma.city.update({
      where: { id },
      data: {
        name: name.trim(),
        countryId
      }
    });

    return { message: "City updated", updated };
  },

  deleteCity: async (id) => {
    id = Number(id);

    // Check exists
    const city = await prisma.city.findUnique({ where: { id } });

    if (!city) {
      throw { customMessage: "City not found", status: 404 };
    }

    // Check if this City has Regions
    const region = await prisma.region.findFirst({
      where: { cityId: id }
    });

    if (region) {
      throw { customMessage: "Cannot delete city because regions exist", status: 400 };
    }

    await prisma.city.delete({ where: { id } });

    return { message: "City deleted" };
  }
};
