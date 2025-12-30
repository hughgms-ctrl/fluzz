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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ blocked: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a client with the user's token
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ blocked: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client to check blocked status
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is blocked
    const { data: accountData, error: accountError } = await supabaseAdmin
      .from("user_account_management")
      .select("status, blocked_reason")
      .eq("user_id", user.id)
      .single();

    if (accountError && accountError.code !== "PGRST116") {
      console.error("Error checking blocked status:", accountError.message);
      return new Response(
        JSON.stringify({ blocked: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isBlocked = accountData?.status === "blocked";
    const blockedReason = accountData?.blocked_reason || "Sua conta foi bloqueada.";

    console.log("User blocked status:", user.id, isBlocked);

    return new Response(
      JSON.stringify({ 
        blocked: isBlocked,
        reason: isBlocked ? blockedReason : null
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in check-user-blocked:", error);
    return new Response(
      JSON.stringify({ blocked: false }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
