import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { workspace_id, participant_id, task_id, message_type } = await req.json();

    if (!workspace_id || !participant_id || !task_id || !message_type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get WhatsApp config
    const { data: config, error: configError } = await supabase
      .from("whatsapp_config")
      .select("*")
      .eq("workspace_id", workspace_id)
      .eq("is_active", true)
      .maybeSingle();

    if (configError || !config) {
      return new Response(
        JSON.stringify({ error: "WhatsApp not configured or inactive" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get participant
    const { data: participant } = await supabase
      .from("external_participants")
      .select("name, phone")
      .eq("id", participant_id)
      .single();

    if (!participant) {
      return new Response(
        JSON.stringify({ error: "Participant not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get task
    const { data: task } = await supabase
      .from("tasks")
      .select("title, status, due_date")
      .eq("id", task_id)
      .single();

    if (!task) {
      return new Response(
        JSON.stringify({ error: "Task not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build message
    let message = "";
    const statusMap: Record<string, string> = {
      todo: "A fazer",
      in_progress: "Em andamento",
      done: "Concluída",
      blocked: "Bloqueada",
    };

    switch (message_type) {
      case "task_assigned":
        message = `Olá ${participant.name}! 👋\n\nVocê foi atribuído(a) à tarefa: *${task.title}*`;
        if (task.due_date) message += `\n📅 Prazo: ${new Date(task.due_date).toLocaleDateString("pt-BR")}`;
        break;
      case "status_changed":
        message = `📋 Atualização de tarefa\n\nA tarefa *${task.title}* mudou para: *${statusMap[task.status || ""] || task.status}*`;
        break;
      case "due_reminder":
        message = `⏰ Lembrete!\n\nA tarefa *${task.title}* vence em ${task.due_date ? new Date(task.due_date).toLocaleDateString("pt-BR") : "breve"}.`;
        break;
      case "task_overdue":
        message = `🚨 Tarefa atrasada!\n\nA tarefa *${task.title}* está atrasada desde ${task.due_date ? new Date(task.due_date).toLocaleDateString("pt-BR") : "a data prevista"}.`;
        break;
      default:
        message = `Notificação sobre a tarefa: *${task.title}*`;
    }

    // Send via UAZapi
    let sendStatus = "sent";
    let errorMessage: string | null = null;

    try {
      const res = await fetch(
        `https://${config.instance_subdomain}.uazapi.com/sendText`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            token: config.instance_token,
          },
          body: JSON.stringify({
            phone: participant.phone,
            message,
          }),
        }
      );

      if (!res.ok) {
        sendStatus = "failed";
        errorMessage = `HTTP ${res.status}: ${await res.text()}`;
      }
    } catch (e) {
      sendStatus = "failed";
      errorMessage = e instanceof Error ? e.message : "Unknown error";
    }

    // Log the notification
    await supabase.from("whatsapp_notification_logs").insert({
      workspace_id,
      participant_id,
      task_id,
      message_type,
      status: sendStatus,
      error_message: errorMessage,
    });

    return new Response(
      JSON.stringify({ success: sendStatus === "sent", status: sendStatus, error: errorMessage }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
