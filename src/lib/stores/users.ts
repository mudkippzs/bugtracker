import { writable, derived } from 'svelte/store';

export interface User {
    id: string;
    name: string;
    avatar?: string;
}

// Default team members - can be configured or fetched from an API
const defaultUsers: User[] = [
    { id: 'alice', name: 'Alice Chen' },
    { id: 'bob', name: 'Bob Smith' },
    { id: 'charlie', name: 'Charlie Davis' },
    { id: 'claude', name: 'Claude AI' },
    { id: 'diana', name: 'Diana Ross' },
    { id: 'eve', name: 'Eve Johnson' }
];

// Load users from localStorage or use defaults
function loadUsers(): User[] {
    if (typeof window === 'undefined') return defaultUsers;
    const stored = localStorage.getItem('bugtracker-users');
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch {
            return defaultUsers;
        }
    }
    return defaultUsers;
}

function createUsersStore() {
    const { subscribe, set, update } = writable<User[]>(loadUsers());

    return {
        subscribe,
        addUser: (user: User) => {
            update(users => {
                const updated = [...users, user];
                if (typeof window !== 'undefined') {
                    localStorage.setItem('bugtracker-users', JSON.stringify(updated));
                }
                return updated;
            });
        },
        removeUser: (id: string) => {
            update(users => {
                const updated = users.filter(u => u.id !== id);
                if (typeof window !== 'undefined') {
                    localStorage.setItem('bugtracker-users', JSON.stringify(updated));
                }
                return updated;
            });
        },
        reset: () => {
            set(defaultUsers);
            if (typeof window !== 'undefined') {
                localStorage.removeItem('bugtracker-users');
            }
        }
    };
}

export const users = createUsersStore();

// Derived store for user lookups by ID
export const userMap = derived(users, ($users) => {
    const map = new Map<string, User>();
    for (const user of $users) {
        map.set(user.id, user);
    }
    return map;
});

// Get user display name (falls back to id if not found)
export function getUserName(userId: string | null | undefined, $userMap: Map<string, User>): string {
    if (!userId) return 'Unassigned';
    const user = $userMap.get(userId);
    return user ? user.name : userId;
}
