import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entryIds } = await req.json();

    if (!entryIds || !Array.isArray(entryIds)) {
      return Response.json({ error: 'Invalid entry IDs' }, { status: 400 });
    }

    const entries = [];
    const vehicles = await base44.asServiceRole.entities.Vehicle.list();
    const policies = await base44.asServiceRole.entities.MileagePolicy.filter({ is_active: true });

    for (const entryId of entryIds) {
      const entry = await base44.asServiceRole.entities.DrivingJournalEntry.filter({ id: entryId });
      if (entry.length > 0) {
        entries.push(entry[0]);
      }
    }

    const updates = [];

    for (const entry of entries) {
      if (entry.trip_type !== 'tjänst') continue;

      const vehicle = vehicles.find(v => v.id === entry.vehicle_id);
      if (!vehicle) continue;

      // Hitta matchande policy
      const policy = policies.find(p => p.vehicle_type === vehicle.vehicle_type);
      if (!policy) continue;

      const allowance = entry.distance_km * policy.rate_per_km;

      updates.push({
        id: entry.id,
        data: {
          mileage_allowance: allowance,
          mileage_policy_id: policy.id
        }
      });
    }

    // Uppdatera alla entries
    for (const update of updates) {
      await base44.asServiceRole.entities.DrivingJournalEntry.update(update.id, update.data);
    }

    return Response.json({
      success: true,
      updated: updates.length,
      total_allowance: updates.reduce((sum, u) => sum + u.data.mileage_allowance, 0)
    });

  } catch (error) {
    console.error('Error calculating mileage allowance:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});