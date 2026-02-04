/**
 * Leaves Module
 * Manages leave requests and approvals.
 */

(function () {

    class Leaves {
        constructor() {
            this.db = window.AppDB;
        }

        /**
         * Request a new Leave
         * @param {Object} leaveData - { userId, startDate, endDate, type, reason }
         */
        async requestLeave(leaveData) {
            const leave = {
                id: 'l' + Date.now(),
                ...leaveData,
                status: 'Pending',
                appliedOn: new Date().toISOString()
            };
            await this.db.add('leaves', leave);
            return leave;
        }

        /**
         * Get Pending Leaves (for Admin)
         */
        async getPendingLeaves() {
            const allLeaves = await this.db.getAll('leaves');
            return allLeaves.filter(l => l.status === 'Pending').sort((a, b) => new Date(b.appliedOn) - new Date(a.appliedOn));
        }

        /**
         * Get My Leaves (for User)
         */
        async getUserLeaves(userId) {
            const allLeaves = await this.db.getAll('leaves');
            return allLeaves.filter(l => l.userId === userId).sort((a, b) => new Date(b.appliedOn) - new Date(a.appliedOn));
        }

        /**
         * Update Leave Status (Approve/Reject)
         */
        async updateLeaveStatus(leaveId, status, adminId) {
            const leave = await this.db.get('leaves', leaveId);
            if (!leave) throw new Error("Leave not found");

            leave.status = status;
            leave.actionBy = adminId;
            leave.actionDate = new Date().toISOString();

            await this.db.put('leaves', leave);

            // If Approved, generate Attendance Logs for each day
            if (status === 'Approved') {
                const start = new Date(leave.startDate);
                const end = new Date(leave.endDate);


                let current = new Date(start);

                while (current <= end) {
                    const dateStr = current.toISOString().split('T')[0];
                    const attendanceLog = {
                        id: 'att_' + leave.userId + '_' + dateStr,
                        userId: leave.userId,
                        date: dateStr,
                        checkIn: '09:00', // Standard time or leave blank
                        checkOut: '17:00',
                        duration: '8h 0m',
                        location: 'On Leave',
                        type: leave.type, // "Sick Leave", "Casual Leave" etc.
                        status: 'in', // Marked as present/accounted for
                        synced: false
                    };
                    // Check if log exists to avoid overwriting real work (optional policy)
                    // For now, we overwrite or add
                    await this.db.put('attendance', attendanceLog);
                    current.setDate(current.getDate() + 1);
                }
            }

            return leave;
        }
    }

    window.AppLeaves = new Leaves();

})();
