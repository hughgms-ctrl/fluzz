import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { workspace_id, provider, model, api_key, use_own_key } = await req.json();

    // Verificar se é admin do workspace
    const { data: member } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("workspace_id", workspace_id)
      .single();

    if (member?.role !== "admin") {
      return new Response(
        JSON.stringify({ success: false, error: "Apenas admin pode testar" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Se não foi enviada chave nova, busca a salva
    let effectiveKey = api_key;
    if (!effectiveKey && use_own_key && provider !== "lovable") {
      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      const { data: cfg } = await adminClient
        .from("ai_workspace_config")
        .select("api_key")
        .eq("workspace_id", workspace_id)
        .maybeSingle();
      effectiveKey = cfg?.api_key;
    }

    let url = "";
    let headers: Record<string, string> = { "Content-Type": "application/json" };
    let body: any = {};

    const testMessage = "Diga apenas 'ok'";

    if (!use_own_key || provider === "lovable") {
      if (!LOVABLE_API_KEY) {
        return new Response(
          JSON.stringify({ success: false, error: "Lovable AI não configurada" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      url = "https://ai.gateway.lovable.dev/v1/chat/completions";
      headers["Authorization"] = `Bearer ${LOVABLE_API_KEY}`;
      body = {
        model: model || "google/gemini-2.5-flash",
        messages: [{ role: "user", content: testMessage }],
        max_tokens: 10,
      };
    } else if (provider === "openai") {
      if (!effectiveKey) {
        return new Response(
          JSON.stringify({ success: false, error: "Chave OpenAI ausente" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      url = "https://api.openai.com/v1/chat/completions";
      headers["Authorization"] = `Bearer ${effectiveKey}`;
      body = {
        model,
        messages: [{ role: "user", content: testMessage }],
        max_completion_tokens: 10,
      };
    } else if (provider === "anthropic") {
      if (!effectiveKey) {
        return new Response(
          JSON.stringify({ success: false, error: "Chave Anthropic ausente" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      url = "https://api.anthropic.com/v1/messages";
      headers["x-api-key"] = effectiveKey;
      headers["anthropic-version"] = "2023-06-01";
      body = {
        model,
        max_tokens: 10,
        messages: [{ role: "user", content: testMessage }],
      };
    } else if (provider === "gemini") {
      if (!effectiveKey) {
        return new Response(
          JSON.stringify({ success: false, error: "Chave Gemini ausente" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${effectiveKey}`;
      body = {
        contents: [{ role: "user", parts: [{ text: testMessage }] }],
        generationConfig: { maxOutputTokens: 10 },
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (response.ok) {
      return new Response(
        JSON.stringify({ success: true, message: `Conexão com ${provider} OK` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      const errText = await response.text();
      console.error("Test AI error:", response.status, errText);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Erro ${response.status}: ${errText.slice(0, 200)}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (e) {
    console.error("Test connection error:", e);
    return new Response(
      JSON.stringify({
        success: false,
        error: e instanceof Error ? e.message : "Erro desconhecido",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
