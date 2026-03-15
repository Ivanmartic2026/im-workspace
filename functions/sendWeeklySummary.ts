import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Allow scheduled calls (no user) or admin calls
        try {
          const user = await base44.auth.me();
          if (user?.role !== 'admin') {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
          }
        } catch {
          // No user = scheduled/automated call, allow it
        }

        const today = new Date();
        const dayOfWeek = today.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        
        const lastMonday = new Date(today);
        lastMonday.setDate(today.getDate() - daysToMonday - 7);
        lastMonday.setHours(0, 0, 0, 0);
        
        const lastSunday = new Date(lastMonday);
        lastSunday.setDate(lastMonday.getDate() + 6);
        lastSunday.setHours(23, 59, 59, 999);

        const weekEntries = await base44.asServiceRole.entities.TimeEntry.filter({
            status: 'completed'
        })
        .then(entries => entries.filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate >= lastMonday && entryDate <= lastSunday;
        }));

        if (weekEntries.length === 0) {
            return Response.json({ 
                message: 'Inga tidrapporter för förra veckan' 
            });
        }

        const [allProjects, allEmployees] = await Promise.all([
            base44.asServiceRole.entities.Project.list(),
            base44.asServiceRole.entities.Employee.list()
        ]);

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

        const projectSummary = {};
        weekEntries.forEach(entry => {
            let projectAllocations = [];
            if (entry.project_allocations && entry.project_allocations.length > 0) {
                projectAllocations = entry.project_allocations;
            } else if (entry.project_id) {
                projectAllocations = [{ project_id: entry.project_id, hours: entry.total_hours || 0 }];
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

        const totalHours = weekEntries.reduce((sum, entry) => sum + (entry.total_hours || 0), 0);
        const totalEmployees = Object.keys(employeeSummary).length;
        const totalProjects = Object.keys(projectSummary).length;

        const weekNumber = Math.ceil(((lastMonday - new Date(lastMonday.getFullYear(), 0, 1)) / 86400000 + 1) / 7);
        const dateRange = `${lastMonday.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })} - ${lastSunday.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' })}`;

        // --- Generate PDF ---
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        let y = 0;

        // Header background
        doc.setFillColor(30, 41, 59);
        doc.rect(0, 0, pageW, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text(`Veckorapport - Vecka ${weekNumber}`, 14, 18);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(dateRange, 14, 28);
        doc.text(`Genererad: ${new Date().toLocaleString('sv-SE')}`, 14, 35);

        y = 50;

        // KPI boxes
        doc.setTextColor(30, 41, 59);
        const kpis = [
            { label: 'Totalt timmar', value: totalHours.toFixed(1) },
            { label: 'Medarbetare', value: String(totalEmployees) },
            { label: 'Projekt', value: String(totalProjects) }
        ];
        const boxW = (pageW - 28 - 10) / 3;
        kpis.forEach((kpi, i) => {
            const x = 14 + i * (boxW + 5);
            doc.setFillColor(241, 245, 249);
            doc.roundedRect(x, y, boxW, 22, 3, 3, 'F');
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text(kpi.value, x + boxW / 2, y + 12, { align: 'center' });
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text(kpi.label, x + boxW / 2, y + 19, { align: 'center' });
            doc.setTextColor(30, 41, 59);
        });

        y += 32;

        // Helper: draw table
        const drawTable = (title, headers, rows) => {
            if (y > 240) { doc.addPage(); y = 20; }
            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 41, 59);
            doc.text(title, 14, y);
            doc.setDrawColor(30, 41, 59);
            doc.setLineWidth(0.5);
            doc.line(14, y + 2, pageW - 14, y + 2);
            y += 8;

            // Header row
            doc.setFillColor(30, 41, 59);
            doc.rect(14, y, pageW - 28, 8, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            const colW = (pageW - 28) / headers.length;
            headers.forEach((h, i) => {
                doc.text(h.label, 14 + i * colW + (h.right ? colW - 2 : 2), y + 5.5, { align: h.right ? 'right' : 'left' });
            });
            y += 8;

            // Data rows
            rows.forEach((row, ri) => {
                if (y > 270) { doc.addPage(); y = 20; }
                doc.setFillColor(ri % 2 === 0 ? 248 : 255, ri % 2 === 0 ? 250 : 255, ri % 2 === 0 ? 252 : 255);
                doc.rect(14, y, pageW - 28, 7, 'F');
                doc.setTextColor(30, 41, 59);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                row.forEach((cell, i) => {
                    const align = headers[i].right ? 'right' : 'left';
                    const xPos = headers[i].right ? 14 + (i + 1) * colW - 2 : 14 + i * colW + 2;
                    doc.text(String(cell), xPos, y + 4.8, { align });
                });
                y += 7;
            });
            y += 10;
        };

        // Employee table
        const empRows = Object.values(employeeSummary)
            .sort((a, b) => b.totalHours - a.totalHours)
            .map(emp => [emp.name, emp.department, emp.totalHours.toFixed(1), emp.entries.length]);
        drawTable('Medarbetare', [
            { label: 'Medarbetare' }, { label: 'Avdelning' },
            { label: 'Timmar', right: true }, { label: 'Antal pass', right: true }
        ], empRows);

        // Project table
        const projRows = Object.values(projectSummary)
            .sort((a, b) => b.totalHours - a.totalHours)
            .map(proj => [proj.name, proj.code, proj.totalHours.toFixed(1), proj.employees.size]);
        drawTable('Projekt', [
            { label: 'Projektnamn' }, { label: 'Projektkod' },
            { label: 'Timmar', right: true }, { label: 'Antal personer', right: true }
        ], projRows);

        // Upload PDF
        const pdfBytes = doc.output('arraybuffer');
        const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
        const fileName = `veckorapport-vecka${weekNumber}-${lastMonday.getFullYear()}.pdf`;
        const formData = new FormData();
        formData.append('file', pdfBlob, fileName);
        const { file_url: pdfUrl } = await base44.asServiceRole.integrations.Core.UploadFile({ file: formData.get('file') });

        // Email with PDF link
        const emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0;">
                    <h1 style="margin: 0; font-size: 26px;">Veckorapport - Vecka ${weekNumber}</h1>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">${dateRange}</p>
                </div>
                <div style="padding: 30px; background: #f8fafc; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                    <div style="display: flex; gap: 20px; margin-bottom: 24px;">
                        <div style="flex: 1; text-align: center; background: white; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
                            <div style="font-size: 28px; font-weight: bold; color: #1e293b;">${totalHours.toFixed(1)}</div>
                            <div style="color: #64748b; font-size: 13px;">Totalt timmar</div>
                        </div>
                        <div style="flex: 1; text-align: center; background: white; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
                            <div style="font-size: 28px; font-weight: bold; color: #1e293b;">${totalEmployees}</div>
                            <div style="color: #64748b; font-size: 13px;">Medarbetare</div>
                        </div>
                        <div style="flex: 1; text-align: center; background: white; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
                            <div style="font-size: 28px; font-weight: bold; color: #1e293b;">${totalProjects}</div>
                            <div style="color: #64748b; font-size: 13px;">Projekt</div>
                        </div>
                    </div>
                    <div style="text-align: center; margin-top: 20px;">
                        <a href="${pdfUrl}" style="display: inline-block; background: #1e293b; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">
                            📄 Ladda ner PDF-rapport
                        </a>
                    </div>
                    <p style="margin-top: 24px; color: #94a3b8; font-size: 12px; text-align: center;">
                        Genererad automatiskt ${new Date().toLocaleString('sv-SE')}
                    </p>
                </div>
            </div>
        `;

        await base44.asServiceRole.integrations.Core.SendEmail({
            to: 'ivan.martic@me.com',
            subject: `Veckorapport - Vecka ${weekNumber} (${dateRange})`,
            body: emailBody
        });

        return Response.json({ 
            success: true, 
            message: `Veckorapport för vecka ${weekNumber} skickad till ivan.martic@me.com med PDF`,
            pdf_url: pdfUrl,
            summary: { weekNumber, dateRange, totalHours, totalEmployees, totalProjects }
        });

    } catch (error) {
        console.error('Error sending weekly summary:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});