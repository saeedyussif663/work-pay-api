export function calculateExpectedCompletionDate(
  amountRemaining: number,
  weeklyAmount: number,
  from: Date = new Date(),
): Date | null {
  if (amountRemaining <= 0) return null;
  if (weeklyAmount <= 0) return null;

  const paymentsRemaining = Math.ceil(amountRemaining / weeklyAmount);

  const result = new Date(from.getTime());
  result.setDate(result.getDate() + paymentsRemaining * 7);

  return result;
}

export type VehicleStatus = 'On track' | 'Behind' | 'Completed';

export interface CompletionProjection {
  totalPaid: number;
  amountRemaining: number;
  projectedCompletionDate: Date | null;
  status: VehicleStatus;
}

/**
 * Derives live progress (totalPaid, amountRemaining, projectedCompletionDate,
 * status) for a vehicle from its logged payments. Never stored — recomputed
 * on every read so it can't go stale relative to the payments it summarizes.
 *
 * projectedCompletionDate uses the *contracted* weeklyAmount, anchored at
 * today, applied against whatever the remaining balance actually is right
 * now — not an inferred pace from payment history. A single early or
 * oversized payment shouldn't be read as "this is the rider's proven speed."
 */
export function calculateCompletionProjection(
  vehicle: {
    expectedReturn: number;
    weeklyAmount: number;
    expectedCompletionDate: Date | null;
  },
  payments: { amount: number | string }[],
): CompletionProjection {
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const amountRemaining = vehicle.expectedReturn - totalPaid;

  if (amountRemaining <= 0) {
    return {
      totalPaid,
      amountRemaining: 0,
      projectedCompletionDate: null,
      status: 'Completed',
    };
  }

  if (totalPaid <= 0) {
    return {
      totalPaid,
      amountRemaining,
      projectedCompletionDate: vehicle.expectedCompletionDate,
      status: 'On track',
    };
  }

  const projectedCompletionDate = calculateExpectedCompletionDate(
    amountRemaining,
    vehicle.weeklyAmount,
  );

  const status: VehicleStatus =
    vehicle.expectedCompletionDate &&
    projectedCompletionDate &&
    projectedCompletionDate.getTime() > vehicle.expectedCompletionDate.getTime()
      ? 'Behind'
      : 'On track';

  return { totalPaid, amountRemaining, projectedCompletionDate, status };
}
