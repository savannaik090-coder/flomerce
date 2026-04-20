const PLAN_HIERARCHY = ['free', 'starter', 'growth', 'pro', 'enterprise'];

export function normalizePlan(plan) {
  if (!plan) return 'free';
  const p = String(plan).toLowerCase();
  if (p.includes('enterprise')) return 'enterprise';
  if (p.includes('pro')) return 'pro';
  if (p.includes('growth') || p.includes('standard')) return 'growth';
  if (p.includes('starter') || p.includes('basic')) return 'starter';
  if (p === 'trial') return 'trial';
  return 'free';
}

export function isPlanAtLeast(currentPlan, requiredPlan) {
  const current = normalizePlan(currentPlan);
  if (current === 'trial') return true;
  const required = normalizePlan(requiredPlan);
  return PLAN_HIERARCHY.indexOf(current) >= PLAN_HIERARCHY.indexOf(required);
}
