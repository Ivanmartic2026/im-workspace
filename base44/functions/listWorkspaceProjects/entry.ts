import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const projects = await base44.asServiceRole.entities.WorkspaceProject.list();
    
    const result = projects.map(p => ({
      id: p.id,
      fortnoxProjectNumber: p.fortnoxProjectNumber,
      name: p.name,
      description: p.description,
      status: p.status,
      createdFromLager: p.createdFromLager
    }));

    return Response.json({ success: true, projects: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});