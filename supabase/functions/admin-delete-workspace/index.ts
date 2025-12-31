import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user making the request is an admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is platform admin
    const { data: adminUser, error: adminError } = await supabase
      .from("admin_users")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (adminError || !adminUser) {
      console.error("Admin check failed:", adminError);
      return new Response(
        JSON.stringify({ error: "Acesso não autorizado" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { workspaceId } = await req.json();

    if (!workspaceId) {
      return new Response(
        JSON.stringify({ error: "workspaceId é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Admin ${user.email} deleting workspace ${workspaceId}`);

    // Get workspace info before deletion
    const { data: workspace, error: wsError } = await supabase
      .from("workspaces")
      .select("name, created_by")
      .eq("id", workspaceId)
      .single();

    if (wsError || !workspace) {
      console.error("Workspace not found:", wsError);
      return new Response(
        JSON.stringify({ error: "Workspace não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Deleting workspace: ${workspace.name}`);

    // Get project IDs first
    const { data: projects } = await supabase
      .from("projects")
      .select("id")
      .eq("workspace_id", workspaceId);
    
    const projectIds = projects?.map(p => p.id) || [];

    // Get position IDs
    const { data: positions } = await supabase
      .from("positions")
      .select("id")
      .eq("workspace_id", workspaceId);
    
    const positionIds = positions?.map(p => p.id) || [];

    // Get inventory item IDs
    const { data: invItems } = await supabase
      .from("inventory_items")
      .select("id")
      .eq("workspace_id", workspaceId);
    
    const invItemIds = invItems?.map(i => i.id) || [];

    // Get template IDs
    const { data: templates } = await supabase
      .from("project_templates")
      .select("id")
      .eq("workspace_id", workspaceId);
    
    const templateIds = templates?.map(t => t.id) || [];

    // Delete in correct order to respect foreign keys:
    
    // 1. Delete tasks related to projects in this workspace
    if (projectIds.length > 0) {
      const { error: tasksError } = await supabase
        .from("tasks")
        .delete()
        .in("project_id", projectIds);
      if (tasksError) console.warn("Error deleting tasks:", tasksError);

      // 2. Delete project_members
      const { error: pmError } = await supabase
        .from("project_members")
        .delete()
        .in("project_id", projectIds);
      if (pmError) console.warn("Error deleting project_members:", pmError);
    }

    // 3. Delete projects
    const { error: projectsError } = await supabase
      .from("projects")
      .delete()
      .eq("workspace_id", workspaceId);
    if (projectsError) console.warn("Error deleting projects:", projectsError);

    // 4. Delete briefings
    const { error: briefingsError } = await supabase
      .from("briefings")
      .delete()
      .eq("workspace_id", workspaceId);
    if (briefingsError) console.warn("Error deleting briefings:", briefingsError);

    // 5. Delete debriefings
    const { error: debriefingsError } = await supabase
      .from("debriefings")
      .delete()
      .eq("workspace_id", workspaceId);
    if (debriefingsError) console.warn("Error deleting debriefings:", debriefingsError);

    // 6. Delete user_positions for positions in this workspace
    if (positionIds.length > 0) {
      const { error: userPosError } = await supabase
        .from("user_positions")
        .delete()
        .in("position_id", positionIds);
      if (userPosError) console.warn("Error deleting user_positions:", userPosError);
    }

    // 7. Delete positions
    const { error: positionsError } = await supabase
      .from("positions")
      .delete()
      .eq("workspace_id", workspaceId);
    if (positionsError) console.warn("Error deleting positions:", positionsError);

    // 8. Delete routines
    const { error: routinesError } = await supabase
      .from("routines")
      .delete()
      .eq("workspace_id", workspaceId);
    if (routinesError) console.warn("Error deleting routines:", routinesError);

    // 9. Delete recurring_tasks
    const { error: recTasksError } = await supabase
      .from("recurring_tasks")
      .delete()
      .eq("workspace_id", workspaceId);
    if (recTasksError) console.warn("Error deleting recurring_tasks:", recTasksError);

    // 10. Delete inventory movements
    if (invItemIds.length > 0) {
      const { error: invMovError } = await supabase
        .from("inventory_movements")
        .delete()
        .in("item_id", invItemIds);
      if (invMovError) console.warn("Error deleting inventory_movements:", invMovError);
    }

    // 11. Delete inventory items
    const { error: invItemsError } = await supabase
      .from("inventory_items")
      .delete()
      .eq("workspace_id", workspaceId);
    if (invItemsError) console.warn("Error deleting inventory_items:", invItemsError);

    // 12. Delete inventory events
    const { error: invEventsError } = await supabase
      .from("inventory_events")
      .delete()
      .eq("workspace_id", workspaceId);
    if (invEventsError) console.warn("Error deleting inventory_events:", invEventsError);

    // 13. Delete workspace_invites
    const { error: invitesError } = await supabase
      .from("workspace_invites")
      .delete()
      .eq("workspace_id", workspaceId);
    if (invitesError) console.warn("Error deleting workspace_invites:", invitesError);

    // 14. Delete workspace_member_blocks
    const { error: blocksError } = await supabase
      .from("workspace_member_blocks")
      .delete()
      .eq("workspace_id", workspaceId);
    if (blocksError) console.warn("Error deleting workspace_member_blocks:", blocksError);

    // 15. Delete user_permissions
    const { error: permsError } = await supabase
      .from("user_permissions")
      .delete()
      .eq("workspace_id", workspaceId);
    if (permsError) console.warn("Error deleting user_permissions:", permsError);

    // 16. Delete notifications
    const { error: notifsError } = await supabase
      .from("notifications")
      .delete()
      .eq("workspace_id", workspaceId);
    if (notifsError) console.warn("Error deleting notifications:", notifsError);

    // 17. Delete AI conversations
    const { error: aiConvsError } = await supabase
      .from("ai_conversations")
      .delete()
      .eq("workspace_id", workspaceId);
    if (aiConvsError) console.warn("Error deleting ai_conversations:", aiConvsError);

    // 18. Delete process_documentation
    const { error: processesError } = await supabase
      .from("process_documentation")
      .delete()
      .eq("workspace_id", workspaceId);
    if (processesError) console.warn("Error deleting process_documentation:", processesError);

    // 19. Delete company_info
    const { error: companyInfoError } = await supabase
      .from("company_info")
      .delete()
      .eq("workspace_id", workspaceId);
    if (companyInfoError) console.warn("Error deleting company_info:", companyInfoError);

    // 20. Delete company_news
    const { error: companyNewsError } = await supabase
      .from("company_news")
      .delete()
      .eq("workspace_id", workspaceId);
    if (companyNewsError) console.warn("Error deleting company_news:", companyNewsError);

    // 21. Delete sectors
    const { error: sectorsError } = await supabase
      .from("sectors")
      .delete()
      .eq("workspace_id", workspaceId);
    if (sectorsError) console.warn("Error deleting sectors:", sectorsError);

    // 22. Delete getting_started_sections
    const { error: gsError } = await supabase
      .from("getting_started_sections")
      .delete()
      .eq("workspace_id", workspaceId);
    if (gsError) console.warn("Error deleting getting_started_sections:", gsError);

    // 23. Delete template_tasks
    if (templateIds.length > 0) {
      const { error: ttError } = await supabase
        .from("template_tasks")
        .delete()
        .in("template_id", templateIds);
      if (ttError) console.warn("Error deleting template_tasks:", ttError);
    }

    // 24. Delete project_templates
    const { error: templatesError } = await supabase
      .from("project_templates")
      .delete()
      .eq("workspace_id", workspaceId);
    if (templatesError) console.warn("Error deleting project_templates:", templatesError);

    // 25. Delete user_subscriptions for this workspace
    const { error: subsError } = await supabase
      .from("user_subscriptions")
      .delete()
      .eq("workspace_id", workspaceId);
    if (subsError) console.warn("Error deleting user_subscriptions:", subsError);

    // 26. Delete workspace_members
    const { error: membersError } = await supabase
      .from("workspace_members")
      .delete()
      .eq("workspace_id", workspaceId);
    if (membersError) console.warn("Error deleting workspace_members:", membersError);

    // 27. Finally delete the workspace itself
    const { error: wsDeleteError } = await supabase
      .from("workspaces")
      .delete()
      .eq("id", workspaceId);

    if (wsDeleteError) {
      console.error("Error deleting workspace:", wsDeleteError);
      return new Response(
        JSON.stringify({ error: `Erro ao excluir workspace: ${wsDeleteError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Workspace ${workspace.name} deleted successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Workspace "${workspace.name}" excluído com sucesso` 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const error = err as Error;
    console.error("Error in admin-delete-workspace:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
