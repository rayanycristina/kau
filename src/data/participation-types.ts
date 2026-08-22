export type CoproducerStatus = "active" | "inactive";
export type CoproducerRole = "coproducer" | "partner" | "producer";
export type ParticipationCalculationType = "percent" | "fixed";
export type ParticipationStatus = "pending" | "paid" | "cancelled";

export type Coproducer = { id: string; name: string; status: CoproducerStatus; email?: string; phone?: string; notes?: string; createdAt?: string; updatedAt?: string };
export type ProductCoproducerRule = { id: string; productId: string; coproducerId: string; coproducer?: Coproducer; role: CoproducerRole; calculationType: ParticipationCalculationType; calculationBasis: "operation_revenue"; percent?: number; fixedAmount?: number; effectiveFrom: string; effectiveTo?: string; status: "active" | "ended"; createdAt?: string };
export type SaleCoproducerObligation = { id: string; saleId: string; productId: string; coproducerId: string; ruleId: string; coproducerName: string; role: CoproducerRole; calculationType: ParticipationCalculationType; calculationBasis: "operation_revenue"; basisAmount: number; percent?: number; fixedAmount?: number; amount: number; status: ParticipationStatus; paidAt?: string; expenseId?: string; createdAt?: string; sale: { customerName: string; productName: string; saleDate: string; deletedAt?: string } };
