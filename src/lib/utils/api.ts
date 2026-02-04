import type { Issue, Project, Comment, Commit } from '$lib/db/schema';

const API_BASE = '/api';

type ApiResponse<T> = {
	data?: T;
	error?: string;
};

async function request<T>(
	endpoint: string,
	options: RequestInit = {}
): Promise<ApiResponse<T>> {
	try {
		const response = await fetch(`${API_BASE}${endpoint}`, {
			headers: {
				'Content-Type': 'application/json',
				...options.headers
			},
			...options
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({ error: 'Request failed' }));
			return { error: error.error || `HTTP ${response.status}` };
		}

		const data = await response.json();
		return { data };
	} catch (err) {
		return { error: err instanceof Error ? err.message : 'Network error' };
	}
}

// Projects API
export const projectsApi = {
	list: () => request<Project[]>('/projects'),
	get: (id: number) => request<Project>(`/projects/${id}`),
	create: (project: Partial<Project>) =>
		request<Project>('/projects', {
			method: 'POST',
			body: JSON.stringify(project)
		}),
	update: (id: number, project: Partial<Project>) =>
		request<Project>(`/projects/${id}`, {
			method: 'PUT',
			body: JSON.stringify(project)
		}),
	delete: (id: number) =>
		request<void>(`/projects/${id}`, { method: 'DELETE' })
};

// Issues API
export const issuesApi = {
	list: (params?: { projectId?: number; status?: string; type?: string; priority?: string }) => {
		const searchParams = new URLSearchParams();
		if (params?.projectId) searchParams.set('projectId', String(params.projectId));
		if (params?.status) searchParams.set('status', params.status);
		if (params?.type) searchParams.set('type', params.type);
		if (params?.priority) searchParams.set('priority', params.priority);
		const query = searchParams.toString();
		return request<Issue[]>(`/issues${query ? `?${query}` : ''}`);
	},
	get: (id: number) => request<Issue & { project: Project; comments: Comment[]; commits: Commit[] }>(`/issues/${id}`),
	create: (issue: Partial<Issue>) =>
		request<Issue>('/issues', {
			method: 'POST',
			body: JSON.stringify(issue)
		}),
	update: (id: number, issue: Partial<Issue>) =>
		request<Issue>(`/issues/${id}`, {
			method: 'PUT',
			body: JSON.stringify(issue)
		}),
	delete: (id: number) =>
		request<void>(`/issues/${id}`, { method: 'DELETE' })
};

// Comments API
export const commentsApi = {
	list: (issueId: number) => request<Comment[]>(`/issues/${issueId}/comments`),
	create: (issueId: number, comment: Partial<Comment>) =>
		request<Comment>(`/issues/${issueId}/comments`, {
			method: 'POST',
			body: JSON.stringify(comment)
		})
};

// Commits API
export const commitsApi = {
	list: (issueId: number) => request<Commit[]>(`/issues/${issueId}/commits`),
	create: (issueId: number, commit: Partial<Commit>) =>
		request<Commit>(`/issues/${issueId}/commits`, {
			method: 'POST',
			body: JSON.stringify(commit)
		})
};

// Analytics API
export const analyticsApi = {
	overview: () => request<{
		totalProjects: number;
		totalIssues: number;
		openIssues: number;
		closedIssues: number;
		issuesByType: Record<string, number>;
		issuesByPriority: Record<string, number>;
		issuesByStatus: Record<string, number>;
		recentActivity: Array<{
			id: number;
			type: string;
			title: string;
			createdAt: string;
		}>;
	}>('/analytics')
};
