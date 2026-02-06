import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { timeEntryId } = await req.json();

        if (!timeEntryId) {
            return Response.json({ error: 'timeEntryId krävs' }, { status: 400 });
        }

        // Hämta tidrapport
        const timeEntry = await base44.asServiceRole.entities.TimeEntry.get(timeEntryId);
        
        if (!timeEntry) {
            return Response.json({ error: 'Tidrapport hittades inte' }, { status: 404 });
        }

        // Hämta projekt från project_allocations eller project_id
        let projectIds = [];
        if (timeEntry.project_allocations && timeEntry.project_allocations.length > 0) {
            projectIds = timeEntry.project_allocations.map(alloc => alloc.project_id);
        } else if (timeEntry.project_id) {
            projectIds = [timeEntry.project_id];
        }

        if (projectIds.length === 0) {
            return Response.json({ message: 'Ingen projekt kopplad, ingen rapport skickas' });
        }

        // Hämta alla projekt
        const allProjects = await base44.asServiceRole.entities.Project.list();
        const projects = allProjects.filter(p => projectIds.includes(p.id));

        // Kontrollera om något av projekten har tidslinje
        const projectsWithTimeline = projects.filter(p => p.start_date && p.end_date);

        if (projectsWithTimeline.length === 0) {
            return Response.json({ message: 'Inget projekt har tidslinje, ingen rapport skickas' });
        }

        // Hämta anställd info
        const employees = await base44.asServiceRole.entities.Employee.filter({
            user_email: timeEntry.employee_email
        });
        const employee = employees[0];
        const employeeName = employee?.user_email || timeEntry.employee_email;

        // Skapa rapport
        const date = new Date(timeEntry.date).toLocaleDateString('sv-SE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const clockIn = new Date(timeEntry.clock_in_time).toLocaleTimeString('sv-SE', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const clockOut = timeEntry.clock_out_time 
            ? new Date(timeEntry.clock_out_time).toLocaleTimeString('sv-SE', {
                hour: '2-digit',
                minute: '2-digit'
              })
            : 'Pågående';

        let projectDetails = '';
        if (timeEntry.project_allocations && timeEntry.project_allocations.length > 0) {
            projectDetails = timeEntry.project_allocations.map(alloc => {
                const project = projects.find(p => p.id === alloc.project_id);
                return `
                    <tr>
                        <td style="padding: 8px; border: 1px solid #e2e8f0;">${project?.name || alloc.project_id}</td>
                        <td style="padding: 8px; border: 1px solid #e2e8f0;">${project?.project_code || '-'}</td>
                        <td style="padding: 8px; border: 1px solid #e2e8f0;">${alloc.hours} timmar</td>
                        <td style="padding: 8px; border: 1px solid #e2e8f0;">${alloc.category || '-'}</td>
                    </tr>
                `;
            }).join('');
        } else {
            const project = projects[0];
            projectDetails = `
                <tr>
                    <td style="padding: 8px; border: 1px solid #e2e8f0;">${project?.name || timeEntry.project_id}</td>
                    <td style="padding: 8px; border: 1px solid #e2e8f0;">${project?.project_code || '-'}</td>
                    <td style="padding: 8px; border: 1px solid #e2e8f0;">${timeEntry.total_hours || 0} timmar</td>
                    <td style="padding: 8px; border: 1px solid #e2e8f0;">${timeEntry.category || '-'}</td>
                </tr>
            `;
        }

        const emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1e293b; margin-bottom: 20px;">Tidrapport - ${date}</h2>
                
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="margin: 5px 0;"><strong>Medarbetare:</strong> ${employeeName}</p>
                    <p style="margin: 5px 0;"><strong>Datum:</strong> ${date}</p>
                    <p style="margin: 5px 0;"><strong>Incheckning:</strong> ${clockIn}</p>
                    <p style="margin: 5px 0;"><strong>Utcheckning:</strong> ${clockOut}</p>
                    <p style="margin: 5px 0;"><strong>Total tid:</strong> ${timeEntry.total_hours || 0} timmar</p>
                    ${timeEntry.total_break_minutes ? `<p style="margin: 5px 0;"><strong>Rast:</strong> ${timeEntry.total_break_minutes} minuter</p>` : ''}
                </div>

                <h3 style="color: #1e293b; margin-top: 30px;">Projekttid</h3>
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                    <thead>
                        <tr style="background-color: #1e293b; color: white;">
                            <th style="padding: 10px; text-align: left; border: 1px solid #1e293b;">Projekt</th>
                            <th style="padding: 10px; text-align: left; border: 1px solid #1e293b;">Projektkod</th>
                            <th style="padding: 10px; text-align: left; border: 1px solid #1e293b;">Timmar</th>
                            <th style="padding: 10px; text-align: left; border: 1px solid #1e293b;">Kategori</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${projectDetails}
                    </tbody>
                </table>

                ${timeEntry.notes ? `
                    <div style="margin-top: 20px; padding: 15px; background-color: #fef3c7; border-radius: 8px;">
                        <strong>Anteckningar:</strong> ${timeEntry.notes}
                    </div>
                ` : ''}

                ${timeEntry.clock_in_location ? `
                    <div style="margin-top: 20px; padding: 15px; background-color: #f0f9ff; border-radius: 8px;">
                        <strong>Plats:</strong> ${timeEntry.clock_in_location.address || 'Okänd plats'}
                    </div>
                ` : ''}
            </div>
        `;

        // Skicka e-post
        await base44.asServiceRole.integrations.Core.SendEmail({
            to: 'info@imvision.se',
            subject: `Tidrapport - ${employeeName} - ${date}`,
            body: emailBody
        });

        return Response.json({ 
            success: true, 
            message: 'Projektrapport skickad till info@imvision.se'
        });

    } catch (error) {
        console.error('Error sending project time report:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});