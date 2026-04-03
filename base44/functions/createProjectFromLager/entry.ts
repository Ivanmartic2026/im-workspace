import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { fortnoxProjectNumber, name, description } = body;
    
    if (!fortnoxProjectNumber || !name) {
      return Response.json({ error: 'Missing fields' }, { status: 400 });
    }

    const existing = await base44.asServiceRole.entities.WorkspaceProject.filter({ fortnoxProjectNumber });
    if (existing.length > 0) {
      return Response.json({ success: true, message: 'already exists', project: existing[0] });
    }

    const project = await base44.asServiceRole.entities.WorkspaceProject.create({
      fortnoxProjectNumber,
      name,
      description: description || '',
      status: 'active',
      createdFromLager: true
    });

    return Response.json({ success: true, project });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});