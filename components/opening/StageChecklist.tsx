"use client";

import { useTransition, useOptimistic } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toggleChecklistItemAction } from "@/app/actions/opening";
import type { ChecklistItem } from "@/app/actions/opening";

interface Props {
  processId: string;
  stage: 1 | 2 | 3 | 4;
  items: ChecklistItem[];
}

export function StageChecklist({ processId, stage, items }: Props) {
  const [optimisticItems, updateOptimistic] = useOptimistic(
    items,
    (prev, { index, checked }: { index: number; checked: boolean }) =>
      prev.map((item, i) => (i === index ? { ...item, checked } : item))
  );
  const [, startTransition] = useTransition();

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Nenhum item de checklist para esta etapa.
      </p>
    );
  }

  const done = optimisticItems.filter((i) => i.checked).length;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {done}/{optimisticItems.length} concluído{done !== 1 ? "s" : ""}
      </p>
      <div className="space-y-2">
        {optimisticItems.map((item, index) => (
          <div key={index} className="flex items-start gap-3">
            <Checkbox
              id={`item-${stage}-${index}`}
              checked={item.checked}
              onCheckedChange={(checked) => {
                const next = checked === true;
                startTransition(async () => {
                  updateOptimistic({ index, checked: next });
                  await toggleChecklistItemAction(processId, stage, index, next);
                });
              }}
            />
            <Label
              htmlFor={`item-${stage}-${index}`}
              className={`cursor-pointer leading-snug ${item.checked ? "line-through text-muted-foreground" : ""}`}
            >
              {item.label}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}
