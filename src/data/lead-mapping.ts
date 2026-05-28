export function mapLead(row: Record<string, any>) {
  return {
    id: row.id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    city: row.city || undefined,
    address: row.address || undefined,
    neighborhood: row.neighborhood || undefined,
    productName: row.product_name || "AlphaSin",
    temperature: row.temperature,
    contactStatus: row.contact_status,
    priority: row.priority,
    sellerName: row.seller_name,
    nextAction: row.next_action || undefined,
    nextActionAt: row.next_action_at || undefined,
    lastContactAt: row.last_contact_at || undefined,
    estimatedValue: Number(row.estimated_value ?? 0),
    source: row.source || undefined,
    notes: row.notes || undefined,
    objections: row.objections || undefined,
    followUpHistory: row.follow_up_history || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
