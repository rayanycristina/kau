import { WorkbenchShell } from "@/shell/workbench-shell";
import { LeadArchiveScreen } from "@/modules/conversational-pipeline/lead-archive-screen";

export default async function LeadArchivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <WorkbenchShell title="Arquivo do Lead" subtitle="Ficha individual do lead AlphaSin">
      <LeadArchiveScreen leadId={id} />
    </WorkbenchShell>
  );
}
