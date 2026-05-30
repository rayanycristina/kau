import { WorkbenchShell } from "@/shell/workbench-shell";
import { ConversationalPipelineScreen } from "@/modules/conversational-pipeline/conversational-pipeline-screen";

export default function Page() {
  return (
    <WorkbenchShell title="Conversational Pipeline" subtitle="Lista de leads, ficha individual e substituição do Sheets">
      <ConversationalPipelineScreen />
    </WorkbenchShell>
  );
}
