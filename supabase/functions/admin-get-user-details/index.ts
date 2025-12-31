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

    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user email from auth
    const { data: { user: authUser } } = await supabaseClient.auth.admin.getUserById(userId);
    
    // Get user account management data
    const { data: accountManagement } = await supabaseClient
      .from("user_account_management")
      .select("*")
      .eq("user_id", userId)
      .single();

    // Get workspaces owned/created by user
    const { data: ownedWorkspaces, error: ownedError } = await supabaseClient
      .from("workspaces")
      .select("id, name, created_at")
      .eq("created_by", userId);

    if (ownedError) {
      console.error("Error fetching owned workspaces:", ownedError);
    }

    // For each owned workspace, fetch all members with their profiles
    const ownedWorkspacesWithMembers = [];
    if (ownedWorkspaces) {
      for (const workspace of ownedWorkspaces) {
        const { data: members } = await supabaseClient
          .from("workspace_members")
          .select("id, user_id, role")
          .eq("workspace_id", workspace.id);

        // Fetch profiles for each member
        const membersWithProfiles = [];
        if (members) {
          for (const member of members) {
            const { data: memberProfile } = await supabaseClient
              .from("profiles")
              .select("id, full_name, avatar_url")
              .eq("id", member.user_id)
              .single();
            
            membersWithProfiles.push({
              ...member,
              profiles: memberProfile || { id: member.user_id, full_name: null, avatar_url: null }
            });
          }
        }

        ownedWorkspacesWithMembers.push({
          ...workspace,
          workspace_members: membersWithProfiles
        });
      }
    }

    // Get workspaces where user is a member
    const { data: memberWorkspacesRaw, error: memberError } = await supabaseClient
      .from("workspace_members")
      .select("id, role, workspace_id")
      .eq("user_id", userId);

    if (memberError) {
      console.error("Error fetching member workspaces:", memberError);
    }

    // For each workspace where user is a member, fetch workspace details and all members
    const memberWorkspaces = [];
    if (memberWorkspacesRaw) {
      for (const membership of memberWorkspacesRaw) {
        // Check if this workspace is owned by the user
        const isOwned = ownedWorkspaces?.some(w => w.id === membership.workspace_id) || false;
        
        // Get workspace details
        const { data: workspace } = await supabaseClient
          .from("workspaces")
          .select("id, name, created_by, created_at")
          .eq("id", membership.workspace_id)
          .single();

        // Get all members of this workspace
        const { data: members } = await supabaseClient
          .from("workspace_members")
          .select("id, user_id, role")
          .eq("workspace_id", membership.workspace_id);

        // Fetch profiles for each member
        const membersWithProfiles = [];
        if (members) {
          for (const member of members) {
            const { data: memberProfile } = await supabaseClient
              .from("profiles")
              .select("id, full_name, avatar_url")
              .eq("id", member.user_id)
              .single();

            // Check if member is blocked in this workspace
            const { data: memberBlock } = await supabaseClient
              .from("workspace_member_blocks")
              .select("*")
              .eq("user_id", member.user_id)
              .eq("workspace_id", membership.workspace_id)
              .single();
            
            membersWithProfiles.push({
              ...member,
              profiles: memberProfile || { id: member.user_id, full_name: null, avatar_url: null },
              is_blocked: !!memberBlock,
              block_reason: memberBlock?.blocked_reason || null
            });
          }
        }

        memberWorkspaces.push({
          id: membership.id,
          role: membership.role,
          workspace,
          workspace_members: membersWithProfiles,
          isOwned,
        });
      }
    }

    // Get workspace member blocks for this user
    const { data: memberBlocks } = await supabaseClient
      .from("workspace_member_blocks")
      .select("*")
      .eq("user_id", userId);

    // Get user subscription
    const { data: subscription } = await supabaseClient
      .from("user_subscriptions")
      .select(`
        *,
        plan:plan_id (
          id,
          name,
          price_per_user,
          price_per_workspace,
          billing_period
        ),
        workspace:workspace_id (
          id,
          name
        )
      `)
      .eq("user_id", userId)
      .single();

    // Get user permissions across workspaces
    const { data: permissions } = await supabaseClient
      .from("user_permissions")
      .select("*")
      .eq("user_id", userId);

    // For each permission, get workspace name
    const permissionsWithWorkspace = [];
    if (permissions) {
      for (const permission of permissions) {
        const { data: workspace } = await supabaseClient
          .from("workspaces")
          .select("id, name")
          .eq("id", permission.workspace_id)
          .single();
        
        permissionsWithWorkspace.push({
          ...permission,
          workspace
        });
      }
    }

    return new Response(
      JSON.stringify({
        profile: {
          ...profile,
          email: authUser?.email || null,
          email_confirmed_at: authUser?.email_confirmed_at || null,
          last_sign_in_at: authUser?.last_sign_in_at || null,
        },
        accountManagement,
        ownedWorkspaces: ownedWorkspacesWithMembers || [],
        memberWorkspaces: memberWorkspaces || [],
        memberBlocks: memberBlocks || [],
        subscription,
        permissions: permissionsWithWorkspace || [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in admin-get-user-details:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
