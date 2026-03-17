
/**
 * دالة لحساب الرصيد الافتتاحي المعدل، صافي الحركة، والرصيد النهائي
 * @param {Object} account بيانات الحساب
 * @returns {Object} النتائج المحسوبة
 */
exports.calculateBalances = (account) => {
    // 1. Adjusted Beginning Balance
    const begDebit = Number(account.beginningDebit) + Number(account.beginningDebitAdjustment || 0);
    const begCredit = Number(account.beginningCredit) + Number(account.beginningCreditAdjustment || 0);
    const adjustedBeginningBalance = begDebit - begCredit;
  
    // 2. Net Movement
    const movDebit = Number(account.debitMovement) + Number(account.debitMovementAdjustment || 0);
    const movCredit = Number(account.creditMovement) + Number(account.creditMovementAdjustment || 0);
    const netMovement = movDebit - movCredit;
  
    // 3. Final Balance (حسب معادلات الدكيومنتيشن حرفياً)
    const finalBalance = adjustedBeginningBalance - netMovement;
  
    // 4. Balance Type Logic
    let balanceType = "BALANCED";
    if (finalBalance > 0) balanceType = "DEBIT";
    else if (finalBalance < 0) balanceType = "CREDIT";
  
    return {
      adjustedBeginningBalance,
      netMovement,
      finalBalance,
      balanceType
    };
  };
  