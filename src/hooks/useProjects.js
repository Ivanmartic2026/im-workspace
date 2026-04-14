import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

async function fetchMergedProjects() {
  const [regularProjects, workspaceProjects] = await Promise.all([
    base44.entities.Project.list('-updated_date'),
    base44.entities.WorkspaceProject.list('-updated_date')
  ]);

  const regular = regularProjects
    .filter(p => p.status === 'pågående')
    .map(p => ({ ...p, _source: 'project' }));

  // Deduplicate WorkspaceProjects by fortnoxProjectNumber (keep latest updated)
  const seenFnr = new Map();
  for (const wp of workspaceProjects) {
    if (wp.status === 'active' && wp.name) {
      const key = wp.fortnoxProjectNumber;
      if (!seenFnr.has(key) || new Date(wp.updated_date) > new Date(seenFnr.get(key).updated_date)) {
        seenFnr.set(key, wp);
      }
    }
  }

  const workspace = [...seenFnr.values()].map(wp => ({
    ...wp,
    name: wp.fortnoxProjectNumber ? `${wp.fortnoxProjectNumber} – ${wp.name}` : wp.name,
    project_code: wp.fortnoxProjectNumber || '',
    status: 'pågående',
    type: 'externt',
    _source: 'workspace'
  }));

  const workspaceFnrSet = new Set(seenFnr.keys());
  const filteredRegular = regular.filter(
    p => !p.fortnoxProjectNumber || !workspaceFnrSet.has(p.fortnoxProjectNumber)
  );

  return [...workspace, ...filteredRegular];
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects-merged'],
    queryFn: fetchMergedProjects,
    initialData: []
  });
}