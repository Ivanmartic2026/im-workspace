import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Beräkna förra veckan (måndag till söndag)
        const today = new Date();
        const dayOfWeek = today.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        
        const lastMonday = new Date(today);
        lastMonday.setDate(today.getDate() - daysToMonday - 7);
        lastMonday.setHours(0, 0, 0, 0);
        
        const lastSunday = new Date(lastMonday);
        lastSunday.setDate(lastMonday.getDate() + 6);
        lastSunday.setHours(23, 59, 59, 999);

        // Hämta alla tidrapporter från förra veckan
        const allTimeEntries = await base44.asServiceRole.entities.TimeEntry.list();
        const weekEntries = allTimeEntries.filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate >= lastMonday && entryDate <= lastSunday && entry.status === 'completed';
        });

        if (weekEntries.length === 0) {
            return Response.json({ 
                message: 'Inga tidrapporter för förra veckan' 
            });
        }

        // Hämta all nödvändig data
        const [allProjects, allEmployees] = await Promise.all([
            base44.asServiceRole.entities.Project.list(),
            base44.asServiceRole.entities.Employee.list()
        ]);

        // Gruppera per anställd
        const employeeSummary = {};
        weekEntries.forEach(entry => {
            if (!employeeSummary[entry.employee_email]) {
                const employee = allEmployees.find(e => e.user_email === entry.employee_email);
                employeeSummary[entry.employee_email] = {
                    name: entry.employee_email,
                    department: employee?.department || '-',
                    totalHours: 0,
                    entries: []
                };
            }
            employeeSummary[entry.employee_email].totalHours += entry.total_hours || 0;
            employeeSummary[entry.employee_email].entries.push(entry);
        });

        // Gruppera per projekt
        const projectSummary = {};
        weekEntries.forEach(entry => {
            let projectAllocations = [];
            
            if (entry.project_allocations && entry.project_allocations.length > 0) {
                projectAllocations = entry.project_allocations;
            } else if (entry.project_id) {
                projectAllocations = [{
                    project_id: entry.project_id,
                    hours: entry.total_hours || 0
                }];
            }

            projectAllocations.forEach(alloc => {
                if (!projectSummary[alloc.project_id]) {
                    const project = allProjects.find(p => p.id === alloc.project_id);
                    projectSummary[alloc.project_id] = {
                        name: project?.name || alloc.project_id,
                        code: project?.project_code || '-',
                        totalHours: 0,
                        employees: new Set()
                    };
                }
                projectSummary[alloc.project_id].totalHours += alloc.hours;
                projectSummary[alloc.project_id].employees.add(entry.employee_email);
            });
        });

        // Totaler
        const totalHours = weekEntries.reduce((sum, entry) => sum + (entry.total_hours || 0), 0);
        const totalEmployees = Object.keys(employeeSummary).length;
        const totalProjects = Object.keys(projectSummary).length;

        // Skapa HTML-rapport
        const weekNumber = Math.ceil(((lastMonday - new Date(lastMonday.getFullYear(), 0, 1)) / 86400000 + 1) / 7);
        const dateRange = `${lastMonday.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })} - ${lastSunday.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' })}`;

        // Medarbetarsammanställning
        const employeeRows = Object.values(employeeSummary)
            .sort((a, b) => b.totalHours - a.totalHours)
            .map(emp => `
                <tr>
                    <td style="padding: 10px; border: 1px solid #e2e8f0;">${emp.name}</td>
                    <td style="padding: 10px; border: 1px solid #e2e8f0;">${emp.department}</td>
                    <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${emp.totalHours.toFixed(1)}</td>
                    <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: center;">${emp.entries.length}</td>
                </tr>
            `).join('');

        // Projektsammanställning
        const projectRows = Object.values(projectSummary)
            .sort((a, b) => b.totalHours - a.totalHours)
            .map(proj => `
                <tr>
                    <td style="padding: 10px; border: 1px solid #e2e8f0;">${proj.name}</td>
                    <td style="padding: 10px; border: 1px solid #e2e8f0;">${proj.code}</td>
                    <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${proj.totalHours.toFixed(1)}</td>
                    <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: center;">${proj.employees.size}</td>
                </tr>
            `).join('');

        const emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0;">
                    <h1 style="margin: 0; font-size: 28px;">Veckorapport - Vecka ${weekNumber}</h1>
                    <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">${dateRange}</p>
                </div>

                <div style="background-color: #f8fafc; padding: 20px; border-left: 4px solid #1e293b; margin: 20px 0;">
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
                        <div style="text-align: center;">
                            <div style="font-size: 36px; font-weight: bold; color: #1e293b;">${totalHours.toFixed(1)}</div>
                            <div style="color: #64748b; font-size: 14px;">Totalt timmar</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 36px; font-weight: bold; color: #1e293b;">${totalEmployees}</div>
                            <div style="color: #64748b; font-size: 14px;">Medarbetare</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 36px; font-weight: bold; color: #1e293b;">${totalProjects}</div>
                            <div style="color: #64748b; font-size: 14px;">Projekt</div>
                        </div>
                    </div>
                </div>

                <h2 style="color: #1e293b; margin-top: 40px; border-bottom: 2px solid #1e293b; padding-bottom: 10px;">Medarbetare</h2>
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <thead>
                        <tr style="background-color: #1e293b; color: white;">
                            <th style="padding: 12px; text-align: left; border: 1px solid #1e293b;">Medarbetare</th>
                            <th style="padding: 12px; text-align: left; border: 1px solid #1e293b;">Avdelning</th>
                            <th style="padding: 12px; text-align: right; border: 1px solid #1e293b;">Timmar</th>
                            <th style="padding: 12px; text-align: center; border: 1px solid #1e293b;">Antal pass</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${employeeRows}
                    </tbody>
                </table>

                <h2 style="color: #1e293b; margin-top: 40px; border-bottom: 2px solid #1e293b; padding-bottom: 10px;">Projekt</h2>
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <thead>
                        <tr style="background-color: #1e293b; color: white;">
                            <th style="padding: 12px; text-align: left; border: 1px solid #1e293b;">Projektnamn</th>
                            <th style="padding: 12px; text-align: left; border: 1px solid #1e293b;">Projektkod</th>
                            <th style="padding: 12px; text-align: right; border: 1px solid #1e293b;">Timmar</th>
                            <th style="padding: 12px; text-align: center; border: 1px solid #1e293b;">Antal personer</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${projectRows}
                    </tbody>
                </table>

                <div style="margin-top: 40px; padding: 20px; background-color: #f1f5f9; border-radius: 8px; text-align: center; color: #64748b; font-size: 12px;">
                    <p style="margin: 0;">Denna rapport genererades automatiskt ${new Date().toLocaleString('sv-SE')}</p>
                </div>
            </div>
        `;

        // Skicka e-post
        await base44.asServiceRole.integrations.Core.SendEmail({
            to: 'info@imvision.se',
            subject: `Veckorapport - Vecka ${weekNumber} (${dateRange})`,
            body: emailBody
        });

        return Response.json({ 
            success: true, 
            message: `Veckorapport för vecka ${weekNumber} skickad till info@imvision.se`,
            summary: {
                weekNumber,
                dateRange,
                totalHours,
                totalEmployees,
                totalProjects
            }
        });

    } catch (error) {
        console.error('Error sending weekly summary:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});