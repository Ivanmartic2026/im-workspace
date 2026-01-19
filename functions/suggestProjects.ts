import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userEmail, currentTime } = await req.json();

    // Hämta användarens tidigare tidsposter
    const allTimeEntries = await base44.asServiceRole.entities.TimeEntry.list('-created_date', 100);
    const userEntries = allTimeEntries.filter(e => e.employee_email === userEmail);

    // Hämta alla projekt
    const allProjects = await base44.asServiceRole.entities.Project.list();
    const activeProjects = allProjects.filter(p => p.status === 'pågående');

    // Hämta schemalagda händelser för idag
    const today = new Date().toISOString().split('T')[0];
    const todayStart = new Date(today + 'T00:00:00Z').toISOString();
    const todayEnd = new Date(today + 'T23:59:59Z').toISOString();
    
    const scheduleEvents = await base44.asServiceRole.entities.ScheduleEvent.list();
    const todayEvents = scheduleEvents.filter(event => {
      const eventStart = new Date(event.start_time);
      return eventStart >= new Date(todayStart) && eventStart <= new Date(todayEnd) &&
             event.assigned_to?.includes(userEmail);
    });

    // Bygg kontext för AI
    const recentProjects = {};
    userEntries.forEach(entry => {
      if (entry.project_allocations) {
        entry.project_allocations.forEach(alloc => {
          if (!recentProjects[alloc.project_id]) {
            recentProjects[alloc.project_id] = 0;
          }
          recentProjects[alloc.project_id] += alloc.hours || 0;
        });
      }
    });

    const sortedProjects = Object.entries(recentProjects)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Dagens veckodag och tid
    const now = new Date(currentTime || new Date());
    const dayOfWeek = now.toLocaleDateString('sv-SE', { weekday: 'long' });
    const timeOfDay = now.getHours();

    // AI-prompt
    const prompt = `Du är en AI-assistent för tidsrapportering. Analysera följande data och föreslå de 3 mest sannolika projekten för användaren att arbeta på just nu.

ANVÄNDARDATA:
- Email: ${userEmail}
- Dag: ${dayOfWeek}
- Tid: ${now.toLocaleTimeString('sv-SE')}
- Tidpunkt på dagen: ${timeOfDay < 12 ? 'förmiddag' : timeOfDay < 18 ? 'eftermiddag' : 'kväll'}

AKTIVA PROJEKT:
${activeProjects.map(p => `- ${p.name} (${p.project_code}): ${p.description || 'Ingen beskrivning'}`).join('\n')}

SENASTE PROJEKTARBETE (totalt antal timmar):
${sortedProjects.map(([projectId, hours]) => {
  const project = activeProjects.find(p => p.id === projectId);
  return `- ${project?.name || 'Okänt projekt'}: ${hours.toFixed(1)}h`;
}).join('\n')}

DAGENS SCHEMALAGDA HÄNDELSER:
${todayEvents.length > 0 ? todayEvents.map(e => `- ${e.title} (${new Date(e.start_time).toLocaleTimeString('sv-SE')})`).join('\n') : 'Inga schemalagda händelser'}

INSTRUKTIONER:
1. Basera dina förslag på användarens historik, schemalagda händelser och tid på dagen
2. Prioritera projekt som användaren arbetat mest på nyligen
3. Ta hänsyn till schemalagda möten/händelser
4. Ge en kort motivering (max 10 ord) för varje förslag

Svara ENDAST med JSON i följande format (inget annat text):
{
  "suggestions": [
    {
      "project_id": "projekt-id",
      "project_name": "Projektnamn",
      "confidence": 0.95,
      "reason": "Kort motivering"
    }
  ]
}`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          suggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                project_id: { type: "string" },
                project_name: { type: "string" },
                confidence: { type: "number" },
                reason: { type: "string" }
              }
            }
          }
        }
      }
    });

    // Matcha AI:s förslag med faktiska projekt-ID:n
    const suggestions = aiResponse.suggestions.map(suggestion => {
      const matchedProject = activeProjects.find(p => 
        p.name === suggestion.project_name || 
        p.project_code === suggestion.project_name
      );
      return {
        ...suggestion,
        project_id: matchedProject?.id || suggestion.project_id,
        matched: !!matchedProject
      };
    }).filter(s => s.matched).slice(0, 3);

    return Response.json({
      suggestions,
      context: {
        recentProjectCount: sortedProjects.length,
        todayEventsCount: todayEvents.length,
        activeProjectsCount: activeProjects.length
      }
    });

  } catch (error) {
    console.error('Error in suggestProjects:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});