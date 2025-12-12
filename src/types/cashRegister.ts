export interface CashRegister {
  id: string;
  date: string;
  status: "open" | "closed";
  opening_amount: string;
  closing_amount: string;
  expected_amount: string;
  difference_amount: string;
  cash_sales: string;
  cash_returns: string;
  opened_at: string;
  closed_at: string;
  opened_user_id: string;
  closed_user_id: string;
  notes: string;
}

export type CashRegisterStatus = "open" | "closed";
