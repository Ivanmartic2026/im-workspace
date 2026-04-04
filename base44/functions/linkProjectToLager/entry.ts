import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { workspaceProjectId, fortnoxProjectNumber } = await req.json();

    if (!workspaceProjectId || !fortnoxProjectNumber) {
      return Response.json({ error: 'Missing fields' }, { status: 400 });
    }

    const updated = await base44.asServiceRole.entities.Project.update(workspaceProjectId, { fortnoxProjectNumber });
    return Response.json({ success: true, project: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});