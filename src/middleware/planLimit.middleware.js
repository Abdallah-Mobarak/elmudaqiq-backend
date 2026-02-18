const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Middleware to enforce plan limits
 * @param {string} resource - 'users' | 'branches' | 'files'
 */
const checkPlanLimit = (resource) => async (req, res, next) => {
  try {
    // 1. Check if user is a subscriber
    const subscriberId = req.user?.subscriberId;
    
    // If admin or no subscriberId, skip check
    if (!subscriberId) {
      return next();
    }

    // 2. Get Active Subscription
    const subscription = await prisma.subscription.findFirst({
      where: { 
        subscriberId: Number(subscriberId),
        status: "ACTIVE" 
      },
      include: { plan: true }
    });

    if (!subscription) {
      return res.status(403).json({ 
        success: false, 
        message: "Action denied. No active subscription found." 
      });
    }

    const plan = subscription.plan;
    let currentCount = 0;
    let limit = 0;

    // 3. Check Limits based on resource type
    switch (resource) {
      case "users":
        currentCount = await prisma.user.count({ 
          where: { subscriberId: Number(subscriberId) } 
        });
        limit = plan.usersLimit;
        break;

      // TODO: Add cases for 'branches' and 'files' when their tables are ready
      case "branches":
        limit = plan.branchesLimit; 
        // currentCount = await prisma.branch.count(...)
        break;
        
      default:
        return next();
    }

    // 4. Enforce Limit
    // If limit is 0 or -1, it might mean unlimited (depending on your logic), here we assume > 0 is a limit
    if (limit > 0 && currentCount >= limit) {
      return res.status(403).json({
        success: false,
        message: `Plan limit reached for ${resource}. Your limit is ${limit}. Please upgrade your plan.`
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = checkPlanLimit;
