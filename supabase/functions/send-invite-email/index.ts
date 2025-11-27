import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InviteEmailRequest {
  email: string;
  inviteLink: string;
  workspaceName: string;
  role: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, inviteLink, workspaceName, role }: InviteEmailRequest =
      await req.json();

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY não configurada");
      throw new Error("Serviço de email não configurado");
    }

    const roleText =
      role === "admin"
        ? "Administrador"
        : role === "gestor"
        ? "Gestor"
        : "Membro";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Você foi convidado!</h1>
            </div>
            <div class="content">
              <p>Olá!</p>
              <p>Você foi convidado para colaborar no workspace <strong>${workspaceName}</strong> como <strong>${roleText}</strong>.</p>
              <p>Clique no botão abaixo para aceitar o convite e começar a colaborar:</p>
              <div style="text-align: center;">
                <a href="${inviteLink}" class="button">Aceitar Convite</a>
              </div>
              <p style="margin-top: 30px; font-size: 14px; color: #666;">
                Se você não solicitou este convite, pode ignorar este email.
                <br>
                Este link expira em 7 dias.
              </p>
            </div>
            <div class="footer">
              <p>ProjectFlow - Gerenciamento de Projetos</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "ProjectFlow <onboarding@resend.dev>",
        to: [email],
        subject: `Convite para ${workspaceName}`,
        html: emailHtml,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("Erro ao enviar email:", error);
      throw new Error(`Erro ao enviar email: ${error}`);
    }

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Erro:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
};

serve(handler);
