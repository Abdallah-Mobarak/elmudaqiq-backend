// d:\Test\ERP\el mudaqiq\src\services\user.service.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcryptjs");
const generatePassword = require("../utils/passwordGenerator");
const { sendSubscriberWelcomeEmail } = require("./email.service");
const { ROLES } = require("../config/roles");
const PERMISSIONS_CONFIG = require("../config/permissions");

// Helper: Validate Permissions Whitelist
const validatePermissions = (perms) => {
  if (!perms) return undefined;
  const validList = Object.values(PERMISSIONS_CONFIG);
  let permsArray = [];
  try {
    permsArray = typeof perms === 'string' ? JSON.parse(perms) : perms;
  } catch (e) { return undefined; }
  if (!Array.isArray(permsArray)) return undefined;
  return permsArray.filter(p => validList.includes(p));
};

module.exports = {
  // ===============================
  // Create User
  // ===============================
  create: async (subscriberId, data, file, currentUser) => {
    // 1. Check Plan Limits
    const subscriber = await prisma.subscriber.findUnique({
      where: { id: Number(subscriberId) },
      include: {
        subscriptions: { where: { status: "ACTIVE" }, include: { plan: true } },
        _count: { select: { users: true } }
      }
    });
    const activePlan = subscriber.subscriptions[0]?.plan;
    if (activePlan && subscriber._count.users >= activePlan.usersLimit) {
      throw { status: 403, customMessage: "User limit reached. Upgrade your plan." };
    }
 
    // 2. Validate Email Uniqueness (Scoped)
    const existingUser = await prisma.user.findFirst({
      where: { email: data.email, subscriberId: Number(subscriberId) }
    });
    if (existingUser) throw { status: 400, customMessage: "User with this email already exists in your organization." };

    // 3. Validate Role (Mandatory & Exists in DB)
    if (!data.roleId) throw { status: 400, customMessage: "Role is required." };
    const roleToAssign = await prisma.role.findUnique({ where: { id: Number(data.roleId) } });
    if (!roleToAssign) throw { status: 400, customMessage: "Invalid Role ID provided." };

    // 4. Prevent Privilege Escalation by Branch Manager
    if (currentUser.role === ROLES.BRANCH_MANAGER && roleToAssign.name === ROLES.SUBSCRIBER_OWNER) {
      throw { status: 403, customMessage: "Branch Managers cannot create users with the Owner role." };
    }

    // 5. Validate & Prepare Data
    const customPermissions = validatePermissions(data.permissions);
    const tempPassword = generatePassword(12);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);
    const profilePhoto = file ? file.path.replace(/\\/g, "/") : null;

    // 6. Create User
    const newUser = await prisma.user.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        password: hashedPassword,
        phone: data.mobile || data.phone,
        jobTitle: data.jobTitle,
        subscriberId: Number(subscriberId),
        branchId: data.branchId ? Number(data.branchId) : null,
        roleId: Number(data.roleId),
        status: data.status || "active",
        startDate: data.startDate ? new Date(data.startDate) : new Date(),
        employeeId: data.employeeId,
        language: data.language,
        timeZone: data.timeZone,
        workLocation: data.workLocation,
        emergencyContact: data.emergencyContact,
        emailSignature: data.emailSignature,
        assignedDevices: data.assignedDevices,
        recoveryEmail: data.recoveryEmail,
        recoveryPhone: data.recoveryPhone,
        suggestedUsername: data.suggestedUsername,
        profilePhoto: profilePhoto,
        permissions: customPermissions || undefined,
        mustChangePassword: true
      }
    });

    // 7. Send Activation Email
    try {
      // Construct dynamic URL based on environment
      const baseDomain = process.env.BASE_DOMAIN || "mudqiq.com";
      const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
      const loginUrl = `${protocol}://${subscriber.subdomain}.${baseDomain}`;

      await sendSubscriberWelcomeEmail({ to: data.email, loginUrl, email: data.email, tempPassword });
    } catch (e) { console.error("Failed to send user welcome email", e); }

    const { password, ...userResponse } = newUser;
    return { message: "User created successfully", user: userResponse };
  },

  // ===============================
  // Get All Users (With Scoping)
  // ===============================
  getAll: async (subscriberId, query, currentUser) => {
    const { page = 1, limit = 10, search, jobTitle, branchId, status, roleId } = query;
    const where = { subscriberId: Number(subscriberId) };

    // Scoping Logic
    if (currentUser.role === ROLES.BRANCH_MANAGER) {
      where.branchId = currentUser.branchId ? Number(currentUser.branchId) : 0;
    } else if (branchId) {
      where.branchId = Number(branchId);
    }

    if (status) where.status = status;
    if (jobTitle) where.jobTitle = jobTitle;
    if (roleId) where.roleId = Number(roleId);
    if (search) {
      where.OR = [
        { fullName: { contains: search } }, { email: { contains: search } },
        { jobTitle: { contains: search } }, { phone: { contains: search } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where, skip, take: Number(limit),
        include: { branch: { select: { id: true, name: true } }, Role: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" }
      }),
      prisma.user.count({ where })
    ]);

    const cleanedUsers = users.map(u => { const { password, ...rest } = u; return rest; });
    return { data: cleanedUsers, total, page: Number(page), limit: Number(limit) };
  },

  // ===============================
  // Get One User
  // ===============================
  getOne: async (subscriberId, userId) => {
    const user = await prisma.user.findFirst({
      where: { id: Number(userId), subscriberId: Number(subscriberId) },
      include: { Role: true, branch: true }
    });
    if (!user) throw { status: 404, customMessage: "User not found" };
    const { password, ...result } = user;
    return result;
  },
 
  // ===============================
  // Update User
  // ===============================
  update: async (subscriberId, userId, data, file, currentUser) => {
    const user = await prisma.user.findFirst({
      where: { id: Number(userId), subscriberId: Number(subscriberId) }
    });
    if (!user) throw { status: 404, customMessage: "User not found" };

    const updateData = {};
    const simpleFields = [
      'fullName', 'jobTitle', 'status', 'employeeId', 'language', 
      'timeZone', 'workLocation', 'emergencyContact',
      'emailSignature', 'assignedDevices', 'recoveryEmail', 'recoveryPhone', 'suggestedUsername'
    ];
    simpleFields.forEach(field => { if (data[field]) updateData[field] = data[field]; });
    if (data.mobile || data.phone) updateData.phone = data.mobile || data.phone;
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.branchId) updateData.branchId = Number(data.branchId);
    if (file) updateData.profilePhoto = file.path.replace(/\\/g, "/");

    // Role Update Logic with Security
    if (data.roleId) {
      const roleToAssign = await prisma.role.findUnique({ where: { id: Number(data.roleId) } });
      if (!roleToAssign) throw { status: 400, customMessage: "Invalid Role ID." };
      if (currentUser.role === ROLES.BRANCH_MANAGER && roleToAssign.name === ROLES.SUBSCRIBER_OWNER) {
        throw { status: 403, customMessage: "Branch Managers cannot assign the Owner role." };
      }
      updateData.roleId = Number(data.roleId);
    }

    // Permission Override Logic
    if (data.permissions !== undefined) {
      const validPerms = validatePermissions(data.permissions);
      updateData.permissions = validPerms || [];
    }

    const updatedUser = await prisma.user.update({
      where: { id: Number(userId) },
      data: updateData
    });

    const { password, ...result } = updatedUser;
    return result;
  }
};
