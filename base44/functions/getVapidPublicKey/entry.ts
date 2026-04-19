import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');

    if (!vapidPublicKey) {
      return Response.json(
        { error: 'VAPID public key not configured' },
        { status: 500 }
      );
    }

    return Response.json({ vapidPublicKey });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});