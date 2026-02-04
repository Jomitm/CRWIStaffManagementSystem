/**
 * Auth Module
 * Handles User Authentication and Session Management
 * (Converted to IIFE for file:// support)
 */
(function () {
    class Auth {
        constructor() {
            this.currentUser = null;
            this.sessionKey = 'crwi_session_user';
        }

        async init() {
            // Depend on AppDB
            await window.AppDB.init();

            const storedId = localStorage.getItem(this.sessionKey);
            if (storedId) {
                this.currentUser = await window.AppDB.get('users', storedId);
            }

            // Seed mock users if empty (First Run)
            const users = await window.AppDB.getAll('users');
            if (users.length === 0) {
                await this.seedUsers();
            }
        }

        async seedUsers() {
            const mockUsers = [
                {
                    id: 'admin01',
                    username: 'Admin',
                    password: 'Admin',
                    name: 'Sr. Mary (Admin)',
                    role: 'Administrator',
                    email: 'admin@crwi.org',
                    phone: '+91 98765 00000',
                    dept: 'Administration',
                    joinDate: '2023-01-01',
                    avatar: 'https://ui-avatars.com/api/?name=Admin&background=E11D48&color=fff',
                    status: 'out',
                    lastCheckIn: null
                },
                {
                    id: 'staff01',
                    username: 'Jomit',
                    password: '123',
                    name: 'Jomit',
                    role: 'Web Developer',
                    email: 'jomit@crwi.org',
                    phone: '+91 98765 43210',
                    dept: 'IT Department',
                    joinDate: '2024-01-01',
                    avatar: 'https://ui-avatars.com/api/?name=Jomit&background=0D8ABC&color=fff',
                    status: 'out',
                    lastCheckIn: null
                }
            ];

            for (const u of mockUsers) {
                await window.AppDB.put('users', u);
            }
            console.log('Database seeded with mock users.');
        }

        async login(username, password) {
            const users = await window.AppDB.getAll('users');
            const user = users.find(u =>
                (u.username.toLowerCase() === username.toLowerCase() || u.email.toLowerCase() === username.toLowerCase()) &&
                u.password === password
            );

            if (user) {
                this.currentUser = user;
                localStorage.setItem(this.sessionKey, user.id);
                return true;
            }
            return false;
        }

        logout() {
            this.currentUser = null;
            localStorage.removeItem(this.sessionKey);
            window.location.reload();
        }

        getUser() {
            return this.currentUser;
        }

        async updateUser(userData) {
            // Find existing to preserve fields like avatar if not provided
            const existing = await window.AppDB.get('users', userData.id);
            if (!existing) return false;

            const updated = { ...existing, ...userData };
            if (userData.name && userData.name !== existing.name) {
                updated.avatar = `https://ui-avatars.com/api/?name=${userData.name}&background=random&color=fff`;
            }

            await window.AppDB.put('users', updated);

            // If current user is the one being updated, refresh memory state
            if (this.currentUser && this.currentUser.id === updated.id) {
                this.currentUser = updated;
            }
            return true;
        }
        async resetData() {
            if (confirm('Are you sure you want to RESET ALL DATA? This will clear logs and users.')) {
                await window.AppDB.clear('users');
                await window.AppDB.clear('attendance');
                localStorage.clear();
                alert('Data reset. Reloading...');
                window.location.reload();
            }
        }
    }

    // Export to Window
    window.AppAuth = new Auth();
})();
