const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = {

  // -------------------------
  // CREATE COUNTRY
  // -------------------------
  createCountry: async ({ 
    name, 
    cpaWebsite, 
    commerceWebsite, 
    taxWebsite 
  }) => {

    if (!name || !name.toString().trim()) {
      throw { customMessage: "Country name is required", status: 400 };
    }

    const country = await prisma.country.create({
      data: { 
        name: name.trim(),
        cpaWebsite: cpaWebsite || null,
        commerceWebsite: commerceWebsite || null,
        taxWebsite: taxWebsite || null
      }
    });

    return { message: "Country created", country };
  },


  // -------------------------
  // GET ALL COUNTRIES
  // -------------------------
  getAllCountries: async () => {
    return prisma.country.findMany({
      include: {
        cities: true
      }
    });
  },


  // -------------------------
  // UPDATE COUNTRY
  // -------------------------
  updateCountry: async (id, { 
    name, 
    cpaWebsite, 
    commerceWebsite, 
    taxWebsite 
  }) => {

    if (!name || !name.toString().trim()) {
      throw { customMessage: "Country name is required", status: 400 };
    }

    const updated = await prisma.country.update({
      where: { id: Number(id) },
      data: { 
        name: name.trim(),
        cpaWebsite: cpaWebsite || null,
        commerceWebsite: commerceWebsite || null,
        taxWebsite: taxWebsite || null
      }
    });

    return { message: "Country updated", updated };
  },


  // -------------------------
  // DELETE COUNTRY
  // -------------------------
  deleteCountry: async (id) => {

    id = Number(id);

    const country = await prisma.country.findUnique({ where: { id } });
    if (!country) {
      throw { customMessage: "Country not found", status: 404 };
    }

    const city = await prisma.city.findFirst({ where: { countryId: id } });

    if (city) {
      throw { 
        customMessage: "Cannot delete country because cities exist", 
        status: 400 
      };
    }

    await prisma.country.delete({ where: { id } });

    return { message: "Country deleted" };
  }

};
