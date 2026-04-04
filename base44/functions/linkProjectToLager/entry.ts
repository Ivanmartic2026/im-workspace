import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { workspaceProjectId, fortnoxProjectNumber, name } = await req.json();

    if (!workspaceProjectId || !fortnoxProjectNumber) {
      return Response.json({ error: 'Missing workspaceProjectId or fortnoxProjectNumber' }, { status: 400 });
    }

    const updatedProject = await base44.asServiceRole.entities.WorkspaceProject.update(workspaceProjectId, {
      fortnoxProjectNumber,
      ...(name ? { name } : {})
    });

    return Response.json({ success: true, project: updatedProject });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});