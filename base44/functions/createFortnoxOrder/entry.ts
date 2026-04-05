import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const token = Deno.env.get('FORTNOX_ACCESS_TOKEN');
    if (!token) {
      return Response.json({ error: 'FORTNOX_ACCESS_TOKEN not configured' }, { status: 500 });
    }

    const { timeEntryId, projectNumber, employeeName, hours, hourlyRate, description, date } = await req.json();
    if (!timeEntryId || !projectNumber || !hours) {
      return Response.json({ error: 'Missing required fields: timeEntryId, projectNumber, hours' }, { status: 400 });
    }

    // Fetch project to get CustomerNumber
    // Fetch project to get CustomerNumber
    let customerNumber = '1';
    try {
      const projectResp = await fetch(`https://api.fortnox.se/3/projects/${projectNumber}`, {
        headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
      });
      if (projectResp.ok) {
        const projectData = await projectResp.json();
        customerNumber = projectData?.Project?.CustomerNumber || '1';
      }
    } catch (e) {
      console.log('Could not fetch project customer:', e.message);
    }

    // Create Fortnox order
    const orderBody = {
      Order: {
        Project: projectNumber,
        CustomerNumber: customerNumber,
        OrderDate: date,
        Remarks: `Automatiskt skapad från IM Workspace - ${employeeName || ''}`,
        OrderRows: [{
          Description: `${description || 'Arbetstid'} - ${employeeName || ''}`,
          OrderedQuantity: String(hours),
          Price: String(hourlyRate || 0),
          Unit: 'tim'
        }]
      }
    };

    const orderResp = await fetch('https://api.fortnox.se/3/orders', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(orderBody)
    });

    if (!orderResp.ok) {
      const errData = await orderResp.json();
      const errMsg = errData?.ErrorInformation?.message || errData?.message || 'Fortnox order creation failed';
      return Response.json({ success: false, error: errMsg }, { status: 400 });
    }

    const orderData = await orderResp.json();
    const orderNumber = orderData?.Order?.DocumentNumber;

    // Update TimeEntry
    await base44.asServiceRole.entities.TimeEntry.update(timeEntryId, {
      fortnox_order_created: true,
      fortnox_order_number: orderNumber
    });

    return Response.json({ success: true, orderNumber, message: `Order ${orderNumber} skapad i Fortnox` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});