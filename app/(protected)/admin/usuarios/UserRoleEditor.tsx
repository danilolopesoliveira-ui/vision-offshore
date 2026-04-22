"use client";

import { useActionState } from "react";
import { updateUserRoleAction } from "@/app/actions/admin";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { UserRole } from "@prisma/client";

type State = { success: false; error: string } | { success: true; data: void } | null;

interface Props {
  userId: string;
  currentRole: UserRole;
}

export function UserRoleEditor({ userId, currentRole }: Props) {
  const [state, formAction, pending] = useActionState<State, FormData>(
    (_p, fd) => updateUserRoleAction(userId, fd),
    null
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <Select name="role" defaultValue={currentRole}>
        <SelectTrigger className="h-8 w-32 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="OPERATOR">Operador</SelectItem>
          <SelectItem value="ADMIN">Admin</SelectItem>
          <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
        </SelectContent>
      </Select>
      <Button type="submit" size="sm" variant="ghost" disabled={pending} className="h-8 px-2">
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "OK"}
      </Button>
      {state && !state.success && <span className="text-xs text-destructive">{state.error}</span>}
    </form>
  );
}
