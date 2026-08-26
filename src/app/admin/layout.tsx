import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireCompanyAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const auth = await requireCompanyAdmin();
  if ("error" in auth) redirect("/sales");

  return children;
}
