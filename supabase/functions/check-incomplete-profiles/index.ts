import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Intervalos em dias
const PROFILE_REMINDER_INTERVAL_DAYS = 2; // Lembrete a cada 2 dias para cadastro incompleto
const INSTALL_REMINDER_INTERVAL_DAYS = 5; // Lembrete a cada 5 dias para instalar o app

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Checking for incomplete profiles and PWA installations...');

    // Get all profiles
    const { data: allProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    console.log(`Found ${allProfiles?.length || 0} profiles`);

    // Get all users with push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('user_id');

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      throw subError;
    }

    const usersWithPush = new Set(subscriptions?.map(s => s.user_id) || []);

    // Get all workspace members to know which workspace to use for notifications
    const { data: workspaceMembers, error: wmError } = await supabase
      .from('workspace_members')
      .select('user_id, workspace_id');

    if (wmError) {
      console.error('Error fetching workspace members:', wmError);
      throw wmError;
    }

    const userWorkspaceMap = new Map<string, string>();
    workspaceMembers?.forEach(wm => {
      if (!userWorkspaceMap.has(wm.user_id)) {
        userWorkspaceMap.set(wm.user_id, wm.workspace_id);
      }
    });

    // Get PWA installation records
    const { data: pwaInstallations, error: pwaError } = await supabase
      .from('pwa_installations')
      .select('*');

    if (pwaError) {
      console.error('Error fetching PWA installations:', pwaError);
      throw pwaError;
    }

    const pwaInstallMap = new Map<string, any>();
    pwaInstallations?.forEach(p => pwaInstallMap.set(p.user_id, p));

    const now = new Date();
    const notificationsToCreate: Array<{
      user_id: string;
      workspace_id: string;
      type: string;
      title: string;
      message: string;
      link: string;
      data: any;
    }> = [];

    const pwaRecordsToUpsert: Array<{
      user_id: string;
      last_profile_reminder_at?: string;
      last_install_reminder_at?: string;
    }> = [];

    // Check each profile
    for (const profile of allProfiles || []) {
      const workspaceId = userWorkspaceMap.get(profile.id);
      if (!workspaceId) continue;

      const hasAvatar = profile.avatar_url && profile.avatar_url.trim() !== '';
      const hasPush = usersWithPush.has(profile.id);
      const pwaRecord = pwaInstallMap.get(profile.id);
      const isInstalled = pwaRecord?.installed_at != null;

      // Check profile incomplete (foto ou push faltando) - lembrete a cada 2 dias
      const missingItems: string[] = [];
      if (!hasAvatar) missingItems.push('foto de perfil');
      if (!hasPush) missingItems.push('notificações push');

      if (missingItems.length > 0) {
        const lastProfileReminder = pwaRecord?.last_profile_reminder_at 
          ? new Date(pwaRecord.last_profile_reminder_at)
          : null;

        const daysSinceProfileReminder = lastProfileReminder 
          ? (now.getTime() - lastProfileReminder.getTime()) / (1000 * 60 * 60 * 24)
          : PROFILE_REMINDER_INTERVAL_DAYS + 1; // Force first reminder

        if (daysSinceProfileReminder >= PROFILE_REMINDER_INTERVAL_DAYS) {
          const message = `Complete seu perfil adicionando: ${missingItems.join(' e ')}`;
          
          notificationsToCreate.push({
            user_id: profile.id,
            workspace_id: workspaceId,
            type: 'profile_incomplete',
            title: 'Complete seu perfil',
            message: message,
            link: '/profile',
            data: {
              missing_avatar: !hasAvatar,
              missing_push: !hasPush
            }
          });

          // Update last profile reminder timestamp
          const existingUpsert = pwaRecordsToUpsert.find(r => r.user_id === profile.id);
          if (existingUpsert) {
            existingUpsert.last_profile_reminder_at = now.toISOString();
          } else {
            pwaRecordsToUpsert.push({
              user_id: profile.id,
              last_profile_reminder_at: now.toISOString()
            });
          }
        }
      }

      // Check PWA not installed - lembrete a cada 5 dias até instalar
      if (!isInstalled) {
        const lastInstallReminder = pwaRecord?.last_install_reminder_at 
          ? new Date(pwaRecord.last_install_reminder_at)
          : null;

        const daysSinceInstallReminder = lastInstallReminder 
          ? (now.getTime() - lastInstallReminder.getTime()) / (1000 * 60 * 60 * 24)
          : INSTALL_REMINDER_INTERVAL_DAYS + 1; // Force first reminder

        if (daysSinceInstallReminder >= INSTALL_REMINDER_INTERVAL_DAYS) {
          notificationsToCreate.push({
            user_id: profile.id,
            workspace_id: workspaceId,
            type: 'pwa_install_reminder',
            title: 'Instale o aplicativo',
            message: 'Instale o Fluzz na tela inicial do seu dispositivo para uma experiência melhor e receber notificações.',
            link: '/install',
            data: {
              reminder_type: 'pwa_install'
            }
          });

          // Update last install reminder timestamp
          const existingUpsert = pwaRecordsToUpsert.find(r => r.user_id === profile.id);
          if (existingUpsert) {
            existingUpsert.last_install_reminder_at = now.toISOString();
          } else {
            pwaRecordsToUpsert.push({
              user_id: profile.id,
              last_install_reminder_at: now.toISOString()
            });
          }
        }
      }
    }

    console.log(`Creating ${notificationsToCreate.length} notifications`);

    // Create notifications in batches
    if (notificationsToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notificationsToCreate);

      if (insertError) {
        console.error('Error creating notifications:', insertError);
        throw insertError;
      }
    }

    // Upsert PWA installation records
    if (pwaRecordsToUpsert.length > 0) {
      for (const record of pwaRecordsToUpsert) {
        const existingRecord = pwaInstallMap.get(record.user_id);
        
        if (existingRecord) {
          // Update existing record
          const updateData: any = {};
          if (record.last_profile_reminder_at) {
            updateData.last_profile_reminder_at = record.last_profile_reminder_at;
          }
          if (record.last_install_reminder_at) {
            updateData.last_install_reminder_at = record.last_install_reminder_at;
          }

          const { error } = await supabase
            .from('pwa_installations')
            .update(updateData)
            .eq('user_id', record.user_id);

          if (error) {
            console.error('Error updating PWA record:', error);
          }
        } else {
          // Insert new record
          const { error } = await supabase
            .from('pwa_installations')
            .insert({
              user_id: record.user_id,
              last_profile_reminder_at: record.last_profile_reminder_at || null,
              last_install_reminder_at: record.last_install_reminder_at || null
            });

          if (error) {
            console.error('Error inserting PWA record:', error);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        notificationsCreated: notificationsToCreate.length,
        pwaRecordsUpdated: pwaRecordsToUpsert.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in check-incomplete-profiles:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
