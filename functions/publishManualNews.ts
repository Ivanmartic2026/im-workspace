import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (!data || !event) {
      return Response.json({ error: 'Missing event or data' }, { status: 400 });
    }

    const isUpdate = event.type === 'update';
    const title = isUpdate 
      ? `📝 Uppdaterad manual: ${data.title}`
      : `📚 Ny manual: ${data.title}`;

    const categoryLabels = {
      produkt_teknik: 'Produkt & Teknik',
      arbetsrutiner: 'Arbetsrutiner',
      it_system: 'IT & System',
      hr: 'HR',
      varumarke_allmant: 'Varumärke & Allmänt'
    };

    const categoryLabel = categoryLabels[data.category] || data.category;

    let content = `${isUpdate ? 'En manual har uppdaterats' : 'En ny manual har publicerats'} i kategorin **${categoryLabel}**.\n\n`;
    
    if (data.description) {
      content += `${data.description}\n\n`;
    }

    if (data.subcategory) {
      content += `**Underkategori:** ${data.subcategory}\n\n`;
    }

    content += `[Öppna manual →](/ManualDetail?id=${data.id})`;

    await base44.asServiceRole.entities.NewsPost.create({
      title: title,
      content: content,
      category: 'allmänt',
      is_important: data.priority === 'kritisk' || data.priority === 'hög',
      requires_acknowledgment: false,
      target_departments: data.target_departments || []
    });

    return Response.json({ success: true, message: 'News post created' });
  } catch (error) {
    console.error('Error publishing manual news:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});