<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { ArrowLeft, Plus, Calendar, Target, CheckCircle, Clock, Edit2, Trash2, X } from 'lucide-svelte';
	import type { Milestone } from '$lib/db/schema';

	interface MilestoneWithStats extends Milestone {
		totalIssues: number;
		closedIssues: number;
	}

	let milestones = $state<MilestoneWithStats[]>([]);
	let loading = $state(true);
	let showNewForm = $state(false);
	let editingMilestone = $state<MilestoneWithStats | null>(null);
	
	// Form state
	let formTitle = $state('');
	let formDescription = $state('');
	let formStartDate = $state('');
	let formDueDate = $state('');
	let formStatus = $state<'open' | 'active' | 'closed'>('open');
	let submitting = $state(false);

	const projectId = $derived(parseInt($page.params.id));

	onMount(async () => {
		await loadMilestones();
		loading = false;
	});

	async function loadMilestones() {
		const res = await fetch(`/api/milestones?projectId=${projectId}`);
		if (res.ok) {
			milestones = await res.json();
		}
	}

	function resetForm() {
		formTitle = '';
		formDescription = '';
		formStartDate = '';
		formDueDate = '';
		formStatus = 'open';
		editingMilestone = null;
		showNewForm = false;
	}

	function startEdit(milestone: MilestoneWithStats) {
		editingMilestone = milestone;
		formTitle = milestone.title;
		formDescription = milestone.description || '';
		formStartDate = milestone.startDate || '';
		formDueDate = milestone.dueDate || '';
		formStatus = milestone.status;
		showNewForm = true;
	}

	async function handleSubmit() {
		if (!formTitle.trim() || submitting) return;

		submitting = true;

		const data = {
			projectId,
			title: formTitle.trim(),
			description: formDescription.trim() || null,
			startDate: formStartDate || null,
			dueDate: formDueDate || null,
			status: formStatus
		};

		if (editingMilestone) {
			await fetch(`/api/milestones/${editingMilestone.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			});
		} else {
			await fetch('/api/milestones', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			});
		}

		await loadMilestones();
		resetForm();
		submitting = false;
	}

	async function handleDelete(id: number) {
		if (!confirm('Delete this milestone? Issues will be unlinked but not deleted.')) return;
		
		await fetch(`/api/milestones/${id}`, { method: 'DELETE' });
		await loadMilestones();
	}

	function getProgress(milestone: MilestoneWithStats): number {
		if (milestone.totalIssues === 0) return 0;
		return Math.round((milestone.closedIssues / milestone.totalIssues) * 100);
	}

	function formatDate(dateStr: string | null): string {
		if (!dateStr) return 'No date';
		return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	const statusColors: Record<string, string> = {
		open: 'text-ghost-dim border-ghost-dim',
		active: 'text-cyber border-cyber bg-cyber/10',
		closed: 'text-matrix border-matrix bg-matrix/10'
	};
</script>

<svelte:head>
	<title>Milestones // BugTracker</title>
</svelte:head>

<div class="p-6">
	<!-- Header -->
	<div class="flex items-center justify-between mb-4">
		<div class="flex items-center gap-3">
			<a href="/projects/{projectId}" class="btn btn-ghost p-1">
				<ArrowLeft size={14} />
			</a>
			<h1 class="text-lg text-ghost-bright font-display">MILESTONES</h1>
		</div>
		<button class="btn btn-primary" onclick={() => showNewForm = true}>
			<Plus size={12} />
			NEW
		</button>
	</div>

	{#if loading}
		<div class="flex items-center gap-2 text-ghost-dim text-sm py-8">
			<span class="animate-pulse">▋</span>
			<span>Loading...</span>
		</div>
	{:else if milestones.length === 0}
		<div class="text-center py-12 text-ghost-dim">
			<Target size={48} class="mx-auto mb-3 opacity-50" />
			<p>No milestones yet</p>
			<p class="text-xs mt-1">Create a milestone to track sprints or releases</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each milestones as milestone}
				{@const progress = getProgress(milestone)}
				<div class="card group">
					<div class="flex items-start justify-between gap-3">
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2 mb-1">
								<span class="badge {statusColors[milestone.status]}">{milestone.status.toUpperCase()}</span>
								<h3 class="text-ghost-bright font-medium truncate">{milestone.title}</h3>
							</div>
							
							{#if milestone.description}
								<p class="text-xs text-ghost-dim mb-2 line-clamp-2">{milestone.description}</p>
							{/if}

							<div class="flex items-center gap-4 text-xs text-ghost-dim">
								{#if milestone.startDate || milestone.dueDate}
									<span class="flex items-center gap-1">
										<Calendar size={10} />
										{formatDate(milestone.startDate)} - {formatDate(milestone.dueDate)}
									</span>
								{/if}
								<span class="flex items-center gap-1">
									<CheckCircle size={10} />
									{milestone.closedIssues}/{milestone.totalIssues} issues
								</span>
							</div>

							<!-- Progress bar -->
							{#if milestone.totalIssues > 0}
								<div class="mt-2 h-1.5 bg-void-200 w-full">
									<div 
										class="h-full bg-cyber transition-all"
										style="width: {progress}%"
									></div>
								</div>
								<div class="text-right text-2xs text-ghost-dim mt-0.5">{progress}%</div>
							{/if}
						</div>

						<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
							<button 
								class="btn btn-ghost p-1 text-ghost-dim hover:text-cyber"
								onclick={() => startEdit(milestone)}
							>
								<Edit2 size={12} />
							</button>
							<button 
								class="btn btn-ghost p-1 text-ghost-dim hover:text-blood"
								onclick={() => handleDelete(milestone.id)}
							>
								<Trash2 size={12} />
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- New/Edit Milestone Modal -->
{#if showNewForm}
	<div class="fixed inset-0 bg-void/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick={resetForm}>
		<div 
			class="bg-void-100 border border-void-50 w-full max-w-md animate-slide-up"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
		>
			<div class="flex items-center justify-between p-3 border-b border-void-50">
				<h2 class="text-sm text-ghost-bright font-display">
					{editingMilestone ? 'EDIT MILESTONE' : 'NEW MILESTONE'}
				</h2>
				<button class="btn btn-ghost p-1" onclick={resetForm}>
					<X size={14} />
				</button>
			</div>

			<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="p-3 space-y-3">
				<div>
					<label for="title" class="label">Title</label>
					<input 
						id="title" 
						type="text" 
						class="input" 
						placeholder="Sprint 1, v2.0 Release..."
						bind:value={formTitle}
						required 
					/>
				</div>

				<div>
					<label for="description" class="label">Description</label>
					<textarea 
						id="description" 
						class="input min-h-[80px] resize-y"
						placeholder="Optional description..."
						bind:value={formDescription}
					></textarea>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="startDate" class="label">Start Date</label>
						<input 
							id="startDate" 
							type="date" 
							class="input"
							bind:value={formStartDate}
						/>
					</div>
					<div>
						<label for="dueDate" class="label">Due Date</label>
						<input 
							id="dueDate" 
							type="date" 
							class="input"
							bind:value={formDueDate}
						/>
					</div>
				</div>

				<div>
					<label for="status" class="label">Status</label>
					<select id="status" class="input" bind:value={formStatus}>
						<option value="open">Open</option>
						<option value="active">Active</option>
						<option value="closed">Closed</option>
					</select>
				</div>

				<div class="flex justify-end gap-2 pt-2">
					<button type="button" class="btn btn-secondary" onclick={resetForm}>CANCEL</button>
					<button type="submit" class="btn btn-primary" disabled={submitting}>
						{submitting ? 'SAVING...' : (editingMilestone ? 'SAVE' : 'CREATE')}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
