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

    // Hämta alla godkända historiska resor för ML-baserad klassificering
    const historicalEntries = await base44.asServiceRole.entities.DrivingJournalEntry.filter({
      status: 'approved'
    });

    const results = {
      processed: 0,
      categorized: 0,
      flagged: 0,
      autoApproved: 0,
      suggestions: 0
    };

    for (const entry of entries) {
      let updated = false;
      const updateData = {};

      // 1. Intelligent kategorisering baserat på historisk data och mönster
      if (policy.auto_categorize_enabled && entry.trip_type === 'väntar') {
        const suggestion = await suggestClassification(entry, historicalEntries, policy);
        
        if (suggestion) {
          updateData.trip_type = suggestion.trip_type;
          updateData.suggested_classification = {
            ...suggestion,
            timestamp: new Date().toISOString()
          };
          
          // Om tjänsteresa, lägg till förslag på syfte, projekt, kund
          if (suggestion.trip_type === 'tjänst') {
            if (suggestion.purpose) updateData.purpose = suggestion.purpose;
            if (suggestion.project_code) updateData.project_code = suggestion.project_code;
            if (suggestion.customer) updateData.customer = suggestion.customer;
          }
          
          updateData.notes = (entry.notes || '') + `\n[AI] Föreslagen klassificering baserat på ${suggestion.reasoning}`;
          results.suggestions++;
          updated = true;
        } else {
          // Fallback till enkel kategorisering
          const category = categorizeTrip(entry, policy);
          if (category) {
            updateData.trip_type = category;
            updateData.notes = (entry.notes || '') + `\n[Auto] Kategoriserad som ${category} baserat på tid/plats`;
            results.categorized++;
            updated = true;
          }
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

// Föreslå klassificering baserat på historisk data
async function suggestClassification(entry, historicalEntries, policy) {
  if (!historicalEntries || historicalEntries.length === 0) {
    return null;
  }

  // Filtrera historiska resor för samma förare och fordon
  const relevantHistory = historicalEntries.filter(h => 
    h.driver_email === entry.driver_email &&
    h.vehicle_id === entry.vehicle_id &&
    h.trip_type !== 'väntar'
  );

  if (relevantHistory.length === 0) {
    return null;
  }

  // Hitta liknande resor baserat på:
  // 1. Samma start/slutpunkt (inom 500m radie)
  // 2. Samma tid på dagen (±2 timmar)
  // 3. Liknande avstånd (±20%)
  
  const startTime = new Date(entry.start_time);
  const entryHour = startTime.getHours();
  const entryDistance = entry.distance_km || 0;

  const similarTrips = relevantHistory.filter(h => {
    const hStartTime = new Date(h.start_time);
    const hHour = hStartTime.getHours();
    const timeDiff = Math.abs(entryHour - hHour);
    
    // Kontrollera tid
    if (timeDiff > 2) return false;
    
    // Kontrollera avstånd
    const hDistance = h.distance_km || 0;
    if (entryDistance > 0 && hDistance > 0) {
      const distanceDiff = Math.abs(entryDistance - hDistance) / entryDistance;
      if (distanceDiff > 0.3) return false;
    }
    
    // Kontrollera start/slut position
    if (entry.start_location?.latitude && h.start_location?.latitude) {
      const startDist = calculateDistance(
        entry.start_location.latitude,
        entry.start_location.longitude,
        h.start_location.latitude,
        h.start_location.longitude
      );
      
      const endDist = entry.end_location?.latitude && h.end_location?.latitude ?
        calculateDistance(
          entry.end_location.latitude,
          entry.end_location.longitude,
          h.end_location.latitude,
          h.end_location.longitude
        ) : Infinity;
      
      // Acceptera om start ELLER slut är nära
      return startDist < 500 || endDist < 500;
    }
    
    return true;
  });

  if (similarTrips.length === 0) {
    return null;
  }

  // Räkna vanligaste klassificeringen
  const classificationCounts = {};
  const purposeCounts = {};
  const projectCounts = {};
  const customerCounts = {};

  similarTrips.forEach(trip => {
    classificationCounts[trip.trip_type] = (classificationCounts[trip.trip_type] || 0) + 1;
    if (trip.purpose) purposeCounts[trip.purpose] = (purposeCounts[trip.purpose] || 0) + 1;
    if (trip.project_code) projectCounts[trip.project_code] = (projectCounts[trip.project_code] || 0) + 1;
    if (trip.customer) customerCounts[trip.customer] = (customerCounts[trip.customer] || 0) + 1;
  });

  // Hitta vanligaste
  const mostCommonType = Object.keys(classificationCounts).reduce((a, b) => 
    classificationCounts[a] > classificationCounts[b] ? a : b
  );
  
  const confidence = classificationCounts[mostCommonType] / similarTrips.length;
  
  // Kräv minst 60% konfidens
  if (confidence < 0.6) {
    return null;
  }

  const suggestion = {
    trip_type: mostCommonType,
    confidence: confidence,
    reasoning: `${similarTrips.length} tidigare liknande resor`,
    similar_trips_count: similarTrips.length
  };

  // Lägg till förslag för tjänsteresor
  if (mostCommonType === 'tjänst') {
    const mostCommonPurpose = Object.keys(purposeCounts).length > 0 ?
      Object.keys(purposeCounts).reduce((a, b) => purposeCounts[a] > purposeCounts[b] ? a : b) : null;
    const mostCommonProject = Object.keys(projectCounts).length > 0 ?
      Object.keys(projectCounts).reduce((a, b) => projectCounts[a] > projectCounts[b] ? a : b) : null;
    const mostCommonCustomer = Object.keys(customerCounts).length > 0 ?
      Object.keys(customerCounts).reduce((a, b) => customerCounts[a] > customerCounts[b] ? a : b) : null;
    
    if (mostCommonPurpose) suggestion.purpose = mostCommonPurpose;
    if (mostCommonProject) suggestion.project_code = mostCommonProject;
    if (mostCommonCustomer) suggestion.customer = mostCommonCustomer;
  }

  return suggestion;
}