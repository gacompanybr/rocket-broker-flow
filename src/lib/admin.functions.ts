import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type NewUserInput = {
  email: string;
  password: string;
  nome: string;
  role: "admin" | "owner" | "broker";
  brokerId?: string | null;
};

export const createAppUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: NewUserInput) => {
    if (!input?.email?.includes("@")) throw new Error("E-mail inválido");
    if (!input?.password || input.password.length < 6)
      throw new Error("Senha deve ter ao menos 6 caracteres");
    if (!input?.nome?.trim()) throw new Error("Nome obrigatório");
    if (!["admin", "owner", "broker"].includes(input.role)) throw new Error("Papel inválido");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("is_admin");
    if (roleError) throw new Error(roleError.message);
    if (!isAdmin) throw new Error("Apenas administradores podem criar usuários");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nome: data.nome },
    });
    if (error) throw new Error(error.message);
    const userId = created.user?.id;
    if (!userId) throw new Error("Falha ao criar usuário");

    await supabaseAdmin.from("profiles").upsert({ id: userId, nome: data.nome });
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    const { error: rErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: data.role });
    if (rErr) throw new Error(rErr.message);

    if (data.role === "broker" && data.brokerId) {
      await supabaseAdmin.from("brokers").update({ profile_id: userId }).eq("id", data.brokerId);
    }

    return { id: userId };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; role: "admin" | "owner" | "broker" }) => {
    if (!input?.userId) throw new Error("Usuário inválido");
    if (!["admin", "owner", "broker"].includes(input.role)) throw new Error("Papel inválido");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("is_admin");
    if (roleError) throw new Error(roleError.message);
    if (!isAdmin) throw new Error("Apenas administradores podem alterar papéis");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
