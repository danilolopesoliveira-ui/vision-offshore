"use client";

import { useActionState, useState } from "react";
import { loginAction, signupAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Loader2 } from "lucide-react";

type State = { success: false; error: string } | { success: true } | null;

function PasswordInput({ name, id, placeholder, autoComplete }: {
  name: string;
  id: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        tabIndex={-1}
        aria-label={show ? "Ocultar senha" : "Mostrar senha"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function SignupForm({ onSuccess }: { onSuccess: () => void }) {
  const [state, action, pending] = useActionState<State, FormData>(
    async (_prev, formData) => {
      const result = await signupAction(formData);
      if (result.success) onSuccess();
      return result;
    },
    null
  );

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="signup-code">Código de acesso</Label>
        <Input
          id="signup-code"
          name="code"
          placeholder="Ex.: GENNESYS-XXXX"
          required
          autoFocus
        />
      </div>

      <Separator />

      <div className="space-y-1.5">
        <Label htmlFor="signup-name">Nome completo</Label>
        <Input id="signup-name" name="name" placeholder="Seu nome" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="signup-email">E-mail</Label>
        <Input
          id="signup-email"
          name="email"
          type="email"
          placeholder="voce@gennesys.com.br"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="signup-password">Senha</Label>
        <PasswordInput
          id="signup-password"
          name="password"
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
        />
      </div>

      {state && !state.success && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Criar conta
      </Button>
    </form>
  );
}

export function LoginForm() {
  const [open, setOpen] = useState(false);
  const [loginState, loginAction_, loginPending] = useActionState<State, FormData>(
    async (_prev, formData) => loginAction(formData),
    null
  );

  return (
    <div className="space-y-6">
      <form action={loginAction_} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="voce@gennesys.com.br"
            autoComplete="email"
            required
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Senha</Label>
          <PasswordInput
            id="password"
            name="password"
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>

        {loginState && !loginState.success && (
          <p className="text-sm text-destructive">{loginState.error}</p>
        )}

        <Button type="submit" disabled={loginPending} className="w-full">
          {loginPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Entrar
        </Button>
      </form>

      <div className="text-center text-sm text-muted-foreground">
        Não tem conta?{" "}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button className="underline underline-offset-4 hover:text-foreground transition-colors">
              Use seu código de acesso
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Criar conta</DialogTitle>
              <DialogDescription>
                Use o código de acesso fornecido pela equipe Gennesys para criar sua conta.
              </DialogDescription>
            </DialogHeader>
            <SignupForm onSuccess={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
