import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { timeEntryId } = await req.json();

    if (!timeEntryId) {
      return Response.json({ error: 'timeEntryId is required' }, { status: 400 });
    }

    // Hämta tidsposten
    const timeEntries = await base44.asServiceRole.entities.TimeEntry.filter({ id: timeEntryId });
    const timeEntry = timeEntries[0];

    if (!timeEntry) {
      return Response.json({ error: 'Time entry not found' }, { status: 404 });
    }

    // Om redan har projektfördelning, returnera den
    if (timeEntry.project_allocations && timeEntry.project_allocations.length > 0) {
      return Response.json({
        draft: timeEntry.project_allocations,
        message: 'Existing allocation found'
      });
    }

    // Hämta användarens tidigare tidsposter
    const allTimeEntries = await base44.asServiceRole.entities.TimeEntry.list('-created_date', 50);
    const userEntries = allTimeEntries.filter(e => 
      e.employee_email === timeEntry.employee_email && 
      e.id !== timeEntryId &&
      e.project_allocations && 
      e.project_allocations.length > 0
    );

    // Hämta alla projekt
    const allProjects = await base44.asServiceRole.entities.Project.list();
    const activeProjects = allProjects.filter(p => p.status === 'pågående');

    // Hämta schemalagda händelser för samma dag
    const entryDate = new Date(timeEntry.clock_in_time);
    const dayStart = new Date(entryDate.toISOString().split('T')[0] + 'T00:00:00Z').toISOString();
    const dayEnd = new Date(entryDate.toISOString().split('T')[0] + 'T23:59:59Z').toISOString();
    
    const scheduleEvents = await base44.asServiceRole.entities.ScheduleEvent.list();
    const dayEvents = scheduleEvents.filter(event => {
      const eventStart = new Date(event.start_time);
      return eventStart >= new Date(dayStart) && eventStart <= new Date(dayEnd) &&
             event.assigned_to?.includes(timeEntry.employee_email);
    });

    // Bygg AI-kontext
    const recentAllocations = {};
    userEntries.forEach(entry => {
      entry.project_allocations.forEach(alloc => {
        if (!recentAllocations[alloc.project_id]) {
          recentAllocations[alloc.project_id] = { count: 0, totalHours: 0 };
        }
        recentAllocations[alloc.project_id].count++;
        recentAllocations[alloc.project_id].totalHours += alloc.hours || 0;
      });
    });

    const totalHours = timeEntry.total_hours || 0;
    const clockInTime = new Date(timeEntry.clock_in_time);
    const dayOfWeek = clockInTime.toLocaleDateString('sv-SE', { weekday: 'long' });
    const workStartHour = clockInTime.getHours();

    const prompt = `Du är en AI-assistent för tidsrapportering. Skapa ett utkast för hur användarens arbetstid ska fördelas på projekt.

TIDSPOST:
- Datum: ${dayOfWeek}, ${clockInTime.toLocaleDateString('sv-SE')}
- Starttid: ${clockInTime.toLocaleTimeString('sv-SE')}
- Total arbetstid: ${totalHours.toFixed(2)} timmar
- Plats vid incheckning: ${timeEntry.clock_in_location?.address || 'Okänd'}
${timeEntry.notes ? `- Anteckningar: ${timeEntry.notes}` : ''}

AKTIVA PROJEKT:
${activeProjects.map(p => `- ID: ${p.id}, Namn: ${p.name} (${p.project_code}), Typ: ${p.type || 'externt'}`).join('\n')}

ANVÄNDARENS SENASTE PROJEKTFÖRDELNINGAR:
${Object.entries(recentAllocations).map(([projectId, data]) => {
  const project = activeProjects.find(p => p.id === projectId);
  return `- ${project?.name || 'Okänt'}: ${data.count} tillfällen, ${data.totalHours.toFixed(1)}h totalt`;
}).join('\n')}

DAGENS SCHEMALAGDA HÄNDELSER:
${dayEvents.length > 0 ? dayEvents.map(e => `- ${e.title} (${new Date(e.start_time).toLocaleTimeString('sv-SE')})`).join('\n') : 'Inga schemalagda händelser'}

INSTRUKTIONER:
1. Fördela de ${totalHours.toFixed(2)} timmarna på 1-3 projekt
2. Använd användarens historik som grund
3. Ta hänsyn till schemalagda möten/händelser
4. Om det finns möten, överväg att fördela tid på relevanta projekt
5. Totalt antal timmar MÅSTE vara exakt ${totalHours.toFixed(2)}h
6. Ange också vilken kategori arbetet tillhör (support_service, install, rental, eller interntid)
7. Lägg till en kort kommentar som förklarar fördelningen

Svara ENDAST med JSON i följande format (inget annat text):
{
  "allocations": [
    {
      "project_id": "projekt-id-från-listan",
      "hours": 4.5,
      "category": "support_service",
      "notes": "Kort beskrivning"
    }
  ],
  "summary": "Kort sammanfattning av fördelningen (max 20 ord)"
}`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          allocations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                project_id: { type: "string" },
                hours: { type: "number" },
                category: { type: "string" },
                notes: { type: "string" }
              }
            }
          },
          summary: { type: "string" }
        }
      }
    });

    // Validera att projekt-ID:n existerar och summan stämmer
    const validatedAllocations = aiResponse.allocations.filter(alloc => 
      activeProjects.some(p => p.id === alloc.project_id)
    );

    const allocatedTotal = validatedAllocations.reduce((sum, alloc) => sum + alloc.hours, 0);
    const difference = Math.abs(allocatedTotal - totalHours);

    // Justera om skillnaden är för stor (mer än 0.1h)
    if (difference > 0.1 && validatedAllocations.length > 0) {
      const adjustment = (totalHours - allocatedTotal) / validatedAllocations.length;
      validatedAllocations.forEach(alloc => {
        alloc.hours = Number((alloc.hours + adjustment).toFixed(2));
      });
    }

    return Response.json({
      draft: validatedAllocations,
      summary: aiResponse.summary,
      confidence: validatedAllocations.length > 0 ? 'high' : 'low',
      metadata: {
        totalAllocated: validatedAllocations.reduce((sum, a) => sum + a.hours, 0),
        expectedTotal: totalHours,
        basedOnHistory: Object.keys(recentAllocations).length > 0,
        basedOnSchedule: dayEvents.length > 0
      }
    });

  } catch (error) {
    console.error('Error in generateDraftTimeReport:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});