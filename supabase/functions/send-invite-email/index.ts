import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteEmailRequest {
  email: string;
  workspaceName: string;
  inviteLink: string;
  role: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, workspaceName, inviteLink, role }: InviteEmailRequest = await req.json();

    console.log("Sending invite email to:", email);

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY não configurada");
      throw new Error("Serviço de email não configurado");
    }

    const roleText = role === "admin" 
      ? "Administrador" 
      : role === "gestor" 
      ? "Gestor" 
      : "Membro";

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333; margin-bottom: 20px;">Você foi convidado!</h1>
        <p style="color: #666; font-size: 16px; line-height: 1.5;">
          Você foi convidado para participar do workspace <strong>${workspaceName}</strong> 
          com o cargo de <strong>${roleText}</strong>.
        </p>
        <p style="color: #666; font-size: 16px; line-height: 1.5;">
          Clique no botão abaixo para criar sua conta e começar a colaborar:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteLink}" 
             style="background-color: #0066ff; color: white; padding: 14px 28px; 
                    text-decoration: none; border-radius: 6px; display: inline-block;
                    font-weight: bold; font-size: 16px;">
            Aceitar Convite
          </a>
        </div>
        <p style="color: #999; font-size: 14px; margin-top: 30px;">
          Este convite expira em 7 dias. Se você não solicitou este convite, pode ignorar este email.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #999; font-size: 12px; text-align: center;">
          Se o botão não funcionar, copie e cole este link no seu navegador:<br/>
          <span style="color: #0066ff;">${inviteLink}</span>
        </p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Equipe <onboarding@resend.dev>",
        to: [email],
        subject: `Convite para o workspace ${workspaceName}`,
        html: emailHtml,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("Erro ao enviar email:", error);
      throw new Error(`Erro ao enviar email: ${error}`);
    }

    const data = await res.json();
    console.log("Email sent successfully:", data);

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
