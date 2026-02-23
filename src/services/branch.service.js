const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcryptjs");
const generatePassword = require("../utils/passwordGenerator");
const { sendSubscriberWelcomeEmail } = require("./email.service");
const { ROLES } = require("../config/roles");

module.exports = {
  // ===============================
  // Create Branch
  // ===============================
  create: async (subscriberId, data) => {
    // 1. Check Branch Limit
    const subscriber = await prisma.subscriber.findUnique({
      where: { id: Number(subscriberId) },
      include: {
        subscriptions: {
          where: { status: "ACTIVE" },
          include: { plan: true }
        },
        branches: true
      }
    });

    const activePlan = subscriber.subscriptions[0]?.plan;
    if (!activePlan) throw { status: 400, customMessage: "No active subscription found." };

    if (subscriber.branches.length >= activePlan.branchesLimit) {
      throw { status: 403, customMessage: "Branch limit reached. Upgrade your plan." };
    }

    // 2. Validate Manager Email
    const existingUser = await prisma.user.findFirst({
      where: { 
        email: data.managerEmail,
        subscriberId: Number(subscriberId) 
      }
    });
    if (existingUser) throw { status: 400, customMessage: "User with this email already exists in your organization." };

    // 3. Transaction: Create Branch & Manager User
    return await prisma.$transaction(async (tx) => {
      // A. Create Branch
      const branch = await tx.branch.create({
        data: {
          name: data.name,
          cityId: Number(data.cityId),
          subscriberId: Number(subscriberId),
          status: "ACTIVE"
        }
      });

      // B. Find or Create Branch Manager Role
      let managerRole = await tx.role.findUnique({ where: { name: ROLES.BRANCH_MANAGER } });
      if (!managerRole) {
          // Fallback if not seeded
          managerRole = await tx.role.create({ data: { name: ROLES.BRANCH_MANAGER } });
      }

      // C. Create Manager User
      const tempPassword = generatePassword(10);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      const manager = await tx.user.create({
        data: {
          fullName: data.managerName,
          email: data.managerEmail,
          password: hashedPassword,
          phone: data.managerPhone,
          jobTitle: "Branch Manager",
          roleId: managerRole.id,
          subscriberId: Number(subscriberId),
          managedBranch: {
              connect: { id: branch.id }
          },
          branchId: branch.id,
          startDate: data.startDate ? new Date(data.startDate) : new Date(),
          status: "active",
          mustChangePassword: true
        }
      });

      // D. Send Invite Email (Temp Password approach for now)
      try {
          const loginUrl = `http://${subscriber.subdomain}.almudaqiq.com`; 
          await sendSubscriberWelcomeEmail({
              to: data.managerEmail,
              loginUrl,
              email: data.managerEmail,
              tempPassword
          });
      } catch (e) {
          console.error("Failed to send branch manager email", e);
      }

      return { branch, manager };
    });
  },

  // ===============================
  // Get All Branches
  // ===============================
  getAll: async (subscriberId, query) => {
    const { page = 1, limit = 10, search, cityId, status } = query;
    
    const where = { subscriberId: Number(subscriberId) };
  //   // --- التعديل الجديد: Data Scoping ---
  // // لو المستخدم مدير فرع، اجبره يشوف فرعه بس
  // if (user.role === ROLES.BRANCH_MANAGER) {
  //   // لازم نكون متأكدين إننا جبنا managedBranchId في التوكن أو نستعلم عنه
  //   // الأفضل: الاستعلام عنه هنا لضمان الدقة
  //   const userWithBranch = await prisma.user.findUnique({
  //       where: { id: user.id },
  //       include: { managedBranch: true }
  //   });
    
  //   if (userWithBranch?.managedBranch) {
  //       where.id = userWithBranch.managedBranch.id;
  //   } else {
  //       // لو هو مدير فرع بس مش ماسك فرع فعلياً، ما يشوفش حاجة
  //       return { data: [], total: 0, page, limit };
  //   }
  // }
    // ------------------------------------
 
 
    if (status) where.status = status;
    if (cityId) where.cityId = Number(cityId);
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { manager: { fullName: { contains: search } } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [branches, total] = await Promise.all([
      prisma.branch.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          city: { include: { country: true } }, // To get country links
          manager: {
              select: { id: true, fullName: true, email: true, phone: true, jobTitle: true, startDate: true }
          }
        }
      }),
      prisma.branch.count({ where })
    ]);

    // Transform data to include Country Links dynamically
    const data = branches.map(b => ({
      id: b.id,
      name: b.name,
      status: b.status,
      city: b.city.name,
      manager: b.manager,
      externalLinks: {
          cpa: b.city.country.cpaWebsite,
          commerce: b.city.country.commerceWebsite,
          tax: b.city.country.taxWebsite
      },
      createdAt: b.createdAt
    }));

    return { data, total, page: Number(page), limit: Number(limit) };
  },

  // ===============================
  // Update Branch
  // ===============================
  update: async (subscriberId, branchId, data) => {
      const branch = await prisma.branch.findFirst({
          where: { id: Number(branchId), subscriberId: Number(subscriberId) }
      });
      if (!branch) throw { status: 404, customMessage: "Branch not found" };

      const updateData = {};
      if (data.name) updateData.name = data.name;
      if (data.cityId) updateData.cityId = Number(data.cityId);
      if (data.status) updateData.status = data.status;

      // If updating manager details
      if (data.managerName || data.managerPhone) {
          if (branch.managerId) {
            await prisma.user.update({
                where: { id: branch.managerId },
                data: {
                    fullName: data.managerName,
                    phone: data.managerPhone
                }
            });
          }
      }

      const updatedBranch = await prisma.branch.update({
          where: { id: Number(branchId) },
          data: updateData,
          include: { city: { include: { country: true } } }
      });

      return updatedBranch;
  }
};
