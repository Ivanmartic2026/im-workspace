import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Admin access required' }, { status: 403 });
        }

        // Invite test user
        await base44.asServiceRole.users.inviteUser('test@imvision.se', 'user');

        return Response.json({ 
            success: true, 
            message: 'Test user invited. Check email for setup link.' 
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});