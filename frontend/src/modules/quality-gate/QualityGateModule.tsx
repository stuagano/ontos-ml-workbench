/**
 * Quality Gate Module Component
 *
 * Wraps QualityGatePanel for the module system
 */

import type { ModuleComponentProps } from "../types";
import { QualityGatePanel } from "../../components/QualityGatePanel";

export default function QualityGateModule({
  context,
}: ModuleComponentProps) {
  const collectionId = (context.trainingSheetId as string) || "";

  if (!collectionId) {
    return (
      <div className="p-8 text-center text-db-gray-500">
        Select a training sheet to run quality gate checks.
      </div>
    );
  }

  return <QualityGatePanel collectionId={collectionId} />;
}
