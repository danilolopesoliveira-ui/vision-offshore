"use client";

import { Switch } from "@/components/ui/switch";
import { useTransition } from "react";

interface Props {
  id: string;
  active: boolean;
  toggleAction: (id: string, active: boolean) => Promise<void>;
}

export function CountryToggle({ id, active, toggleAction }: Props) {
  const [isPending, startTransition] = useTransition();

  return (
    <Switch
      checked={active}
      disabled={isPending}
      onCheckedChange={(checked) =>
        startTransition(async () => { await toggleAction(id, checked); })
      }
    />
  );
}
