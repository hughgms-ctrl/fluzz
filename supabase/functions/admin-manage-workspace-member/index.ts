import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get the requesting user from the JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callerUser }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !callerUser) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if caller is a platform admin
    const { data: adminData } = await supabaseClient
      .from("admin_users")
      .select("role")
      .eq("user_id", callerUser.id)
      .single();

    if (!adminData) {
      return new Response(
        JSON.stringify({ error: "Access denied. Admin only." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, workspaceId, userId, targetUserId, role, reason, permissions } = await req.json();

    // Support both userId and targetUserId for backwards compatibility
    const targetUser = targetUserId || userId;

    if (!action || !workspaceId || !targetUser) {
      return new Response(
        JSON.stringify({ error: "action, workspaceId, and userId/targetUserId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if target user is the workspace creator (owner)
    const { data: workspace } = await supabaseClient
      .from("workspaces")
      .select("created_by")
      .eq("id", workspaceId)
      .single();

    const isWorkspaceCreator = workspace?.created_by === targetUser;

    // Protect workspace creator from role changes, removal, and blocking
    if (isWorkspaceCreator && ["update_role", "remove", "block"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "O criador do workspace não pode ter seu cargo alterado, ser removido ou bloqueado." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    switch (action) {
      case "block": {
        // Block user in workspace
        const { error: blockError } = await supabaseClient
          .from("workspace_member_blocks")
          .upsert({
            workspace_id: workspaceId,
            user_id: targetUser,
            blocked_by: callerUser.id,
            blocked_reason: reason || null,
          });

        if (blockError) {
          return new Response(
            JSON.stringify({ error: blockError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        break;
      }

      case "unblock": {
        // Unblock user in workspace
        const { error: unblockError } = await supabaseClient
          .from("workspace_member_blocks")
          .delete()
          .eq("workspace_id", workspaceId)
          .eq("user_id", targetUser);

        if (unblockError) {
          return new Response(
            JSON.stringify({ error: unblockError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        break;
      }

      case "update_role": {
        if (!role) {
          return new Response(
            JSON.stringify({ error: "role is required for update_role action" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: roleError } = await supabaseClient
          .from("workspace_members")
          .update({ role })
          .eq("workspace_id", workspaceId)
          .eq("user_id", targetUser);

        if (roleError) {
          return new Response(
            JSON.stringify({ error: roleError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        break;
      }

      case "update_permissions": {
        if (!permissions) {
          return new Response(
            JSON.stringify({ error: "permissions is required for update_permissions action" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Upsert permissions
        const { error: permError } = await supabaseClient
          .from("user_permissions")
          .upsert({
            workspace_id: workspaceId,
            user_id: targetUser,
            ...permissions,
          }, {
            onConflict: 'user_id,workspace_id'
          });

        if (permError) {
          return new Response(
            JSON.stringify({ error: permError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        break;
      }

      case "remove": {
        // Remove user from workspace
        const { error: removeError } = await supabaseClient
          .from("workspace_members")
          .delete()
          .eq("workspace_id", workspaceId)
          .eq("user_id", targetUser);

        if (removeError) {
          return new Response(
            JSON.stringify({ error: removeError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Also remove any blocks
        await supabaseClient
          .from("workspace_member_blocks")
          .delete()
          .eq("workspace_id", workspaceId)
          .eq("user_id", targetUser);

        // Remove permissions
        await supabaseClient
          .from("user_permissions")
          .delete()
          .eq("workspace_id", workspaceId)
          .eq("user_id", targetUser);
        break;
      }

      case "add": {
        // Add user to workspace
        const { error: addError } = await supabaseClient
          .from("workspace_members")
          .insert({
            workspace_id: workspaceId,
            user_id: targetUser,
            role: role || "membro",
          });

        if (addError) {
          return new Response(
            JSON.stringify({ error: addError.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in admin-manage-workspace-member:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
