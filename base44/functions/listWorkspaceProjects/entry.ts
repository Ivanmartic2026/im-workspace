import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const projects = await base44.asServiceRole.entities.Project.list();
    return Response.json({ success: true, projects });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});