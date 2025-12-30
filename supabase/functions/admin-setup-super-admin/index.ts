import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if any super_admin exists
    const { data: existingAdmins, error: checkError } = await supabaseAdmin
      .from("admin_users")
      .select("id")
      .eq("role", "super_admin");

    if (checkError) {
      console.error("Error checking existing admins:", checkError.message);
      return new Response(
        JSON.stringify({ error: "Erro ao verificar administradores existentes" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If super_admin already exists, require authentication
    if (existingAdmins && existingAdmins.length > 0) {
      console.log("Super admin already exists, cannot create another without auth");
      return new Response(
        JSON.stringify({ error: "Já existe um super administrador. Entre em contato com o administrador atual." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("No authorization header");
      return new Response(
        JSON.stringify({ error: "Não autorizado. Faça login primeiro." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a client with the user's token
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.log("User not authenticated:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Setting up super admin for user:", user.id, user.email);

    // Insert the user as super_admin
    const { error: insertError } = await supabaseAdmin
      .from("admin_users")
      .insert({
        user_id: user.id,
        role: "super_admin",
        created_by: user.id,
      });

    if (insertError) {
      console.error("Error inserting super admin:", insertError.message);
      return new Response(
        JSON.stringify({ error: "Erro ao criar super administrador" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Super admin created successfully for:", user.email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Super administrador configurado com sucesso!",
        userId: user.id,
        email: user.email 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in admin-setup-super-admin:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
