/**
 * Attendance Module
 * Handles Check-in, Check-out, and Log Management
 * (Converted to IIFE for file:// support)
 */
(function () {
    class Attendance {

        async getStatus() {
            // Depend on AppAuth
            const user = window.AppAuth.getUser();
            if (!user) return { status: 'out', lastCheckIn: null };
            return {
                status: user.status || 'out',
                lastCheckIn: user.lastCheckIn
            };
        }

        async checkIn(latitude, longitude, address = 'Unknown Location') {
            const user = window.AppAuth.getUser();
            if (!user) throw new Error("User not authenticated");

            // Update User State
            user.status = 'in';
            user.lastCheckIn = Date.now();
            user.currentLocation = { lat: latitude, lng: longitude, address };

            await window.AppDB.put('users', user);
            return true;
        }

        async checkOut() {
            const user = window.AppAuth.getUser();
            if (!user || user.status !== 'in') throw new Error("User is not checked in");

            const checkInTime = new Date(user.lastCheckIn);
            const checkOutTime = new Date();
            const durationMs = checkOutTime - checkInTime;

            // Create Attendance Log
            const log = {
                id: Date.now(),
                user_id: user.id,
                date: checkOutTime.toLocaleDateString(),
                checkIn: checkInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                checkOut: checkOutTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                duration: this.msToTime(durationMs),
                type: 'Office',
                location: user.currentLocation?.address || 'Detected Location',
                synced: false // For future sync logic
            };

            // Save Log
            await window.AppDB.add('attendance', log);

            // Reset User State
            user.status = 'out';
            user.lastCheckIn = null;
            user.currentLocation = null;

            await window.AppDB.put('users', user);
            return log;
        }

        async addManualLog(logData) {
            const user = window.AppAuth.getUser();
            if (!user) return;

            const newLog = {
                id: Date.now(),
                user_id: user.id,
                ...logData,
                synced: false
            };

            await window.AppDB.add('attendance', newLog);
            return newLog;
        }

        async getLogs(userId = null) {
            // If userId provided (Admin view), fetch for that user, else current user
            const targetId = userId || window.AppAuth.getUser()?.id;
            if (!targetId) return [];

            const allLogs = await window.AppDB.getAll('attendance');
            // Sort by ID descending (newest first)
            return allLogs.filter(l => l.user_id === targetId).sort((a, b) => b.id - a.id);
        }

        async getAllLogs() {
            // Admin: Get all logs
            return await window.AppDB.getAll('attendance');
        }

        msToTime(duration) {
            let minutes = Math.floor((duration / (1000 * 60)) % 60);
            let hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
            return `${hours}h ${minutes}m`;
        }
    }

    // Export to Window
    window.AppAttendance = new Attendance();
})();
