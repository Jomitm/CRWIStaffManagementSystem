/**
 * Reports Module
 * Handles data export and report generation.
 */

(function () {

    class Reports {

        constructor() {
            this.db = window.AppDB;
        }

        /**
         * Convert Array of Objects to CSV
         * @param {Array} data - The data array
         * @param {Array} headers - Column headers ["Name", "Date", ...]
         * @param {Array} keys - Object keys corresponding to headers ["name", "date", ...]
         */
        convertToCSV(data, headers, keys) {
            const headerRow = headers.join(',');
            const rows = data.map(row => {
                return keys.map(key => {
                    let val = row[key] || '';
                    // Escape quotes and wrap in quotes if contains comma
                    val = String(val).replace(/"/g, '""');
                    if (val.search(/("|,|\n)/g) >= 0) val = `"${val}"`;
                    return val;
                }).join(',');
            });
            return [headerRow, ...rows].join('\n');
        }

        /**
         * Trigger File Download
         * @param {String} content - File content
         * @param {String} fileName - Name of file
         * @param {String} mimeType - MIME type (e.g., 'text/csv')
         */
        downloadFile(content, fileName, mimeType) {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 0);
        }

        /**
         * Export All Attendance Logs
         */
        async exportAttendanceCSV() {
            try {
                // 1. Fetch all data
                const users = await this.db.getAll('users');
                const logs = await this.db.getAll('attendance');

                // 2. Map User Details to Logs
                const userMap = {};
                users.forEach(u => userMap[u.id] = u);

                const flattenedData = logs.map(log => {
                    const user = userMap[log.userId] || { name: 'Unknown', role: 'N/A' };
                    return {
                        date: log.date,
                        name: user.name,
                        role: user.role,
                        checkIn: log.checkIn,
                        checkOut: log.checkOut || '--',
                        duration: log.duration || '--',
                        location: log.location || 'N/A',
                        type: log.type || 'Standard'
                    };
                });

                // 3. Sort by Date (descending)
                flattenedData.sort((a, b) => new Date(b.date) - new Date(a.date));

                // 4. Generate CSV
                const headers = ['Date', 'Staff Name', 'Role', 'Check In', 'Check Out', 'Duration', 'Location', 'Type'];
                const keys = ['date', 'name', 'role', 'checkIn', 'checkOut', 'duration', 'location', 'type'];

                const csvContent = this.convertToCSV(flattenedData, headers, keys);

                // 5. Download
                const fileName = `Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`;
                this.downloadFile(csvContent, fileName, 'text/csv');

                return true;

            } catch (err) {
                console.error("Export Failed:", err);
                throw new Error("Failed to generate report");
            }
        }
    }

    // Initialize
    window.AppReports = new Reports();

})();
