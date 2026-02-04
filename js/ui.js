/**
 * UI Module
 * Handles all purely visual rendering.
 * (Converted to IIFE for file:// support)
 */
(function () {
    window.AppUI = {
        renderLogin: () => {
            return `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; padding: 2rem;">
                    <div class="card" style="width: 100%; max-width: 400px; text-align: center;">
                        <button onclick="window.AppAuth.resetData()" style="position: absolute; top: 1rem; right: 1rem; background: none; border: none; color: #9ca3af; cursor: pointer; font-size: 0.8rem;">
                             <i class="fa-solid fa-rotate-right"></i> Reset App
                        </button>
                        <div class="logo-circle" style="width: 60px; height: 60px; margin: 0 auto 1.5rem auto;">
                            <img src="https://ui-avatars.com/api/?name=CRWI&background=random" alt="Logo">
                        </div>
                        <h2 style="margin-bottom: 0.5rem;">CRWI Attendance</h2>
                        <p class="text-muted" style="margin-bottom: 2rem;">Please sign in to continue</p>
                        
                        <form id="login-form" style="display: flex; flex-direction: column; gap: 1rem; text-align: left;">
                            <div>
                                <label style="font-size: 0.9rem; font-weight: 500; margin-bottom: 0.5rem; display: block;">Login ID / Email</label>
                                <input type="text" name="username" placeholder="Enter Login ID" required style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.5rem;">
                            </div>
                            <div>
                                <label style="font-size: 0.9rem; font-weight: 500; margin-bottom: 0.5rem; display: block;">Password</label>
                                <input type="password" name="password" placeholder="Enter Password" required style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.5rem;">
                            </div>
                            
                            <button type="submit" class="action-btn" style="margin-top: 1rem; width: 100%;">Sign In</button>
                        </form>
                        
                        <p style="margin-top: 2rem; font-size: 0.85rem; color: #6b7280;">
                            Contact Admin for login credentials.
                        </p>
                    </div>
                </div>
             `;
        },

        async renderDashboard() {
            const user = window.AppAuth.getUser();
            const { status } = await window.AppAttendance.getStatus();
            const isCheckedIn = status === 'in';
            const notifications = user.notifications || [];
            const recentLogs = await window.AppAttendance.getLogs();

            let timerHTML = '00 : 00 : 00';
            let btnText = 'Check-in';
            let btnClass = 'action-btn';
            let statusText = 'Yet to check-in';
            let statusClass = 'out';

            if (isCheckedIn) {
                btnText = 'Check-out';
                btnClass = 'action-btn checkout';
                statusText = 'Checked In';
                statusClass = 'in';
            }

            // Notification Card HTML
            let notifHTML = '';
            if (notifications.length > 0) {
                notifHTML = `
                    <div class="card full-width" style="background: linear-gradient(to right, #fef3c7, #fff7ed); border-left: 5px solid #f59e0b;">
                        <h4 style="color: #b45309; margin-bottom: 0.5rem;"><i class="fa-solid fa-bell"></i> Notifications</h4>
                        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                            ${notifications.map((n, idx) => `
                                <div style="display: flex; justify-content: space-between; align-items: start; gap: 1rem; padding-bottom: 0.5rem; ${idx !== notifications.length - 1 ? 'border-bottom: 1px solid rgba(0,0,0,0.05);' : ''}">
                                    <div>
                                        <p style="font-size: 0.95rem; color: #78350f;">${n.message}</p>
                                        <small style="color: #92400e; font-size: 0.75rem;">${n.date}</small>
                                    </div>
                                    <button onclick="document.dispatchEvent(new CustomEvent('dismiss-notification', {detail: ${idx}}))" style="background: none; border: none; color: #b45309; cursor: pointer;">
                                        <i class="fa-solid fa-xmark"></i>
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }

            const monthlyStats = await window.AppAnalytics.getUserMonthlyStats(user.id);
            const yearlyStats = await window.AppAnalytics.getUserYearlyStats(user.id);

            // Helper to generate breakdown HTML
            const renderBreakdown = (breakdown) => {
                const items = Object.entries(breakdown);
                // Define colors/icons for keys
                const meta = {
                    'Present': { color: '#166534', bg: '#f0fdf4', label: 'Office' },
                    'Work - Home': { color: '#0369a1', bg: '#e0f2fe', label: 'WFH' },
                    'Training': { color: '#4338ca', bg: '#eef2ff', label: 'Training' },
                    'Late': { color: '#c2410c', bg: '#fff7ed', label: 'Late' },
                    'Sick Leave': { color: '#991b1b', bg: '#fef2f2', label: 'Sick' },
                    'Casual Leave': { color: '#9d174d', bg: '#fce7f3', label: 'Casual' },
                    'Earned Leave': { color: '#be185d', bg: '#fdf2f8', label: 'Earned' },
                    'Paid Leave': { color: '#be123c', bg: '#ffe4e6', label: 'Paid' },
                    'Maternity Leave': { color: '#a21caf', bg: '#fae8ff', label: 'Maternity' },
                    'Absent': { color: '#7f1d1d', bg: '#fee2e2', label: 'Absent' },
                    'Holiday': { color: '#1e293b', bg: '#f1f5f9', label: 'Holiday' },
                    'National Holiday': { color: '#334155', bg: '#f8fafc', label: 'Nat. Hol' },
                    'Regional Holidays': { color: '#475569', bg: '#f8fafc', label: 'Reg. Hol' }
                };

                return items.map(([key, count]) => {
                    // Show all relevant items, even if 0? User said "all the option should aprear". 
                    // But 0s might clutter. Let's show specific main ones always, others if > 0.
                    // Actually user said "all the option should aprear", so I will render them all that are relevant or maybe just a compact grid.
                    // To avoid massive grid, I'll filter for > 0 OR main ones (Present, Late, Absent).
                    const style = meta[key] || { color: '#374151', bg: '#f3f4f6', label: key };

                    // Skip if 0, unless it's Present/Late/Absent which are core
                    if (count === 0 && !['Present', 'Late', 'Absent'].includes(key)) return '';

                    return `
                        <div style="display:flex; flex-direction:column; align-items:center; padding:0.5rem; background:${style.bg}; border-radius:6px; min-width:60px;">
                            <span style="font-weight:700; font-size:1.1rem; color:${style.color}">${count}</span>
                            <span style="font-size:0.65rem; color:${style.color}; text-align:center; line-height:1.2;">${style.label}</span>
                        </div>
                     `;
                }).join('');
            };

            const summaryHTML = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                    <!-- Monthly Card -->
                    <div class="card" style="padding: 1rem;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem; border-bottom:1px solid #f3f4f6; padding-bottom:0.5rem;">
                            <div>
                                <h4 style="margin:0; color:#374151;">${monthlyStats.label}</h4>
                                <span style="font-size:0.75rem; color:#6b7280;">Monthly Stats</span>
                            </div>
                            ${monthlyStats.penalty > 0 ? '<span style="font-size:0.7rem; background:#fee2e2; color:#991b1b; padding:2px 6px; border-radius:4px;">Penalty Applied</span>' : ''}
                        </div>
                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center;">
                            ${renderBreakdown(monthlyStats.breakdown)}
                        </div>
                    </div>

                    <!-- Yearly Card -->
                    <div class="card" style="padding: 1rem;">
                         <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem; border-bottom:1px solid #f3f4f6; padding-bottom:0.5rem;">
                            <div>
                                <h4 style="margin:0; color:#374151;">Yearly Summary</h4>
                                <span style="font-size:0.75rem; color:#6b7280;">${yearlyStats.label}</span>
                            </div>
                        </div>
                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center;">
                             ${renderBreakdown(yearlyStats.breakdown)}
                        </div>
                    </div>
                </div>
            `;

            return `
                <div class="dashboard-grid">
                    ${notifHTML}
                    ${summaryHTML}

                    <div class="card welcome-card full-width">
                        <div>
                            <h3>Good Afternoon, ${user.name}</h3>
                            <p style="opacity: 0.9">Have a productive day!</p>
                        </div>
                        <i class="fa-solid fa-cloud-sun" style="font-size: 3rem; opacity: 0.8;"></i>
                    </div>

                    <div class="card check-in-widget">
                        <div class="user-mini-profile" style="flex-direction: column; text-align: center;">
                            <img src="${user.avatar}" alt="Profile" style="width: 80px; height: 80px;">
                            <div>
                                <h4>${user.name}</h4>
                                <p class="text-muted">${user.role}</p>
                            </div>
                        </div>

                        <div class="status-badge ${statusClass}" id="status-badge">
                            ${statusText}
                        </div>

                        <div class="timer-display" id="timer-display">${timerHTML}</div>

                        <button class="${btnClass}" id="attendance-btn">
                            ${btnText} <i class="fa-solid fa-fingerprint"></i>
                        </button>

                        <div class="location-text" id="location-text">
                            <i class="fa-solid fa-location-dot"></i> <span>Waiting for location...</span>
                        </div>
                    </div>

                    <div class="card">
                        <h4>Recent Activity</h4>
                        <div style="margin-top: 1rem; display: flex; flex-direction: column; gap: 1rem;">
                            ${recentLogs.slice(0, 3).map(log => `
                                <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.5rem; border-bottom: 1px solid #f3f4f6;">
                                    <div>
                                        <div style="font-weight: 500;">${log.date}</div>
                                        <div style="font-size: 0.8rem; color: #6b7280;">${log.checkIn} - ${log.checkOut || 'Working...'}</div>
                                    </div>
                                    <div style="font-weight: 600; color: var(--primary);">${log.duration || '--'}</div>
                                </div>
                            `).join('')}
                        </div>
                         <div style="margin-top: 1rem; text-align: center;">
                            <a href="#timesheet" onclick="window.location.hash = 'timesheet'; return false;" style="color: var(--primary); text-decoration: none; font-weight: 500;">View All</a>
                        </div>
                    </div>
                </div>
            `;
        },

        async renderTimesheet() {
            const logs = await window.AppAttendance.getLogs();
            return `
                <div class="card full-width">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <h3>Timesheet Log</h3>
                        <div style="display:flex; gap:0.5rem;">
                            <button class="action-btn secondary" style="padding: 0.5rem 1rem; font-size: 0.9rem; background: #fff1f2; color: #be123c; border: 1px solid #fda4af;" onclick="document.getElementById('leave-modal').style.display = 'flex'">
                                <i class="fa-solid fa-calendar-xmark"></i> Request Leave
                            </button>
                            <button class="action-btn" style="padding: 0.5rem 1rem; font-size: 0.9rem;" onclick="document.dispatchEvent(new CustomEvent('open-log-modal'))">
                                <i class="fa-solid fa-plus"></i> Add log
                            </button>
                        </div>
                    </div>
                    
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Check In</th>
                                    <th>Check Out</th>
                                    <th>Duration</th>
                                    <th>Type</th>
                                    <th>Location</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${logs.length ? logs.map(log => `
                                    <tr>
                                        <td>${log.date}</td>
                                        <td>${log.checkIn}</td>
                                        <td>${log.checkOut || '--'}</td>
                                        <td><span style="background: #eef2ff; color: var(--primary); padding: 0.25rem 0.5rem; border-radius: 4px; font-weight: 600;">${log.duration || '--'}</span></td>
                                        <td>${log.type || 'Office'}</td>
                                        <td>${log.location}</td>
                                    </tr>
                                `).join('') : `<tr><td colspan="6" style="text-align:center; padding: 2rem;">No logs found</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Add Log Modal (Modern) -->
                <div id="log-modal" class="modal-overlay" style="display: none;">
                    <div class="modal-content" style="width: 100%; max-width: 500px; padding: 0;">
                        <div style="padding: 1.5rem; border-bottom: 1px solid #f3f4f6;">
                            <h3 style="margin: 0;">New Time Entry</h3>
                            <p style="color: #6b7280; font-size: 0.9rem; margin-top: 0.25rem;">Log past or off-site work</p>
                        </div>
                        
                        <form id="manual-log-form" style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem;">
                            <div>
                                <label style="display: block; font-size: 0.85rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">Date</label>
                                <input type="date" name="date" id="log-date" required style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; background: #f9fafb; font-family: inherit;">
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                                <div>
                                    <label style="display: block; font-size: 0.85rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">Start Time</label>
                                    <input type="time" name="checkIn" id="log-start-time" required style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; background: #fff; font-family: inherit;">
                                </div>
                                <div>
                                    <label style="display: block; font-size: 0.85rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">End Time</label>
                                    <input type="time" name="checkOut" id="log-end-time" required style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; background: #fff; font-family: inherit;">
                                </div>
                            </div>

                            <div>
                                <label style="display: block; font-size: 0.85rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">Quick Duration</label>
                                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                    <button type="button" class="chip-btn" onclick="document.dispatchEvent(new CustomEvent('set-duration', {detail: 30}))">30m</button>
                                    <button type="button" class="chip-btn" onclick="document.dispatchEvent(new CustomEvent('set-duration', {detail: 60}))">1h</button>
                                    <button type="button" class="chip-btn" onclick="document.dispatchEvent(new CustomEvent('set-duration', {detail: 240}))">4h</button>
                                    <button type="button" class="chip-btn" onclick="document.dispatchEvent(new CustomEvent('set-duration', {detail: 480}))">8h</button>
                                </div>
                            </div>

                             <div>
                                <label style="display: block; font-size: 0.85rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem;">Activity Type</label>
                                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.75rem;">
                                    <button type="button" class="chip-btn" onclick="document.getElementById('log-location').value = 'Work - Home'">🏠 Work - Home</button>
                                    <button type="button" class="chip-btn" onclick="document.getElementById('log-location').value = 'Training'">🎓 Training</button>
                                    <button type="button" class="chip-btn" onclick="document.getElementById('log-location').value = 'Client Visit'">🤝 Client Visit</button>
                                    <button type="button" class="chip-btn" onclick="document.getElementById('log-location').value = 'Field Work'">🚧 Field Work</button>
                                </div>
                                <input type="text" name="location" id="log-location" placeholder="Or type activity description..." required style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.5rem;">
                            </div>

                            <div style="display: flex; gap: 1rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #f3f4f6;">
                                <button type="button" onclick="document.getElementById('log-modal').style.display = 'none'" style="flex: 1; padding: 0.75rem; border: 1px solid #e5e7eb; background: white; border-radius: 0.5rem; cursor: pointer; color: #374151; font-weight: 500;">Cancel</button>
                                <button type="submit" class="action-btn" style="flex: 2; padding: 0.75rem; border-radius: 0.5rem;">
                                    <i class="fa-solid fa-check"></i> Save Entry
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Request Leave Modal -->
                <div id="leave-modal" class="modal-overlay" style="display: none;">
                    <div class="modal-content" style="width: 100%; max-width: 500px;">
                        <h3>Request Leave</h3>
                        <form id="leave-request-form" style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;">
                            <div style="display: flex; gap: 1rem;">
                                <label style="flex:1">From
                                    <input type="date" name="startDate" required style="width:100%; padding:0.5rem; border:1px solid #ddd; border-radius:0.5rem;">
                                </label>
                                <label style="flex:1">To
                                    <input type="date" name="endDate" required style="width:100%; padding:0.5rem; border:1px solid #ddd; border-radius:0.5rem;">
                                </label>
                            </div>
                            <label>Type
                                <select name="type" required style="width:100%; padding:0.5rem; border:1px solid #ddd; border-radius:0.5rem;">
                                    <option value="Casual Leave">Casual Leave</option>
                                    <option value="Sick Leave">Sick Leave</option>
                                    <option value="Earned Leave">Earned Leave</option>
                                    <option value="Paid Leave">Paid Leave</option>
                                    <option value="Maternity Leave">Maternity Leave</option>
                                    <option value="Regional Holidays">Regional Holidays</option>
                                    <option value="National Holiday">National Holiday</option>
                                    <option value="Holiday">Holiday</option>
                                    <option value="Absent">Absent</option>
                                </select>
                            </label>
                            <label>Reason
                                <textarea name="reason" rows="3" required style="width:100%; padding:0.5rem; border:1px solid #ddd; border-radius:0.5rem;"></textarea>
                            </label>
                            <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                                <button type="button" onclick="document.getElementById('leave-modal').style.display = 'none'" style="flex: 1; padding: 0.75rem; border: 1px solid #ddd; background: white; border-radius: 0.5rem; cursor: pointer;">Cancel</button>
                                <button type="submit" class="action-btn" style="flex: 1; padding: 0.75rem; border-radius: 0.5rem; background: #be123c;">Submit Request</button>
                            </div>
                        </form>
                    </div>
                </div>

                
                <div id="edit-user-modal" class="modal-overlay" style="display: none;">
                    <div class="modal-content">
                        <h3>Edit Staff Details</h3>
                        <form id="edit-user-form" style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;">
                            <input type="hidden" name="id" id="edit-user-id">
                            <label>
                                Full Name
                                <input type="text" name="name" id="edit-user-name" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.5rem;">
                            </label>
                            
                            <div style="display: flex; gap: 1rem; background: #fffbeb; padding: 1rem; border-radius: 0.5rem; border: 1px dashed #f59e0b;">
                                <label style="flex:1">
                                    Login ID
                                    <input type="text" name="username" id="edit-user-username" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.5rem;">
                                </label>
                                <label style="flex:1">
                                    Password
                                    <input type="text" name="password" id="edit-user-password" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.5rem;">
                                </label>
                            </div>

                            <label>
                                Role/Designation
                                <input type="text" name="role" id="edit-user-role" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.5rem;">
                            </label>
                            <label>
                                Department
                                <input type="text" name="dept" id="edit-user-dept" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.5rem;">
                            </label>
                             <div style="display: flex; gap: 1rem;">
                                <label style="flex:1">
                                    Email
                                    <input type="email" name="email" id="edit-user-email" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.5rem;">
                                </label>
                                <label style="flex:1">
                                    Phone
                                    <input type="tel" name="phone" id="edit-user-phone" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.5rem;">
                                </label>
                            </div>
                            
                            <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                                <button type="button" onclick="document.getElementById('edit-user-modal').style.display = 'none'" style="flex: 1; padding: 0.75rem; border: 1px solid #ddd; background: white; border-radius: 0.5rem; cursor: pointer;">Cancel</button>
                                <button type="submit" class="action-btn" style="flex: 1; padding: 0.75rem; border-radius: 0.5rem;">Update Details</button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- User Details Modal (Logs) -->
                <div id="user-details-modal" class="modal-overlay" style="display: none;">
                    <div class="modal-content" style="max-width: 700px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                            <h3>Staff Attendance Record</h3>
                            <button onclick="document.getElementById('user-details-modal').style.display='none'" style="background:none; border:none; cursor:pointer; font-size:1.2rem;"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                        <div id="user-details-content">
                            <!-- Injected by JS -->
                        </div>
                    </div>
                </div>

                <!-- Send Notification Modal -->
                 <div id="notify-modal" class="modal-overlay" style="display: none;">
                    <div class="modal-content">
                        <h3>Send Notification</h3>
                        <form id="notify-form" style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;">
                            <input type="hidden" name="toUserId" id="notify-user-id">
                            <label>
                                Message
                                <textarea name="message" required rows="4" placeholder="Type your message here..." style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.5rem; font-family: inherit;"></textarea>
                            </label>
                            
                            <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                                <button type="button" onclick="document.getElementById('notify-modal').style.display = 'none'" style="flex: 1; padding: 0.75rem; border: 1px solid #ddd; background: white; border-radius: 0.5rem; cursor: pointer;">Cancel</button>
                                <button type="submit" class="action-btn" style="flex: 1; padding: 0.75rem; border-radius: 0.5rem;">Send Message</button>
                            </div>
                        </form>
                    </div>
                </div>
                
                 <!-- Add User Modal -->
                <div id="add-user-modal" class="modal-overlay" style="display: none;">
                    <div class="modal-content">
                        <h3>Create New Account</h3>
                        <form id="add-user-form" style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;">
                            <label>
                                Full Name
                                <input type="text" name="name" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.5rem;">
                            </label>
                            
                            <div style="display: flex; gap: 1rem; background: #f9fafb; padding: 1rem; border-radius: 0.5rem; border: 1px dashed #d1d5db;">
                                <label style="flex:1">
                                    Login ID
                                    <input type="text" name="username" placeholder="e.g. jomit" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.5rem;">
                                </label>
                                <label style="flex:1">
                                    Password
                                    <input type="text" name="password" placeholder="e.g. secret123" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.5rem;">
                                </label>
                            </div>

                            <label>
                                Role/Designation
                                <input type="text" name="role" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.5rem;">
                            </label>
                            <label>
                                Department
                                <input type="text" name="dept" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.5rem;">
                            </label>
                             <div style="display: flex; gap: 1rem;">
                                <label style="flex:1">
                                    Email
                                    <input type="email" name="email" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.5rem;">
                                </label>
                                <label style="flex:1">
                                    Phone
                                    <input type="tel" name="phone" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.5rem;">
                                </label>
                            </div>
                            <label>
                                Joining Date
                                <input type="date" name="joinDate" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.5rem;">
                            </label>
                            
                            <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                                <button type="button" onclick="document.getElementById('add-user-modal').style.display = 'none'" style="flex: 1; padding: 0.75rem; border: 1px solid #ddd; background: white; border-radius: 0.5rem; cursor: pointer;">Cancel</button>
                                <button type="submit" class="action-btn" style="flex: 1; padding: 0.75rem; border-radius: 0.5rem;">Create Account</button>
                            </div>
                        </form>
                    </div>
                </div>

             `;
        },

        async renderProfile() {
            try {
                const user = window.AppAuth.getUser();
                if (!user) return '<div class="card">User state lost. Please <a href="#" onclick="window.AppAuth.logout()">Login Again</a></div>';

                const leaves = await window.AppLeaves.getUserLeaves(user.id);

                return `
                    <div class="dashboard-grid">
                        <div class="card full-width">
                            <div style="text-align: center; margin-bottom: 2rem;">
                                <div class="logo-circle" style="width: 100px; height: 100px; margin: 0 auto 1rem auto;">
                                    <img src="${user.avatar}" alt="Profile">
                                </div>
                                <h2>${user.name}</h2>
                                <p class="text-muted">${user.role}</p>
                                <span class="badge ${user.status === 'in' ? 'in' : 'out'}" style="margin-top: 0.5rem; display: inline-block;">
                                    ${user.status === 'in' ? 'Currently Checked In' : 'Currently Checked Out'}
                                </span>
                            </div>

                            <div class="grid-2">
                                <div style="padding: 1rem; background: #f9fafb; border-radius: 0.5rem;">
                                    <small class="text-muted" style="display: block; margin-bottom: 0.25rem;">Login ID</small>
                                    <div style="font-weight: 500;">${user.username}</div>
                                </div>
                                <div style="padding: 1rem; background: #f9fafb; border-radius: 0.5rem;">
                                    <small class="text-muted" style="display: block; margin-bottom: 0.25rem;">Department</small>
                                    <div style="font-weight: 500;">${user.dept || 'General'}</div>
                                </div>
                                <div style="padding: 1rem; background: #f9fafb; border-radius: 0.5rem;">
                                    <small class="text-muted" style="display: block; margin-bottom: 0.25rem;">Email</small>
                                    <div style="font-weight: 500;">${user.email || '--'}</div>
                                </div>
                                <div style="padding: 1rem; background: #f9fafb; border-radius: 0.5rem;">
                                    <small class="text-muted" style="display: block; margin-bottom: 0.25rem;">Phone</small>
                                    <div style="font-weight: 500;">${user.phone || '--'}</div>
                                </div>
                                <div style="padding: 1rem; background: #f9fafb; border-radius: 0.5rem;">
                                    <small class="text-muted" style="display: block; margin-bottom: 0.25rem;">Joined On</small>
                                    <div style="font-weight: 500;">${user.joinDate || '--'}</div>
                                </div>
                            </div>

                            <div style="margin-top: 2rem; border-top: 1px solid #f3f4f6; padding-top: 1.5rem;">
                                <button class="action-btn" onclick="document.dispatchEvent(new CustomEvent('auth-logout'))" style="width: 100%; background: #fee2e2; color: #991b1b; border: 1px solid #fecaca;">
                                    Sign Out
                                </button>
                                ${user.role === 'Administrator' ? `
                                <p style="margin-top: 1rem; text-align: center; font-size: 0.85rem; color: #6b7280;">
                                    Wait 3 seconds for Admin button to appear after login...
                                </p>` : ''}
                            </div>
                        </div>

                        <!-- Leave History Section -->
                        <div class="card full-width" style="margin-top: 1.5rem;">
                            <h3>My Leave History</h3>
                            <div class="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Dates</th>
                                            <th>Type</th>
                                            <th>Reason</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${leaves.length ? leaves.map(l => {
                    let badgeColor = '#f3f4f6'; // Pending (Gray)
                    let textColor = '#374151';
                    if (l.status === 'Approved') { badgeColor = '#dcfce7'; textColor = '#166534'; }
                    if (l.status === 'Rejected') { badgeColor = '#fee2e2'; textColor = '#991b1b'; }

                    return `
                                            <tr>
                                                <td>${l.startDate} <span style="color:#9ca3af">to</span> ${l.endDate}</td>
                                                <td>${l.type}</td>
                                                <td style="color:#6b7280; font-size:0.9rem;">${l.reason}</td>
                                                <td><span style="background:${badgeColor}; color:${textColor}; padding:0.25rem 0.5rem; border-radius:4px; font-size:0.8rem; font-weight:600;">${l.status}</span></td>
                                            </tr>`;
                }).join('') : '<tr><td colspan="4" style="text-align:center; padding:1.5rem; color:#6b7280;">No leave requests found.</td></tr>'}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                `;
            } catch (e) {
                console.error("Profile Render Error", e);
                return `<div style="padding: 2rem; color: red;">Error loading profile: ${e.message}</div>`;
            }
        },

        async renderAdmin() {
            let allUsers = [];
            try {
                allUsers = await window.AppDB.getAll('users');
            } catch (e) {
                console.error("Failed to fetch users", e);
                return `<div style="padding: 2rem; color: red;">Error loading users: ${e.message}</div>`;
            }

            if (!allUsers || allUsers.length === 0) {
                return `
                    <div class="dashboard-grid">
                        <div class="card full-width" style="text-align:center; padding: 3rem;">
                            <h3>No User Data Found</h3>
                            <p class="text-muted">The database appears to be empty.</p>
                            <button onclick="window.AppAuth.seedUsers().then(() => window.location.reload())" class="action-btn" style="margin-top: 1rem;">
                                <i class="fa-solid fa-database"></i> Seed Mock Data
                            </button>
                        </div>
                    </div>
                 `;
            }

            // Re-fetch allUsers and other data here for the main return block
            // This is necessary because the `if (!allUsers || allUsers.length === 0)` block might have returned early.
            // If it didn't return, allUsers is already populated from the first try-catch.
            // However, pendingLeaves and usersMap might not be if the first try-catch failed.
            // To simplify, we'll re-declare and fetch them here, assuming the first try-catch only handles the empty state.
            // A more robust solution would be to structure the try-catch to populate all necessary data once.
            const allUsersForTable = await window.AppDB.getAll('users'); // Re-fetch or pass from above
            const pendingLeaves = await window.AppLeaves.getPendingLeaves();
            const usersMap = {};
            allUsersForTable.forEach(u => usersMap[u.id] = u);


            return `
               <div class="dashboard-grid">
                  <!-- LEAVE REQUESTS WIDGET -->
                  ${pendingLeaves.length > 0 ? `
                  <div class="card full-width" style="border-left: 4px solid #f59e0b;">
                    <h3>🚨 Pending Leave Requests (${pendingLeaves.length})</h3>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Staff</th>
                                    <th>Type</th>
                                    <th>Dates</th>
                                    <th>Reason</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${pendingLeaves.map(l => {
                const user = usersMap[l.userId] || { name: 'Unknown' };
                return `
                                        <tr>
                                            <td style="font-weight:600">${user.name}</td>
                                            <td><span class="badge" style="background:#fff7ed; color:#c2410c">${l.type}</span></td>
                                            <td>${l.startDate} to ${l.endDate}</td>
                                            <td style="font-size:0.9rem; color:#6b7280; max-width:200px; white-space:normal;">${l.reason}</td>
                                            <td>
                                                <div style="display:flex; gap:0.5rem;">
                                                    <button onclick="window.app_handleLeave('${l.id}', 'Approved')" style="padding:0.4rem 0.8rem; background:#dcfce7; color:#166534; border:none; border-radius:4px; cursor:pointer; font-size:0.8rem;">Approve</button>
                                                    <button onclick="window.app_handleLeave('${l.id}', 'Rejected')" style="padding:0.4rem 0.8rem; background:#fee2e2; color:#991b1b; border:none; border-radius:4px; cursor:pointer; font-size:0.8rem;">Reject</button>
                                                </div>
                                            </td>
                                        </tr>
                                    `;
            }).join('')}
                            </tbody>
                        </table>
                    </div>
                  </div>
                  ` : ''}

                  <!-- ANALYTICS CHART -->
                   <div class="card full-width">
                        <div style="height: 300px;">
                            <canvas id="admin-stats-chart"></canvas>
                        </div>
                   </div>

                  <!-- USER TABLE -->
                  <div class="card full-width">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                            <h3>Staff Monitoring & Control</h3>
                            <div style="display:flex; gap:1rem; align-items:center;">
                                <span style="font-size:0.8rem; color:#6b7280; display:flex; align-items:center; gap:0.25rem;">
                                    <span style="display:block; width:8px; height:8px; background:var(--success); border-radius:50%; animation: pulse 1.5s infinite;"></span> Live
                                </span>
                                <button class="action-btn secondary" onclick="window.AppReports.exportAttendanceCSV()" style="background: #eef2ff; color: var(--primary); border: 1px solid #c7d2fe;">
                                    <i class="fa-solid fa-file-csv"></i> Export CSV
                                </button>
                                <button class="action-btn" onclick="document.getElementById('add-user-modal').style.display = 'flex'">
                                    <i class="fa-solid fa-user-plus"></i> New Account
                                </button>
                            </div>
                        </div>
                        
                        <div class="table-container">
                        <table id="admin-user-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Status</th>
                                    <th>Check-In Time</th>
                                    <th>Login ID</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${allUsers.map(u => {
                const statusColor = u.status === 'in' ? 'var(--success)' : '#9ca3af';
                const statusText = u.status === 'in' ? 'Online' : 'Offline';
                const lastSeen = u.lastCheckIn ? new Date(u.lastCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';
                const rowStyle = u.status === 'in' ? 'background: #f0fdf4;' : '';

                return `
                                    <tr style="${rowStyle}">
                                        <td>
                                            <div style="display:flex; align-items:center; gap:0.5rem;">
                                                <img src="${u.avatar}" style="width:30px;height:30px;border-radius:50%">
                                                <div>
                                                    <div style="font-weight:600">${u.name}</div>
                                                    <div style="font-size:0.75rem;color:#6b7280">${u.role}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style="display:flex; align-items:center; gap:0.5rem;">
                                                <div style="width:8px; height:8px; border-radius:50%; background:${statusColor}"></div>
                                                <span style="font-size:0.9rem; font-weight:500;">${statusText}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span style="font-family:monospace; background:${u.status === 'in' ? '#dcfce7' : '#f3f4f6'}; color:${u.status === 'in' ? '#166534' : '#374151'}; padding:2px 6px; border-radius:4px;">
                                                ${lastSeen}
                                            </span>
                                        </td>
                                        <td>${u.username}</td>
                                        <td>
                                            <div style="display: flex; gap: 0.5rem;">
                                                <button onclick="window.app_editUser('${u.id}')" style="padding: 0.4rem; background: #f3f4f6; color: #4b5563; border: none; border-radius: 0.5rem; cursor: pointer;" title="Edit User">
                                                    <i class="fa-solid fa-pen"></i>
                                                </button>
                                                <button onclick="window.app_viewLogs('${u.id}')" style="padding: 0.4rem 0.8rem; background: #eef2ff; color: var(--primary); border: none; border-radius: 0.5rem; cursor: pointer; font-size: 0.85rem; font-weight: 500;">
                                                    <i class="fa-solid fa-file-invoice"></i> Logs
                                                </button>
                                                <button onclick="window.app_notifyUser('${u.id}')" style="padding: 0.4rem 0.8rem; background: #fff7ed; color: #b45309; border: none; border-radius: 0.5rem; cursor: pointer; font-size: 0.85rem; font-weight: 500;">
                                                    <i class="fa-solid fa-envelope"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    `;
            }).join('')}
                            </tbody>
                        </table>
                    </div>
                  </div>

                  <!-- SHARED MODALS FOR ADMIN -->
                    <div id="edit-user-modal" class="modal-overlay" style="display: none;">
                        <div class="modal-content">
                            <h3>Edit Staff Details</h3>
                            <form id="edit-user-form" onsubmit="window.app_submitEditUser(event)" style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;">
                                <input type="hidden" name="id" id="edit-user-id">
                                <label>
                                    Full Name
                                    <input type="text" name="name" id="edit-user-name" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.5rem;">
                                </label>
                                
                                <div style="display: flex; gap: 1rem; background: #fffbeb; padding: 1rem; border-radius: 0.5rem; border: 1px dashed #f59e0b;">
                                    <label style="flex:1">
                                        Login ID
                                        <input type="text" name="username" id="edit-user-username" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.5rem;">
                                    </label>
                                    <label style="flex:1">
                                        Password
                                        <input type="text" name="password" id="edit-user-password" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.5rem;">
                                    </label>
                                </div>

                                <label>
                                    Role/Designation
                                    <select name="role" id="edit-user-role" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.5rem;">
                                        <option value="Employee">Employee</option>
                                        <option value="Administrator">Administrator</option>
                                        <option value="Manager">Manager</option>
                                    </select>
                                </label>
                                <label>
                                    Department
                                    <input type="text" name="dept" id="edit-user-dept" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.5rem;">
                                </label>
                                 <div style="display: flex; gap: 1rem;">
                                    <label style="flex:1">
                                        Email
                                        <input type="email" name="email" id="edit-user-email" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.5rem;">
                                    </label>
                                    <label style="flex:1">
                                        Phone
                                        <input type="tel" name="phone" id="edit-user-phone" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.5rem;">
                                    </label>
                                </div>
                                
                                <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                                    <button type="button" onclick="document.getElementById('edit-user-modal').style.display = 'none'" style="flex: 1; padding: 0.75rem; border: 1px solid #ddd; background: white; border-radius: 0.5rem; cursor: pointer;">Cancel</button>
                                    <button type="submit" class="action-btn" style="flex: 1; padding: 0.75rem; border-radius: 0.5rem;">Update Details</button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <div id="user-details-modal" class="modal-overlay" style="display: none;">
                        <div class="modal-content" style="max-width: 700px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                                <h3>Staff Attendance Record</h3>
                                <button onclick="document.getElementById('user-details-modal').style.display='none'" style="background:none; border:none; cursor:pointer; font-size:1.2rem;"><i class="fa-solid fa-xmark"></i></button>
                            </div>
                            <div id="user-details-content">
                                <!-- Injected by JS -->
                            </div>
                        </div>
                    </div>

                     <div id="notify-modal" class="modal-overlay" style="display: none;">
                        <div class="modal-content">
                            <h3>Send Notification</h3>
                            <form id="notify-form" style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;">
                                <input type="hidden" name="toUserId" id="notify-user-id">
                                <label>
                                    Message
                                    <textarea name="message" required rows="4" placeholder="Type your message here..." style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.5rem; font-family: inherit;"></textarea>
                                </label>
                                
                                <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                                    <button type="button" onclick="document.getElementById('notify-modal').style.display = 'none'" style="flex: 1; padding: 0.75rem; border: 1px solid #ddd; background: white; border-radius: 0.5rem; cursor: pointer;">Cancel</button>
                                    <button type="submit" class="action-btn" style="flex: 1; padding: 0.75rem; border-radius: 0.5rem;">Send Message</button>
                                </div>
                            </form>
                        </div>
                    </div>
                
                    <div id="add-user-modal" class="modal-overlay" style="display: none;">
                        <div class="modal-content">
                            <h3>Create New Account</h3>
                            <form id="add-user-form" style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;">
                                <label>
                                    Full Name
                                    <input type="text" name="name" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.5rem;">
                                </label>
                                
                                <div style="display: flex; gap: 1rem; background: #f9fafb; padding: 1rem; border-radius: 0.5rem; border: 1px dashed #d1d5db;">
                                    <label style="flex:1">
                                        Login ID
                                        <input type="text" name="username" placeholder="e.g. jomit" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.5rem;">
                                    </label>
                                    <label style="flex:1">
                                        Password
                                        <input type="text" name="password" placeholder="e.g. secret123" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.5rem;">
                                    </label>
                                </div>

                                <label>
                                    Role/Designation
                                    <input type="text" name="role" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.5rem;">
                                </label>
                                <label>
                                    Department
                                    <input type="text" name="dept" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.5rem;">
                                </label>
                                 <div style="display: flex; gap: 1rem;">
                                    <label style="flex:1">
                                        Email
                                        <input type="email" name="email" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.5rem;">
                                    </label>
                                    <label style="flex:1">
                                        Phone
                                        <input type="tel" name="phone" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.5rem;">
                                    </label>
                                </div>
                                <label>
                                    Joining Date
                                    <input type="date" name="joinDate" required style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.5rem;">
                                </label>
                                
                                <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                                    <button type="button" onclick="document.getElementById('add-user-modal').style.display = 'none'" style="flex: 1; padding: 0.75rem; border: 1px solid #ddd; background: white; border-radius: 0.5rem; cursor: pointer;">Cancel</button>
                                    <button type="submit" class="action-btn" style="flex: 1; padding: 0.75rem; border-radius: 0.5rem;">Create Account</button>
                                </div>
                            </form>
                        </div>
                    </div>
               </div>
             `;
        }
    };
})();
