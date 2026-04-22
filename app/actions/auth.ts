"use server";

import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const LoginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter ao menos 6 caracteres"),
});

const SignupSchema = z.object({
  code: z.string().min(1, "Código obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Senha deve ter ao menos 8 caracteres"),
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
});

type ActionResult = { success: false; error: string } | { success: true };

export async function loginAction(formData: FormData): Promise<ActionResult> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { success: false, error: "E-mail ou senha incorretos." };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signupAction(formData: FormData): Promise<ActionResult> {
  const parsed = SignupSchema.safeParse({
    code: formData.get("code"),
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const { code, email, password, name } = parsed.data;

  // Validate access code
  const accessCode = await prisma.accessCode.findUnique({ where: { code } });

  if (!accessCode) return { success: false, error: "Código de acesso inválido." };
  if (accessCode.usedBy) return { success: false, error: "Código de acesso já utilizado." };
  if (accessCode.expiresAt < new Date()) return { success: false, error: "Código de acesso expirado." };

  // Check if email already exists in our DB
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { success: false, error: "Este e-mail já está cadastrado." };

  // Create Supabase Auth user
  const admin = createSupabaseAdminClient();
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role: accessCode.intendedRole },
  });

  if (authError || !authData.user) {
    return { success: false, error: authError?.message ?? "Erro ao criar usuário." };
  }

  // Create DB user + mark code as used in a transaction
  const dbUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        name,
        role: accessCode.intendedRole,
        supabaseUserId: authData.user.id,
      },
    });

    await tx.accessCode.update({
      where: { id: accessCode.id },
      data: { usedBy: user.id, usedAt: new Date() },
    });

    return user;
  });

  await logAudit({
    userId: dbUser.id,
    entityType: "User",
    entityId: dbUser.id,
    action: "SIGNUP",
    diff: { role: accessCode.intendedRole, codeId: accessCode.id },
  });

  // Sign in right after signup
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signInWithPassword({ email, password });

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
