import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const ALLOWED_ENTITIES = [
  'TimeEntry',
  'Employee',
  'User',
  'Project',
  'DrivingJournalEntry',
  'Vehicle',
  'LeaveRequest',
  'WeeklyReport',
  'FuelLog',
  'MaintenanceIssue',
  'NewsPost',
  'ApprovalRequest',
  'ProjectTask',
  'ProjectExpense',
];

Deno.serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse body
    let body = {};
    if (req.method === 'POST') {
      body = await req.json();
    } else if (req.method === 'GET') {
      const url = new URL(req.url);
      body.secret = url.searchParams.get('secret');
      body.entity = url.searchParams.get('entity');
      body.since = url.searchParams.get('since');
      body.limit = url.searchParams.get('limit');
    }

    // Validate secret
    const expectedSecret = Deno.env.get('EXPORT_API_SECRET');
    if (!body.secret || body.secret !== expectedSecret) {
      return Response.json({ error: 'Unauthorized: Invalid secret' }, { status: 401, headers: corsHeaders });
    }

    // If no entity specified, return list of available entities
    if (!body.entity) {
      return Response.json({
        available_entities: ALLOWED_ENTITIES,
        usage: {
          method: 'POST or GET',
          params: {
            secret: 'required - your API secret',
            entity: 'required - one of the available_entities',
            since: 'optional - ISO datetime string e.g. 2026-01-01T00:00:00Z',
            limit: 'optional - max number of records (default 1000)',
          },
          example_post: {
            secret: '<your-secret>',
            entity: 'TimeEntry',
            since: '2026-03-01T00:00:00Z',
            limit: 500,
          },
        },
      }, { headers: corsHeaders });
    }

    // Validate entity
    if (!ALLOWED_ENTITIES.includes(body.entity)) {
      return Response.json({
        error: `Invalid entity. Allowed: ${ALLOWED_ENTITIES.join(', ')}`,
      }, { status: 400, headers: corsHeaders });
    }

    const base44 = createClientFromRequest(req);
    const limit = parseInt(body.limit) || 1000;

    let data;

    if (body.since) {
      // Filter by updated_date >= since
      data = await base44.asServiceRole.entities[body.entity].filter(
        { updated_date: { $gte: body.since } },
        '-updated_date',
        limit
      );
    } else {
      data = await base44.asServiceRole.entities[body.entity].list('-updated_date', limit);
    }

    return Response.json({
      entity: body.entity,
      count: data.length,
      since: body.since || null,
      fetched_at: new Date().toISOString(),
      data,
    }, { headers: corsHeaders });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
});