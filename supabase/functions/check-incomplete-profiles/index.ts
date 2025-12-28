import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Checking for incomplete profiles...');

    // Get all profiles without avatar
    const { data: incompleteProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .or('avatar_url.is.null,avatar_url.eq.');

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    console.log(`Found ${incompleteProfiles?.length || 0} profiles without avatar`);

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

    // Determine which users need notifications
    const notificationsToCreate: Array<{
      user_id: string;
      workspace_id: string;
      type: string;
      title: string;
      message: string;
      link: string;
      data: any;
    }> = [];

    // Check each profile
    for (const profile of incompleteProfiles || []) {
      const hasAvatar = profile.avatar_url && profile.avatar_url.trim() !== '';
      const hasPush = usersWithPush.has(profile.id);
      const workspaceId = userWorkspaceMap.get(profile.id);

      if (!workspaceId) continue;

      const missingItems: string[] = [];
      if (!hasAvatar) missingItems.push('foto de perfil');
      if (!hasPush) missingItems.push('notificações push');

      if (missingItems.length > 0) {
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
      }
    }

    // Also check users who have avatar but no push
    const profileIds = new Set((incompleteProfiles || []).map(p => p.id));
    
    for (const [userId, workspaceId] of userWorkspaceMap) {
      // Skip if already checked (no avatar)
      if (profileIds.has(userId)) continue;
      
      // Check if user has push notifications
      if (!usersWithPush.has(userId)) {
        notificationsToCreate.push({
          user_id: userId,
          workspace_id: workspaceId,
          type: 'profile_incomplete',
          title: 'Ative as notificações',
          message: 'Ative as notificações push para receber alertas importantes no seu dispositivo.',
          link: '/profile',
          data: {
            missing_avatar: false,
            missing_push: true
          }
        });
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

    return new Response(
      JSON.stringify({ 
        success: true,
        notificationsCreated: notificationsToCreate.length
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
