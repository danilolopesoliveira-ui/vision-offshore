"use client";

import { useActionState, useState } from "react";
import { generateAccessCodeAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Copy, Check, Plus } from "lucide-react";

type State = { success: false; error: string } | { success: true; data: { code: string } } | null;

export function AccessCodeGenerator() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [state, formAction, pending] = useActionState<State, FormData>(
    (_p, fd) => generateAccessCodeAction(fd),
    null
  );

  function copyCode() {
    if (state?.success) {
      navigator.clipboard.writeText(state.data.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" />Gerar código de acesso</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Gerar código de acesso</DialogTitle>
        </DialogHeader>
        {state?.success ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Código gerado com sucesso. Compartilhe com o novo usuário.</p>
            <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-3">
              <span className="flex-1 font-mono text-sm font-bold tracking-wider">{state.data.code}</span>
              <button onClick={copyCode} className="text-muted-foreground hover:text-foreground transition-colors">
                {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <Button variant="outline" className="w-full" onClick={() => { setOpen(false); }}>Fechar</Button>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="intendedRole">Papel do usuário</Label>
              <Select name="intendedRole" defaultValue="OPERATOR">
                <SelectTrigger id="intendedRole"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPERATOR">Operador</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expiresInDays">Validade (dias)</Label>
              <Input id="expiresInDays" name="expiresInDays" type="number" min="1" max="365" defaultValue="30" />
            </div>
            {state && !state.success && <p className="text-sm text-destructive">{state.error}</p>}
            <Button type="submit" disabled={pending} className="w-full">
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Gerar código
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
