import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Denna funktion körs periodiskt för att automatiskt bearbeta körjournaler
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Hämta policy
    const policies = await base44.asServiceRole.entities.JournalPolicy.list();
    const policy = policies[0]; // Använd första policyn

    if (!policy || !policy.auto_categorize_enabled) {
      return Response.json({
        status: 'skipped',
        message: 'Automatisk bearbetning är inte aktiverad'
      });
    }

    // Hämta alla journalposter som väntar på ifyllning
    const entries = await base44.asServiceRole.entities.DrivingJournalEntry.filter({
      trip_type: 'väntar'
    });

    const results = {
      processed: 0,
      categorized: 0,
      flagged: 0,
      autoApproved: 0
    };

    for (const entry of entries) {
      let updated = false;
      const updateData = {};

      // 1. Automatisk kategorisering baserat på tid och plats
      if (policy.auto_categorize_enabled && entry.trip_type === 'väntar') {
        const category = categorizeTrip(entry, policy);
        if (category) {
          updateData.trip_type = category;
          updateData.notes = (entry.notes || '') + `\n[Auto] Kategoriserad som ${category} baserat på tid/plats`;
          results.categorized++;
          updated = true;
        }
      }

      // 2. Flagga ofullständiga resor
      const flags = checkCompleteness(entry, policy);
      if (flags.length > 0) {
        updateData.is_anomaly = true;
        updateData.anomaly_reason = flags.join('. ');
        results.flagged++;
        updated = true;
      }

      // 3. Auto-godkännande för korta resor
      if (
        entry.distance_km && 
        entry.distance_km < policy.auto_approve_threshold_km &&
        entry.trip_type !== 'väntar' &&
        !entry.is_anomaly
      ) {
        updateData.status = 'approved';
        updateData.reviewed_by = 'system';
        updateData.reviewed_at = new Date().toISOString();
        updateData.review_comment = `Automatiskt godkänd (kort resa < ${policy.auto_approve_threshold_km} km)`;
        results.autoApproved++;
        updated = true;
      }

      // Uppdatera posten om något ändrats
      if (updated) {
        await base44.asServiceRole.entities.DrivingJournalEntry.update(entry.id, updateData);
        results.processed++;
      }
    }

    return Response.json({
      status: 'success',
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});

// Kategorisera resa baserat på tid och plats
function categorizeTrip(entry, policy) {
  const startTime = new Date(entry.start_time);
  const hour = startTime.getHours();
  const dayOfWeek = startTime.getDay();

  // Kontrollera om det är en arbetsdag
  const isWorkDay = policy.work_days?.includes(dayOfWeek) ?? true;
  
  // Kontrollera om det är arbetstid
  let isWorkHours = true;
  if (policy.work_hours_start && policy.work_hours_end) {
    const [startH, startM] = policy.work_hours_start.split(':').map(Number);
    const [endH, endM] = policy.work_hours_end.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const currentMinutes = hour * 60 + startTime.getMinutes();
    isWorkHours = currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  // Kontrollera om resan startar eller slutar vid kontoret
  let startsAtOffice = false;
  let endsAtOffice = false;

  if (policy.office_locations && policy.office_locations.length > 0) {
    for (const office of policy.office_locations) {
      if (entry.start_location?.latitude && entry.start_location?.longitude) {
        const startDist = calculateDistance(
          entry.start_location.latitude,
          entry.start_location.longitude,
          office.latitude,
          office.longitude
        );
        if (startDist < (office.radius_meters || 500)) {
          startsAtOffice = true;
        }
      }

      if (entry.end_location?.latitude && entry.end_location?.longitude) {
        const endDist = calculateDistance(
          entry.end_location.latitude,
          entry.end_location.longitude,
          office.latitude,
          office.longitude
        );
        if (endDist < (office.radius_meters || 500)) {
          endsAtOffice = true;
        }
      }
    }
  }

  // Kategoriseringslogik
  if (isWorkDay && isWorkHours && (startsAtOffice || endsAtOffice)) {
    return 'tjänst';
  } else if (!isWorkDay || !isWorkHours) {
    return 'privat';
  }

  // Om vi inte kan bestämma med säkerhet, returnera null
  return null;
}

// Kontrollera om resan är fullständig
function checkCompleteness(entry, policy) {
  const flags = [];

  // Saknar förare
  if (!entry.driver_name || !entry.driver_email) {
    flags.push('Saknar förarenamn');
  }

  // Saknar syfte för långa resor
  if (
    policy.require_purpose_over_km &&
    entry.distance_km > policy.require_purpose_over_km &&
    (!entry.purpose || entry.purpose.trim().length < 5)
  ) {
    flags.push(`Saknar syfte (resa > ${policy.require_purpose_over_km} km)`);
  }

  // Ovanligt lång resa
  if (entry.distance_km > 500) {
    flags.push('Ovanligt lång resa (> 500 km)');
  }

  // Ovanligt lång tid
  if (entry.duration_minutes > 480) { // 8 timmar
    flags.push('Ovanligt lång tid (> 8 timmar)');
  }

  return flags;
}

// Beräkna avstånd mellan två koordinater (Haversine-formeln)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Jordens radie i meter
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Avstånd i meter
}