/**
 * Analytics Module
 * Handles visual data representation using Chart.js.
 */

(function () {

    class Analytics {
        constructor() {
            this.db = window.AppDB;
            this.chartInstance = null;
        }

        async initAdminCharts() {
            const canvas = document.getElementById('admin-stats-chart');
            if (!canvas) return;

            // Destroy existing chart to avoid "Canvas is already in use" error
            if (this.chartInstance) {
                this.chartInstance.destroy();
                this.chartInstance = null;
            }

            // 1. Fetch Data
            const logs = await this.db.getAll('attendance');

            // 2. Process Data (Last 7 Days)
            const stats = this.processLast7Days(logs);

            // 3. Render Chart
            const ctx = canvas.getContext('2d');
            this.chartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: stats.labels,
                    datasets: [
                        {
                            label: 'Present',
                            data: stats.present,
                            backgroundColor: '#4ade80',
                            borderRadius: 4
                        },
                        {
                            label: 'On Leave',
                            data: stats.onLeave,
                            backgroundColor: '#f87171',
                            borderRadius: 4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom' },
                        title: { display: true, text: 'Weekly Attendance Overview' }
                    },
                    scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1 } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        processLast7Days(logs) {
            const labels = [];
            const presentData = [];
            const leaveData = [];

            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().split('T')[0];
                const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });

                labels.push(dayLabel);

                // Count logs for this day
                const daysLogs = logs.filter(l => l.date === dateStr);
                const presentCount = daysLogs.filter(l => l.status === 'in' && l.type !== 'Sick Leave' && l.type !== 'Casual Leave' && l.type !== 'Annual Leave' && l.location !== 'On Leave').length;
                const leaveCount = daysLogs.filter(l => l.location === 'On Leave' || l.type.includes('Leave')).length;

                presentData.push(presentCount);
                leaveData.push(leaveCount);
            }

            return { labels, present: presentData, onLeave: leaveData };
        }
        async getUserMonthlyStats(userId) {
            const logs = await this.db.getAll('attendance');
            const userLogs = logs.filter(l => l.userId === userId);

            // Get Current Month
            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth();

            const startOfMonth = new Date(year, month, 1);
            const endOfMonth = new Date(year, month + 1, 0); // Last day of month

            // Initialize Breakdown
            const breakdown = {
                'Present': 0,
                'Late': 0,
                'Work - Home': 0,
                'Training': 0,
                'Sick Leave': 0,
                'Casual Leave': 0,
                'Earned Leave': 0,
                'Paid Leave': 0,
                'Maternity Leave': 0,
                'Absent': 0,
                'Holiday': 0,
                'National Holiday': 0,
                'Regional Holidays': 0
            };

            const stats = {
                present: 0,
                late: 0,
                leaves: 0,
                penalty: 0,
                label: startOfMonth.toLocaleDateString('default', { month: 'long', year: 'numeric' }),
                breakdown: breakdown
            };

            const startStr = startOfMonth.toISOString().split('T')[0];
            const endStr = endOfMonth.toISOString().split('T')[0];

            userLogs.forEach(log => {
                if (log.date >= startStr && log.date <= endStr) {
                    let type = log.type || '';

                    // LATE Check
                    if (log.checkIn && log.checkIn > '09:00') {
                        breakdown['Late']++;
                        stats.late++;
                    }

                    // CATEGORY Check
                    if (type === 'Work - Home') breakdown['Work - Home']++;
                    else if (type === 'Training') breakdown['Training']++;
                    else if (type === 'Sick Leave') breakdown['Sick Leave']++;
                    else if (type === 'Casual Leave') breakdown['Casual Leave']++;
                    else if (type === 'Earned Leave') breakdown['Earned Leave']++;
                    else if (type === 'Paid Leave') breakdown['Paid Leave']++;
                    else if (type === 'Maternity Leave') breakdown['Maternity Leave']++;
                    else if (type === 'Absent') breakdown['Absent']++;
                    else if (type === 'National Holiday') breakdown['National Holiday']++;
                    else if (type === 'Regional Holidays') breakdown['Regional Holidays']++;
                    else if (type.includes('Holiday')) breakdown['Holiday']++;
                    else if (log.checkIn) {
                        breakdown['Present']++; // Standard Office
                    }
                }
            });

            // Recalculate Totals
            stats.present = breakdown['Present'] + breakdown['Work - Home'] + breakdown['Training'];
            stats.leaves = breakdown['Sick Leave'] + breakdown['Casual Leave'] + breakdown['Earned Leave'] + breakdown['Paid Leave'] + breakdown['Maternity Leave'] + breakdown['Absent'];

            // Calculate penalty for this month
            if (breakdown['Late'] > 3) stats.penalty = 0.5;

            return stats;
        }

        async getUserYearlyStats(userId) {
            const logs = await this.db.getAll('attendance');
            const userLogs = logs.filter(l => l.userId === userId);
            const { start, end, label } = this.getFinancialYearDates();

            // Initialize Breakdown
            const breakdown = {
                'Present': 0,
                'Late': 0,
                'Work - Home': 0,
                'Training': 0,
                'Sick Leave': 0,
                'Casual Leave': 0,
                'Earned Leave': 0,
                'Paid Leave': 0,
                'Maternity Leave': 0,
                'Absent': 0,
                'Holiday': 0,
                'National Holiday': 0,
                'Regional Holidays': 0
            };

            const stats = {
                present: 0,
                late: 0, // Total Late
                leaves: 0,
                penaltyLeaves: 0,
                label: label,
                breakdown: breakdown // Attach breakdown
            };

            const monthlyLates = {};

            userLogs.forEach(log => {
                const logDate = new Date(log.date);
                if (logDate >= start && logDate <= end) {
                    let type = log.type || '';

                    // LATE Check
                    if (log.checkIn && log.checkIn > '09:00') {
                        breakdown['Late']++;

                        // Track monthly lates for penalty
                        const monthKey = `${logDate.getFullYear()}-${logDate.getMonth()}`;
                        if (!monthlyLates[monthKey]) monthlyLates[monthKey] = 0;
                        monthlyLates[monthKey]++;
                    }

                    // CATEGORY Check
                    if (type === 'Work - Home') breakdown['Work - Home']++;
                    else if (type === 'Training') breakdown['Training']++;
                    else if (type === 'Sick Leave') breakdown['Sick Leave']++;
                    else if (type === 'Casual Leave') breakdown['Casual Leave']++;
                    else if (type === 'Earned Leave') breakdown['Earned Leave']++;
                    else if (type === 'Paid Leave') breakdown['Paid Leave']++;
                    else if (type === 'Maternity Leave') breakdown['Maternity Leave']++;
                    else if (type === 'Absent') breakdown['Absent']++;
                    else if (type === 'National Holiday') breakdown['National Holiday']++;
                    else if (type === 'Regional Holidays') breakdown['Regional Holidays']++;
                    else if (type.includes('Holiday')) breakdown['Holiday']++;
                    else if (log.checkIn) {
                        breakdown['Present']++; // Standard Office
                    }
                }
            });

            // Recalculate Totals
            stats.present = breakdown['Present'] + breakdown['Work - Home'] + breakdown['Training'];
            stats.leaves = breakdown['Sick Leave'] + breakdown['Casual Leave'] + breakdown['Earned Leave'] + breakdown['Paid Leave'] + breakdown['Maternity Leave'] + breakdown['Absent'];
            stats.late = breakdown['Late'];

            // Apply Penalty
            Object.values(monthlyLates).forEach(count => {
                if (count > 3) stats.penaltyLeaves += 0.5;
            });

            return stats;
        }

        getFinancialYearDates() {
            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth(); // 0-11

            let startYear = year;
            if (month < 3) { // Jan, Feb, Mar are part of previous FY starts
                startYear = year - 1;
            }

            const start = new Date(startYear, 3, 1); // April 1st
            const end = new Date(startYear + 1, 2, 31); // March 31st

            return {
                start,
                end,
                label: `FY ${startYear}-${startYear + 1}`
            };
        }

        getDayType(date) {
            const day = date.getDay();
            const dateNum = date.getDate();

            if (day === 0) return 'Holiday'; // Sunday

            if (day === 6) { // Saturday Rules
                // Calculate which Saturday it is (1st, 2nd, etc.)
                const weekNum = Math.ceil(dateNum / 7);
                if (weekNum === 2 || weekNum === 4) return 'Holiday';
                return 'Half Day';
            }

            return 'Work Day';
        }
    }

    window.AppAnalytics = new Analytics();

})();
