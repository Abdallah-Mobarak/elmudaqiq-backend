/**
 * Supplementary financial-statement inputs that a trial balance cannot provide
 * (BuildSpec §5): zakat base components, actuarial assumptions, lease maturity
 * buckets, partners' share table, related-party names, PPE depreciation rates.
 *
 * Stored as one JSON row per engagement in `FsExtras` (app-managed, no FK — the
 * MySQL 5.7 FK collation quirk is avoided). Created on demand.
 */
const prisma = require("../../config/prisma");

let ensured = false;
async function ensureTable() {
  if (ensured) return;
  await prisma.$executeRawUnsafe(
    "CREATE TABLE IF NOT EXISTS `FsExtras` (" +
      "`contractId` VARCHAR(191) NOT NULL," +
      "`data` LONGTEXT NOT NULL," +
      "`updatedAt` DATETIME(3) NOT NULL," +
      "PRIMARY KEY (`contractId`)" +
      ") DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
  );
  ensured = true;
}

async function getExtras(contractId) {
  await ensureTable();
  const rows = await prisma.$queryRawUnsafe(
    "SELECT `data` FROM `FsExtras` WHERE `contractId` = ?",
    contractId
  );
  if (!rows || !rows.length) return {};
  try {
    return JSON.parse(rows[0].data) || {};
  } catch (_) {
    return {};
  }
}

async function setExtras(contractId, data) {
  await ensureTable();
  const json = JSON.stringify(data || {});
  await prisma.$executeRawUnsafe(
    "INSERT INTO `FsExtras` (`contractId`,`data`,`updatedAt`) VALUES (?,?,NOW(3)) " +
      "ON DUPLICATE KEY UPDATE `data` = VALUES(`data`), `updatedAt` = NOW(3)",
    contractId,
    json
  );
  return data;
}

module.exports = { getExtras, setExtras, ensureTable };
