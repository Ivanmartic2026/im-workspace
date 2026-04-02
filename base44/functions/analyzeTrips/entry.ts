import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entryIds } = await req.json();
    
    if (!entryIds || entryIds.length === 0) {
      return Response.json({ error: 'No entries provided' }, { status: 400 });
    }

    // Hämta körjournalsposter
    const entries = await base44.asServiceRole.entities.DrivingJournalEntry.filter({
      id: { $in: entryIds }
    });

    if (entries.length === 0) {
      return Response.json({ error: 'No entries found' }, { status: 404 });
    }

    // Hämta historiska poster för kontextinformation
    const historicalEntries = await base44.asServiceRole.entities.DrivingJournalEntry.filter({
      driver_email: user.email,
      status: 'approved',
      trip_type: 'tjänst'
    }, '-created_date', 50);

    // Hämta körjournalpolicy för kontext
    const policies = await base44.asServiceRole.entities.JournalPolicy.list();
    const policy = policies[0];

    // Skapa kontext för LLM
    const contextData = {
      workHours: policy ? {
        start: policy.work_hours_start,
        end: policy.work_hours_end,
        days: policy.work_days
      } : null,
      officeLocations: policy?.office_locations || [],
      historicalPatterns: historicalEntries.slice(0, 10).map(e => ({
        purpose: e.purpose,
        projectCode: e.project_code,
        customer: e.customer,
        startLocation: e.start_location?.address,
        endLocation: e.end_location?.address,
        distance: e.distance_km,
        startTime: e.start_time
      }))
    };

    // Analysera varje post med LLM
    const analyzedEntries = [];

    for (const entry of entries) {
      const prompt = `Du är en AI-assistent som hjälper till att klassificera körjournalsposter.

KONTEXT:
${contextData.workHours ? `Arbetstider: ${contextData.workHours.start}-${contextData.workHours.end}, dagar: ${contextData.workHours.days.join(', ')}` : 'Arbetstider ej definierade'}
${contextData.officeLocations.length > 0 ? `Kontor: ${contextData.officeLocations.map(l => l.name).join(', ')}` : 'Inga kontor definierade'}

HISTORISKA TJÄNSTERESOR (för mönsterigenkänning):
${contextData.historicalPatterns.map(p => 
  `- Syfte: ${p.purpose || 'Ej angivet'}, Projekt: ${p.projectCode || 'Ej angivet'}, Kund: ${p.customer || 'Ej angivet'}, Plats: ${p.startLocation} → ${p.endLocation}, Sträcka: ${p.distance}km`
).join('\n')}

RESA ATT ANALYSERA:
- Starttid: ${entry.start_time}
- Sluttid: ${entry.end_time}
- Startplats: ${entry.start_location?.address || 'Okänd'}
- Slutplats: ${entry.end_location?.address || 'Okänd'}
- Sträcka: ${entry.distance_km}km
- Varaktighet: ${entry.duration_minutes} minuter

Analysera resan och ge förslag på:
1. Typ (tjänst eller privat) - tjänst om det är under arbetstid, till kända arbetsplatser/kunder, eller matchar historiska mönster
2. Syfte (om tjänsteresa)
3. Projektkod (om det finns liknande i historiken)
4. Kund (om det finns liknande i historiken)
5. Konfidensgrad (0-100%) för klassificeringen

Svara ENDAST med JSON i exakt detta format:
{
  "tripType": "tjänst" eller "privat",
  "purpose": "Kort beskrivning av syfte",
  "projectCode": "Projektkod eller null",
  "customer": "Kundnamn eller null",
  "confidence": 85,
  "reasoning": "Kort förklaring till klassificeringen"
}`;

      try {
        const analysis = await base44.integrations.Core.InvokeLLM({
          prompt: prompt,
          response_json_schema: {
            type: "object",
            properties: {
              tripType: { type: "string", enum: ["tjänst", "privat"] },
              purpose: { type: "string" },
              projectCode: { type: ["string", "null"] },
              customer: { type: ["string", "null"] },
              confidence: { type: "number" },
              reasoning: { type: "string" }
            },
            required: ["tripType", "confidence", "reasoning"]
          }
        });

        analyzedEntries.push({
          entryId: entry.id,
          originalEntry: entry,
          suggestion: analysis
        });
      } catch (error) {
        console.error('Error analyzing entry:', error);
        analyzedEntries.push({
          entryId: entry.id,
          originalEntry: entry,
          error: 'Kunde inte analysera resan'
        });
      }
    }

    return Response.json({
      analyzed: analyzedEntries.length,
      suggestions: analyzedEntries
    });

  } catch (error) {
    console.error('Error in analyzeTrips:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});