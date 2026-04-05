import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const FORTNOX_ACCESS_TOKEN = Deno.env.get('FORTNOX_ACCESS_TOKEN');
    if (!FORTNOX_ACCESS_TOKEN) {
      return Response.json({
        success: false,
        error: 'FORTNOX_ACCESS_TOKEN is not configured. Please add the secret in the app settings.'
      }, { status: 501 });
    }

    const { timeEntryId, projectNumber, employeeName, hours, hourlyRate, description, date } = await req.json();
    if (!timeEntryId || !projectNumber || !hours) {
      return Response.json({ error: 'Missing required fields: timeEntryId, projectNumber, hours' }, { status: 400 });
    }

    // Fetch project to get CustomerNumber
    let customerNumber = '';
    try {
      const projectResp = await fetch(`https://api.fortnox.se/3/projects/${projectNumber}`, {
        headers: {
          'Authorization': `Bearer ${FORTNOX_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      if (projectResp.ok) {
        const projectData = await projectResp.json();
        customerNumber = projectData?.Project?.InvoiceCustomerNumber || '';
      }
    } catch (e) {
      console.log('Could not fetch project customer:', e.message);
    }

    // Create Fortnox order
    const orderBody = {
      Order: {
        Project: projectNumber,
        OrderDate: date,
        OrderRows: [{
          Description: `${description || 'Arbetstid'} - ${employeeName || ''}`,
          OrderedQuantity: hours,
          Price: hourlyRate || 0,
          Unit: 'tim'
        }]
      }
    };
    if (customerNumber) orderBody.Order.CustomerNumber = customerNumber;

    const orderResp = await fetch('https://api.fortnox.se/3/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FORTNOX_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderBody)
    });

    if (!orderResp.ok) {
      const errData = await orderResp.json();
      return Response.json({ success: false, error: errData?.ErrorInformation?.message || 'Fortnox order creation failed' }, { status: 400 });
    }

    const orderData = await orderResp.json();
    const orderNumber = orderData?.Order?.DocumentNumber;

    // Update TimeEntry
    await base44.asServiceRole.entities.TimeEntry.update(timeEntryId, {
      fortnox_order_created: true,
      fortnox_order_number: orderNumber
    });

    return Response.json({ success: true, orderNumber });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});