export const FINANCE_WIZARD_STEP_COUNT = 7;

export const FINANCE_WIZARD_LIVING_BUDGET_STEP = 3;

export function getNextFinanceWizardStep(
  current: number,
  options: { skipLivingBudget: boolean },
): number {
  let next = Math.min(current + 1, FINANCE_WIZARD_STEP_COUNT - 1);
  if (
    options.skipLivingBudget &&
    next === FINANCE_WIZARD_LIVING_BUDGET_STEP &&
    current < FINANCE_WIZARD_LIVING_BUDGET_STEP
  ) {
    next = FINANCE_WIZARD_LIVING_BUDGET_STEP + 1;
  }
  return next;
}

export function getPreviousFinanceWizardStep(
  current: number,
  options: { skipLivingBudget: boolean },
): number {
  let previous = Math.max(current - 1, 0);
  if (
    options.skipLivingBudget &&
    previous === FINANCE_WIZARD_LIVING_BUDGET_STEP &&
    current > FINANCE_WIZARD_LIVING_BUDGET_STEP
  ) {
    previous = FINANCE_WIZARD_LIVING_BUDGET_STEP - 1;
  }
  return previous;
}
