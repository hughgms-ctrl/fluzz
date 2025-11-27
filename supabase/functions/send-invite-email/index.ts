import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteEmailRequest {
  email: string;
  workspaceName: string;
  inviteLink: string;
  role: string;
  workspaceId: string;
  permissions: any;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, workspaceName, inviteLink, role, workspaceId, permissions }: InviteEmailRequest = await req.json();

    console.log("Sending invite email to:", email);

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const roleText = role === "admin" 
      ? "Administrador" 
      : role === "gestor" 
      ? "Gestor" 
      : "Membro";

    // Construct production URL for password setup
    const projectId = 'ccc63afb-4fd5-430e-800f-715011011050';
    const productionUrl = `https://${projectId}.lovableproject.com`;
    const redirectUrl = `${productionUrl}/auth?invite=${inviteLink.split('invite=')[1]}`;

    // Use Supabase Auth to invite user by email
    // This sends an email with a magic link that allows the user to set their password
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        workspace_id: workspaceId,
        workspace_name: workspaceName,
        role: role,
        permissions: permissions,
      },
      redirectTo: redirectUrl,
    });

    if (error) {
      console.error("Erro ao enviar convite via Supabase:", error);
      throw new Error(`Erro ao enviar convite: ${error.message}`);
    }

    console.log("Convite enviado com sucesso via Supabase Auth:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending invite email:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Erro ao enviar email" 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);
