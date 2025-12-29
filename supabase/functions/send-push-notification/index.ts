import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushNotificationRequest {
  userId?: string;
  userIds?: string[];
  title: string;
  body: string;
  url?: string;
  tag?: string;
  requireInteraction?: boolean;
  /** When true, also creates an in-app notification in the database (service role). */
  createInApp?: boolean;
  inAppType?: string;
  inAppLink?: string;
  inAppData?: unknown;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys not configured');
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      userId,
      userIds,
      title,
      body,
      url,
      tag,
      requireInteraction,
      createInApp,
      inAppType,
      inAppLink,
      inAppData,
    }: PushNotificationRequest = await req.json();

    console.log('Received push notification request:', {
      userId,
      userIds,
      title,
      body,
      createInApp,
      inAppType,
    });

    // Get target user IDs
    const targetUserIds = userIds || (userId ? [userId] : []);

    if (targetUserIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No target users specified' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If requested, create in-app notifications (bell) only.
    // Push delivery is handled by the DB trigger on notifications inserts to avoid double-push.
    if (createInApp) {
      try {
        const { data: members, error: membersError } = await supabase
          .from('workspace_members')
          .select('user_id, workspace_id')
          .in('user_id', targetUserIds);

        if (membersError) {
          console.error('Error fetching workspace_members for in-app notifications:', membersError);
        }

        const workspaceByUser = new Map<string, string | null>();
        for (const m of members || []) {
          if (!workspaceByUser.has(m.user_id)) {
            workspaceByUser.set(m.user_id, m.workspace_id);
          }
        }

        const rows = targetUserIds.map((uid) => ({
          user_id: uid,
          workspace_id: workspaceByUser.get(uid) ?? null,
          type: inAppType || 'general',
          title,
          message: body,
          link: inAppLink || url || null,
          data: (inAppData as any) ?? { url: url || '/' },
          read: false,
        }));

        const { error: inAppError } = await supabase.from('notifications').insert(rows);
        if (inAppError) {
          console.error('Error creating in-app notifications:', inAppError);
          return new Response(
            JSON.stringify({ error: 'Failed to create in-app notification(s)' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Created ${rows.length} in-app notifications`);

        return new Response(
          JSON.stringify({ message: 'In-app notification(s) created', created: rows.length }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (e) {
        console.error('Unexpected error creating in-app notifications:', e);
        return new Response(
          JSON.stringify({ error: 'Unexpected error creating in-app notification(s)' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Best-effort de-dupe (prevents double sends when the same action triggers twice)
    const nowMs = Date.now();
    const DEDUPE_WINDOW_MS = 8000;

    const globalKey = '__recentPushSends';
    const recentPushSends: Map<string, number> = ((globalThis as any)[globalKey] ??=
      new Map<string, number>());

    // Light cleanup to avoid unbounded growth
    for (const [k, t] of recentPushSends.entries()) {
      if (nowMs - t > DEDUPE_WINDOW_MS) recentPushSends.delete(k);
    }

    const dedupeKeyForUser = (uid: string) => `${uid}|${title}|${body}|${url ?? ''}`;

    const effectiveUserIds = targetUserIds.filter((uid) => {
      const k = dedupeKeyForUser(uid);
      const last = recentPushSends.get(k);
      if (last && nowMs - last < DEDUPE_WINDOW_MS) return false;
      recentPushSends.set(k, nowMs);
      return true;
    });

    if (effectiveUserIds.length === 0) {
      console.log('Deduped push request (skipping send)');
      return new Response(
        JSON.stringify({ message: 'Deduped push request', sent: 0, failed: 0, total: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    type DbSub = {
      id: string;
      user_id: string;
      endpoint: string;
      p256dh: string;
      auth: string;
    };

    // Get subscriptions for target users
    const { data: subData, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', effectiveUserIds);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      throw subError;
    }

    const subscriptions = (subData as DbSub[]) ?? [];

    if (subscriptions.length === 0) {
      console.log('No subscriptions found for users:', effectiveUserIds);
      return new Response(
        JSON.stringify({ message: 'No subscriptions found', sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${subscriptions.length} subscriptions`);

    // Send notifications using Web Push
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        const payload = JSON.stringify({
          title,
          body,
          icon: '/icon-192.png',
          badge: '/favicon.png',
          ...(tag ? { tag } : {}),
          data: { url: url || '/' },
          requireInteraction: requireInteraction ?? false,
        });

        // Use web-push library via import
        const webPush = await import("npm:web-push@3.6.7");
        
        webPush.setVapidDetails(
          'mailto:contato@fluzzapp.com',
          vapidPublicKey,
          vapidPrivateKey
        );

        try {
          await webPush.sendNotification(pushSubscription, payload);
          console.log(`Notification sent to endpoint: ${sub.endpoint.substring(0, 50)}...`);
          return { success: true, userId: sub.user_id };
        } catch (error: any) {
          console.error(`Failed to send to ${sub.endpoint.substring(0, 50)}:`, error.message);
          
          // Remove invalid subscriptions (410 Gone or 404 Not Found)
          if (error.statusCode === 410 || error.statusCode === 404) {
            console.log('Removing invalid subscription');
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('id', sub.id);
          }
          
          return { success: false, userId: sub.user_id, error: error.message };
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
    const failed = results.length - successful;

    console.log(`Sent ${successful} notifications, ${failed} failed`);

    return new Response(
      JSON.stringify({ 
        message: 'Notifications processed',
        sent: successful,
        failed: failed,
        total: subscriptions.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-push-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
