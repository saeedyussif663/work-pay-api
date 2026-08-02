export function calculateExpectedCompletionDate(
  amountRemaining: number,
  weeklyAmount: number,
): Date | null {
  if (amountRemaining <= 0) return null;

  const weeksRemaining = Math.ceil(amountRemaining / weeklyAmount);
  const expectedCompletionDate = new Date();
  expectedCompletionDate.setDate(
    expectedCompletionDate.getDate() + weeksRemaining * 7,
  );

  return expectedCompletionDate;
}
