import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import webpush from 'npm:web-push@3.6.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if VAPID keys exist in environment
    let publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    let privateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    // If keys don't exist, generate them
    if (!publicKey || !privateKey) {
      console.log('Generating new VAPID keys...');
      const vapidKeys = webpush.generateVAPIDKeys();
      publicKey = vapidKeys.publicKey;
      privateKey = vapidKeys.privateKey;

      // Log the keys so admin can save them as secrets
      console.log('=== VAPID KEYS GENERATED ===');
      console.log('Public Key:', publicKey);
      console.log('Private Key:', privateKey);
      console.log('=== Save these as secrets in the dashboard ===');
    }

    return Response.json({
      publicKey,
      message: 'VAPID public key retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting VAPID key:', error);
    return Response.json({
      error: error.message
    }, { status: 500 });
  }
});