import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate VAPID keys using Web Crypto API
async function generateVapidKeys() {
  // Generate an ECDSA key pair for VAPID
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true,
    ['sign', 'verify']
  );

  // Export the public key
  const publicKeyBuffer = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const publicKeyArray = new Uint8Array(publicKeyBuffer);
  
  // Export the private key in PKCS8 format
  const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
  const privateKeyArray = new Uint8Array(privateKeyBuffer);
  
  // Convert to base64url encoding (VAPID format)
  const publicKeyBase64 = btoa(String.fromCharCode(...publicKeyArray))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  // For private key, we need the raw 32-byte key, extract it from PKCS8
  // PKCS8 format has headers, the actual key is the last 32 bytes
  const privateKeyRaw = privateKeyArray.slice(-32);
  const privateKeyBase64 = btoa(String.fromCharCode(...privateKeyRaw))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return {
    publicKey: publicKeyBase64,
    privateKey: privateKeyBase64,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Generating new VAPID keys...');
    
    const keys = await generateVapidKeys();
    
    console.log('VAPID keys generated successfully');
    console.log('Public Key length:', keys.publicKey.length);
    console.log('Private Key length:', keys.privateKey.length);

    return new Response(
      JSON.stringify({
        success: true,
        publicKey: keys.publicKey,
        privateKey: keys.privateKey,
        instructions: 'Copy these keys and update your secrets: VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error generating VAPID keys:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
