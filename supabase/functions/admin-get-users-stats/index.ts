import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AdminUserRole = "super_admin" | "admin" | "employee";

type UserStats = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  status: "active" | "blocked" | "deleted";
  can_access_subscriptions: boolean;
  workspaces_count: number; // user is member of
  workspaces_owned: number; // created_by
  total_members_in_owned_workspaces: number;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: adminRow, error: adminError } = await supabaseAdmin
      .from("admin_users")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (adminError || !adminRow) {
      return new Response(
        JSON.stringify({ error: "Acesso negado. Apenas administradores podem usar esta função." }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body = (await req.json().catch(() => ({}))) as { search?: string };
    const search = (body.search ?? "").trim();

    let profilesQuery = supabaseAdmin
      .from("profiles")
      .select("id, full_name, avatar_url, created_at")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (search) {
      profilesQuery = profilesQuery.ilike("full_name", `%${search}%`);
    }

    const { data: profiles, error: profilesError } = await profilesQuery;
    if (profilesError) throw profilesError;

    const userIds = (profiles ?? []).map((p) => p.id);
    if (userIds.length === 0) {
      return new Response(JSON.stringify({ users: [] satisfies UserStats[] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: accountData, error: accountError } = await supabaseAdmin
      .from("user_account_management")
      .select("user_id, status, can_access_subscriptions")
      .in("user_id", userIds);

    if (accountError) throw accountError;

    const accountByUser = new Map<string, { status: UserStats["status"]; can_access_subscriptions: boolean }>();
    for (const a of accountData ?? []) {
      accountByUser.set(a.user_id, {
        status: (a.status as UserStats["status"]) ?? "active",
        can_access_subscriptions: !!a.can_access_subscriptions,
      });
    }

    const { data: ownedWorkspaces, error: ownedError } = await supabaseAdmin
      .from("workspaces")
      .select("id, created_by")
      .in("created_by", userIds);

    if (ownedError) throw ownedError;

    const ownedCountByUser = new Map<string, number>();
    const workspaceOwnerById = new Map<string, string>();
    for (const w of ownedWorkspaces ?? []) {
      ownedCountByUser.set(w.created_by, (ownedCountByUser.get(w.created_by) ?? 0) + 1);
      workspaceOwnerById.set(w.id, w.created_by);
    }

    const ownedWorkspaceIds = (ownedWorkspaces ?? []).map((w) => w.id);

    const membersInOwnedWorkspacesByOwner = new Map<string, Set<string>>();
    if (ownedWorkspaceIds.length > 0) {
      const { data: membersInOwned, error: membersOwnedError } = await supabaseAdmin
        .from("workspace_members")
        .select("workspace_id, user_id")
        .in("workspace_id", ownedWorkspaceIds);

      if (membersOwnedError) throw membersOwnedError;

      for (const m of membersInOwned ?? []) {
        const ownerId = workspaceOwnerById.get(m.workspace_id);
        if (!ownerId) continue;
        if (!membersInOwnedWorkspacesByOwner.has(ownerId)) {
          membersInOwnedWorkspacesByOwner.set(ownerId, new Set());
        }
        membersInOwnedWorkspacesByOwner.get(ownerId)!.add(m.user_id);
      }
    }

    const { data: memberOf, error: memberOfError } = await supabaseAdmin
      .from("workspace_members")
      .select("user_id, workspace_id")
      .in("user_id", userIds);

    if (memberOfError) throw memberOfError;

    const memberWorkspacesByUser = new Map<string, Set<string>>();
    for (const m of memberOf ?? []) {
      if (!memberWorkspacesByUser.has(m.user_id)) {
        memberWorkspacesByUser.set(m.user_id, new Set());
      }
      memberWorkspacesByUser.get(m.user_id)!.add(m.workspace_id);
    }

    const users: UserStats[] = (profiles ?? []).map((p) => {
      const account = accountByUser.get(p.id);
      return {
        id: p.id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        created_at: p.created_at,
        status: account?.status ?? "active",
        can_access_subscriptions: account?.can_access_subscriptions ?? false,
        workspaces_count: memberWorkspacesByUser.get(p.id)?.size ?? 0,
        workspaces_owned: ownedCountByUser.get(p.id) ?? 0,
        total_members_in_owned_workspaces: membersInOwnedWorkspacesByOwner.get(p.id)?.size ?? 0,
      };
    });

    return new Response(JSON.stringify({ users, adminRole: adminRow.role as AdminUserRole }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in admin-get-users-stats:", error);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
