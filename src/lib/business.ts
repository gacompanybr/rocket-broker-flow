export type BcStatus =
  | "running"
  | "near_limit"
  | "exhausted"
  | "over_budget"
  | "finished_early"
  | "completed";

export const STATUS_LABEL: Record<string, string> = {
  running: "Em veiculação",
  near_limit: "Próximo do limite",
  exhausted: "Orçamento esgotado",
  over_budget: "Orçamento estourado",
  finished_early: "Finalizada antecipadamente",
  completed: "Concluída",
  active: "Ativa",
  paused: "Pausada",
  finished: "Finalizada",
};

export const ALERT_LABEL: Record<string, string> = {
  near_limit: "Orçamento próximo de acabar",
  exhausted: "Orçamento acabou",
  over_budget: "Orçamento estourou",
};

/** Status derivado do gasto real vs orçamento total (matching 1:1). */
export function budgetStatus(spent: number, totalBudget: number, threshold = 80): BcStatus {
  if (totalBudget <= 0) return "running";
  const ratio = (spent / totalBudget) * 100;
  if (ratio > 100) return "over_budget";
  if (ratio >= 100) return "exhausted";
  if (ratio >= threshold) return "near_limit";
  return "running";
}

export function budgetTone(ratio: number): "success" | "warning" | "destructive" {
  if (ratio >= 100) return "destructive";
  if (ratio >= 80) return "warning";
  return "success";
}

export type Settlement = {
  total_spent: number;
  broker_share_spent: number;
  agency_share_spent: number;
  refund_to_broker: number;
  refund_to_agency: number;
};

/** Acerto de finalização: gasto dividido 50/50 entre corretor e imobiliária. */
export function calcSettlement(
  totalSpent: number,
  brokerDeposit: number,
  agencyMatch: number,
): Settlement {
  const round = (v: number) => Math.round(v * 100) / 100;
  const half = round(totalSpent / 2);
  return {
    total_spent: round(totalSpent),
    broker_share_spent: half,
    agency_share_spent: round(totalSpent - half),
    refund_to_broker: round(brokerDeposit - half),
    refund_to_agency: round(agencyMatch - (totalSpent - half)),
  };
}
