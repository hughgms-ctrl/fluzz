import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate VAPID keys using Web Crypto API with proper P-256 curve
async function generateVapidKeys() {
  // Generate a P-256 (prime256v1) key pair
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign", "verify"]
  );

  // Export the public key in raw format (uncompressed point format)
  const publicKeyRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  
  // Export the private key in JWK format to extract the 'd' parameter
  const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  
  // Convert to base64url encoding
  const publicKeyBase64 = arrayBufferToBase64Url(publicKeyRaw);
  
  // The private key 'd' parameter is already in base64url format in JWK
  // But web-push expects it in a specific format
  const privateKeyBase64 = privateKeyJwk.d!;

  return {
    publicKey: publicKeyBase64,
    privateKey: privateKeyBase64,
  };
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // Convert to base64
  const base64 = btoa(binary);
  // Convert to base64url (replace + with -, / with _, remove =)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
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
        message: 'VAPID keys generated successfully. Copy these values to your secrets.',
        publicKey: keys.publicKey,
        privateKey: keys.privateKey,
        instructions: [
          '1. Copy the publicKey value',
          '2. Update the VAPID_PUBLIC_KEY secret with this value',
          '3. Copy the privateKey value', 
          '4. Update the VAPID_PRIVATE_KEY secret with this value',
          '5. Delete this edge function after updating secrets'
        ]
      }, null, 2),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error generating VAPID keys:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
