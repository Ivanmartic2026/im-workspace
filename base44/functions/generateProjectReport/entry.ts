import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { project_id } = await req.json();

    if (!project_id) {
      return Response.json({ error: 'project_id is required' }, { status: 400 });
    }

    // Hämta projektdata
    const projects = await base44.asServiceRole.entities.Project.filter({ id: project_id });
    if (projects.length === 0) {
      return Response.json({ error: 'Project not found' }, { status: 404 });
    }
    const project = projects[0];

    // Hämta alla tidrapporter för projektet
    const allTimeEntries = await base44.asServiceRole.entities.TimeEntry.list();
    const projectTimeEntries = allTimeEntries.filter(entry => {
      if (entry.project_id === project_id) return true;
      if (entry.project_allocations?.length > 0) {
        return entry.project_allocations.some(alloc => alloc.project_id === project_id);
      }
      return false;
    });

    // Hämta körjournalposter
    const allJournalEntries = await base44.asServiceRole.entities.DrivingJournalEntry.list();
    const projectJournalEntries = allJournalEntries.filter(
      entry => entry.project_code === project.project_code
    );

    // Hämta anställda för att visa namn
    const employees = await base44.asServiceRole.entities.Employee.list();

    // Beräkna statistik
    const totalHours = projectTimeEntries.reduce((sum, entry) => {
      if (entry.project_allocations?.length > 0) {
        const allocation = entry.project_allocations.find(alloc => alloc.project_id === project_id);
        return sum + (allocation?.hours || 0);
      }
      return sum + (entry.total_hours || 0);
    }, 0);

    const totalKm = projectJournalEntries.reduce((sum, entry) => sum + (entry.distance_km || 0), 0);

    const budgetProgress = project.budget_hours ? (totalHours / project.budget_hours) * 100 : 0;

    // Senaste 5 aktiviteterna
    const recentActivities = projectTimeEntries
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5)
      .map(entry => {
        const employee = employees.find(emp => emp.user_email === entry.employee_email);
        return {
          date: entry.date,
          employee: employee?.display_name || entry.employee_email,
          hours: entry.project_allocations?.length > 0
            ? entry.project_allocations.find(alloc => alloc.project_id === project_id)?.hours || 0
            : entry.total_hours || 0,
          notes: entry.notes || ''
        };
      });

    // Skapa AI-prompt för sammanfattning
    const aiPrompt = `Du är en projektrapportgenerator. Generera en professionell och koncis sammanfattning av följande projekt.

Projektinformation:
- Namn: ${project.name}
- Projektkod: ${project.project_code}
- Kund: ${project.customer || 'Ej angiven'}
- Status: ${project.status}
- Typ: ${project.type}
- Budgeterade timmar: ${project.budget_hours || 'Ej angivet'}
- Nedlagd tid: ${totalHours.toFixed(1)} timmar
- Budgetuppföljning: ${budgetProgress.toFixed(0)}% av budgeten använd

Senaste aktiviteter (max 5):
${recentActivities.map(act => `- ${act.date}: ${act.employee} loggade ${act.hours.toFixed(1)}h${act.notes ? ` - ${act.notes}` : ''}`).join('\n')}

Körda kilometer: ${totalKm.toFixed(0)} km

Skapa en sammanfattning som täcker:
1. Övergripande projektstatus
2. Tidsåtgång och budgetuppföljning
3. Framsteg och aktivitetsnivå
4. Eventuella anmärkningar eller varningar (t.ex. om budgeten överskrids)

Var professionell, koncis och faktabaserad. Max 200 ord.`;

    // Generera AI-sammanfattning
    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: aiPrompt
    });

    const aiSummary = aiResponse || 'Sammanfattning kunde inte genereras.';

    // Skapa PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    let yPos = 20;

    // Rubrik
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('Projektrapport', margin, yPos);
    yPos += 10;

    // Projektinformation
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Genererad: ${new Date().toLocaleDateString('sv-SE')}`, margin, yPos);
    yPos += 15;

    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(project.name, margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Projektkod: ${project.project_code}`, margin, yPos);
    yPos += 6;
    if (project.customer) {
      doc.text(`Kund: ${project.customer}`, margin, yPos);
      yPos += 6;
    }
    doc.text(`Status: ${project.status}`, margin, yPos);
    yPos += 10;

    // AI-sammanfattning
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('AI-genererad sammanfattning', margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const summaryLines = doc.splitTextToSize(aiSummary, pageWidth - 2 * margin);
    doc.text(summaryLines, margin, yPos);
    yPos += summaryLines.length * 5 + 10;

    // Kontrollera om vi behöver ny sida
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    // Statistik
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Statistik', margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Total nedlagd tid: ${totalHours.toFixed(1)} timmar`, margin, yPos);
    yPos += 6;
    if (project.budget_hours) {
      doc.text(`Budget: ${project.budget_hours} timmar (${budgetProgress.toFixed(0)}% använt)`, margin, yPos);
      yPos += 6;
    }
    doc.text(`Körda kilometer: ${totalKm.toFixed(0)} km`, margin, yPos);
    yPos += 6;
    if (project.hourly_rate) {
      const estimatedCost = totalHours * project.hourly_rate;
      doc.text(`Uppskattat värde: ${estimatedCost.toFixed(0)} kr (${project.hourly_rate} kr/h)`, margin, yPos);
      yPos += 6;
    }
    yPos += 5;

    // Senaste aktiviteter
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Senaste aktiviteter', margin, yPos);
    yPos += 8;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    recentActivities.forEach(act => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      const actText = `${act.date} - ${act.employee} (${act.hours.toFixed(1)}h)`;
      doc.text(actText, margin, yPos);
      yPos += 5;
      if (act.notes) {
        const notesLines = doc.splitTextToSize(`  ${act.notes}`, pageWidth - 2 * margin - 5);
        doc.setFont(undefined, 'italic');
        doc.text(notesLines, margin + 5, yPos);
        doc.setFont(undefined, 'normal');
        yPos += notesLines.length * 4 + 3;
      }
    });

    // Generera PDF som buffer
    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Projektrapport_${project.project_code}_${new Date().toISOString().split('T')[0]}.pdf"`
      }
    });
  } catch (error) {
    console.error('Error generating project report:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});