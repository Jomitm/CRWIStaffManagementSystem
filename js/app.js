/**
 * App Entry Point
 * Initializes modules and handles routing.
 * (Converted to IIFE for file:// support)
 */
(function () {
    // Shortcuts (Aliases)
    // We assume AppAuth, AppAttendance, AppUI, AppDB are attached to window by previous scripts

    // App State
    let timerInterval = null;
    let adminPollInterval = null;

    // DOM Elements - queried dynamically or once if available
    const contentArea = document.getElementById('page-content');
    const sidebar = document.querySelector('.sidebar');
    const mobileHeader = document.querySelector('.mobile-header');
    const mobileNav = document.querySelector('.mobile-nav');

    async function initApp() {
        try {
            await window.AppAuth.init();
            router();
            registerSW();
        } catch (e) {
            console.error("Initialization Failed:", e);
            if (contentArea) contentArea.innerHTML = `<div style="text-align:center; padding:2rem; color:red;">Failed to load application.<br><small>${e.message}</small></div>`;
        }
    }

    function registerSW() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js')
                    .then(reg => console.log('ServiceWorker registered'))
                    .catch(err => console.log('ServiceWorker registration failed: ', err));
            });
        }
    }

    // Router
    async function router() {
        const user = window.AppAuth.getUser();
        const hash = window.location.hash.slice(1) || 'dashboard';

        // Cleanup
        if (hash !== 'admin' && adminPollInterval) {
            clearInterval(adminPollInterval);
            adminPollInterval = null;
        }

        // AUTH GUARD
        if (!user) {
            if (sidebar) sidebar.style.display = 'none';
            if (mobileHeader) mobileHeader.style.display = 'none';
            if (mobileNav) mobileNav.style.display = 'none';
            document.body.style.background = '#f3f4f6';
            if (contentArea) contentArea.innerHTML = window.AppUI.renderLogin();
            return;
        }

        // LOGGED IN
        if (sidebar && window.innerWidth > 768) sidebar.style.display = 'flex';
        if (mobileHeader) mobileHeader.style.display = 'flex';
        if (mobileNav) mobileNav.style.display = 'flex';

        // Update Side Profile
        const sideProfile = document.querySelector('.sidebar-footer .user-mini-profile');
        if (sideProfile) {
            sideProfile.innerHTML = `
                <img src="${user.avatar}" alt="User">
                <div>
                    <p class="user-name">${user.name}</p>
                    <p class="user-role">${user.role}</p>
                </div>
            `;
        }

        // Admin Link logic
        const adminLinks = document.querySelectorAll('a[data-page="admin"]');
        adminLinks.forEach(link => {
            if (user.role === 'Administrator') {
                link.style.display = 'flex';
            } else {
                link.style.setProperty('display', 'none', 'important');
            }
        });

        // Active Nav
        const navLinks = document.querySelectorAll('.nav-item, .mobile-nav-item');
        navLinks.forEach(link => {
            if (link.dataset.page === hash) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Content Rendering
        try {
            if (hash === 'dashboard') {
                contentArea.innerHTML = await window.AppUI.renderDashboard();
                setupDashboardEvents();
            } else if (hash === 'timesheet') {
                contentArea.innerHTML = await window.AppUI.renderTimesheet();
            } else if (hash === 'profile') {
                contentArea.innerHTML = await window.AppUI.renderProfile();
            } else if (hash === 'admin') {
                if (user.role !== 'Administrator') {
                    window.location.hash = 'dashboard';
                    return;
                }
                contentArea.innerHTML = await window.AppUI.renderAdmin();
                window.AppAnalytics.initAdminCharts();
                startAdminPolling();
            }
        } catch (e) {
            console.error("Render Error:", e);
        }
    }

    // --- Admin Polling ---
    function startAdminPolling() {
        if (adminPollInterval) clearInterval(adminPollInterval);

        adminPollInterval = setInterval(async () => {
            if (window.location.hash === '#admin') {
                const openModal = document.querySelector('.modal-overlay[style*="display: flex"]');
                if (!openModal) {
                    const tableBody = document.querySelector('#admin-user-table tbody');
                    if (tableBody) {
                        const updatedUI = await window.AppUI.renderAdmin();
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(updatedUI, 'text/html');
                        const newBody = doc.querySelector('#admin-user-table tbody');
                        if (newBody) tableBody.innerHTML = newBody.innerHTML;
                    }
                }
            }
        }, 3000);
    }

    // --- Event Handlers ---

    function startTimer() {
        if (timerInterval) clearInterval(timerInterval);
        window.AppAttendance.getStatus().then(({ status, lastCheckIn }) => {
            const display = document.getElementById('timer-display');
            if (status === 'in' && lastCheckIn && display) {
                timerInterval = setInterval(() => {
                    const now = Date.now();
                    const diff = now - lastCheckIn;
                    const hrs = Math.floor((diff / (1000 * 60 * 60)) % 24).toString().padStart(2, '0');
                    const mins = Math.floor((diff / (1000 * 60)) % 60).toString().padStart(2, '0');
                    const secs = Math.floor((diff / 1000) % 60).toString().padStart(2, '0');
                    display.textContent = `${hrs} : ${mins} : ${secs}`;
                }, 1000);
            } else if (display) {
                display.textContent = '00 : 00 : 00';
            }
        });
    }

    function getLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) reject('Geolocation is not supported');
            else navigator.geolocation.getCurrentPosition(
                (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
                (e) => reject('Unable to retrieve location')
            );
        });
    }

    async function handleAttendance() {
        const btn = document.getElementById('attendance-btn');
        const locationText = document.getElementById('location-text');
        const { status } = await window.AppAttendance.getStatus();

        if (btn) btn.disabled = true;

        try {
            if (status === 'out') {
                if (btn) btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Locating...`;
                const pos = await getLocation();
                if (locationText) locationText.innerHTML = `<i class="fa-solid fa-location-dot"></i> Lat: ${pos.lat.toFixed(4)}, Lng: ${pos.lng.toFixed(4)}`;

                await window.AppAttendance.checkIn(pos.lat, pos.lng);
                contentArea.innerHTML = await window.AppUI.renderDashboard();
                setupDashboardEvents();
            } else {
                await window.AppAttendance.checkOut();
                contentArea.innerHTML = await window.AppUI.renderDashboard();
                setupDashboardEvents();
            }
        } catch (err) {
            alert(err.message || err);
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = status === 'out' ? 'Check-in <i class="fa-solid fa-fingerprint"></i>' : 'Check-out <i class="fa-solid fa-fingerprint"></i>';
            }
        }
    }

    async function handleManualLog(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const dur = calculateDuration(formData.get('checkIn'), formData.get('checkOut'));
        if (dur === 'Invalid') {
            alert('End time must be after Start time');
            return;
        }
        const logData = {
            date: formData.get('date'),
            checkIn: formData.get('checkIn'),
            checkOut: formData.get('checkOut'),
            duration: dur,
            location: formData.get('location'),
            type: 'Manual/WFH'
        };
        await window.AppAttendance.addManualLog(logData);
        alert('Log added successfully!');
        document.getElementById('log-modal').style.display = 'none';
        contentArea.innerHTML = await window.AppUI.renderTimesheet();
    }

    async function handleAddUser(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const userData = {
            id: 'u' + Date.now(),
            name: formData.get('name'),
            username: formData.get('username'),
            password: formData.get('password'),
            role: formData.get('role'),
            dept: formData.get('dept'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            joinDate: formData.get('joinDate'),
            avatar: `https://ui-avatars.com/api/?name=${formData.get('name')}&background=random&color=fff`,
            status: 'out',
            lastCheckIn: null
        };
        try {
            await window.AppDB.add('users', userData);
            alert('Success! Account created.');
            document.getElementById('add-user-modal').style.display = 'none';
            contentArea.innerHTML = await window.AppUI.renderAdmin();
        } catch (err) {
            alert('Error creating user: ' + err.message);
        }
    }

    window.app_submitEditUser = async (e) => {
        // Explicitly handle event
        if (e) e.preventDefault();

        alert("Processing update... Please wait.");

        const form = document.getElementById('edit-user-form');
        const formData = new FormData(form);

        const id = formData.get('id');
        if (!id) {
            alert('Error: User ID missing.');
            return;
        }

        const userData = {
            id: id,
            name: formData.get('name'),
            username: formData.get('username'),
            password: formData.get('password'),
            role: formData.get('role'),
            dept: formData.get('dept'),
            email: formData.get('email'),
            phone: formData.get('phone')
        };

        console.log("Updating User:", userData);

        try {
            const success = await window.AppAuth.updateUser(userData);
            if (success) {
                alert(`SUCCESS: User '${userData.name}' updated.`);
                window.location.reload();
            } else {
                alert('DB Error: Update returned false.');
            }
        } catch (err) {
            console.error(err);
            alert('Exception: ' + err.message);
        }
    };

    // --- Helpers ---

    function calculateDuration(start, end) {
        const [h1, m1] = start.split(':');
        const [h2, m2] = end.split(':');
        const mins = (parseInt(h2) * 60 + parseInt(m2)) - (parseInt(h1) * 60 + parseInt(m1));
        if (mins < 0) return 'Invalid';
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${h}h ${m}m`;
    }

    function setupDashboardEvents() {
        const btn = document.getElementById('attendance-btn');
        if (btn) btn.addEventListener('click', handleAttendance);
        startTimer();
    }

    // --- Global Event Delegation ---

    document.addEventListener('submit', (e) => {
        const id = e.target.id;
        console.log("Form Submitted:", id); // Verify submission in console

        if (id === 'manual-log-form') handleManualLog(e);
        else if (id === 'add-user-form') handleAddUser(e);
        else if (id === 'login-form') {
            e.preventDefault();
            const fd = new FormData(e.target);
            window.AppAuth.login(fd.get('username'), fd.get('password')).then(success => {
                if (success) window.location.reload();
                else alert('Invalid Credentials');
            });
        }
        else if (id === 'edit-user-form') handleEditUser(e);
        else if (id === 'notify-form') handleNotifyUser(e);
        else if (id === 'leave-request-form') handleLeaveRequest(e);
    });

    async function handleLeaveRequest(e) {
        e.preventDefault();
        const fd = new FormData(e.target);
        const user = window.AppAuth.getUser();
        await window.AppLeaves.requestLeave({
            userId: user.id,
            startDate: fd.get('startDate'),
            endDate: fd.get('endDate'),
            type: fd.get('type'),
            reason: fd.get('reason')
        });
        alert('Leave requested successfully!');
        document.getElementById('leave-modal').style.display = 'none';
        e.target.reset();
    }

    async function handleNotifyUser(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const toUserId = formData.get('toUserId');
        const msg = formData.get('message');

        try {
            // Check if user exists
            const user = await window.AppDB.get('users', toUserId);
            if (!user) throw new Error("User not found");

            // Add notification
            if (!user.notifications) user.notifications = [];
            user.notifications.unshift({
                id: Date.now(),
                message: msg,
                date: new Date().toLocaleDateString(),
                read: false
            });

            await window.AppAuth.updateUser(user);
            alert('Notification sent!');
            document.getElementById('notify-modal').style.display = 'none';
        } catch (err) {
            alert('Failed to send: ' + err.message);
        }
    }

    document.addEventListener('auth-logout', () => window.AppAuth.logout());

    document.addEventListener('dismiss-notification', async (e) => {
        const index = e.detail;
        const user = window.AppAuth.getUser();
        if (user && user.notifications) {
            user.notifications.splice(index, 1);
            await window.AppAuth.updateUser(user);
            contentArea.innerHTML = await window.AppUI.renderDashboard();
        }
    });

    // Manual Log Logic
    document.addEventListener('open-log-modal', () => {
        const modal = document.getElementById('log-modal');
        if (!modal) return;
        const now = new Date();
        const pad = n => n.toString().padStart(2, '0');
        document.getElementById('log-date').value = now.toISOString().split('T')[0];
        document.getElementById('log-start-time').value = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
        const later = new Date(now.getTime() + 3600000);
        document.getElementById('log-end-time').value = `${pad(later.getHours())}:${pad(later.getMinutes())}`;
        modal.style.display = 'flex';
    });

    document.addEventListener('set-duration', (e) => {
        const minutes = e.detail;
        const startTimeInput = document.getElementById('log-start-time');
        const endTimeInput = document.getElementById('log-end-time');
        if (startTimeInput.value) {
            const [h, m] = startTimeInput.value.split(':').map(Number);
            const startDate = new Date();
            startDate.setHours(h, m);
            const endDate = new Date(startDate.getTime() + minutes * 60 * 1000);
            const pad = n => n.toString().padStart(2, '0');
            endTimeInput.value = `${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`;
        }
    });

    // Admin Events
    // --- Global Functions (Exposed for UI onclicks) ---

    window.app_editUser = async (userId) => {
        const user = await window.AppDB.get('users', userId);
        if (!user) return;
        const form = document.getElementById('edit-user-form');
        form.querySelector('#edit-user-id').value = user.id;
        form.querySelector('#edit-user-name').value = user.name;
        form.querySelector('#edit-user-username').value = user.username;
        form.querySelector('#edit-user-password').value = user.password;
        form.querySelector('#edit-user-role').value = user.role;
        form.querySelector('#edit-user-dept').value = user.dept;
        form.querySelector('#edit-user-email').value = user.email;
        form.querySelector('#edit-user-phone').value = user.phone;
        document.getElementById('edit-user-modal').style.display = 'flex';
    };

    window.app_notifyUser = (userId) => {
        console.log("Opening Notify for:", userId);
        document.getElementById('notify-user-id').value = userId;
        document.getElementById('notify-modal').style.display = 'flex';
    };

    window.app_viewLogs = async (userId) => {
        console.log("Viewing details for:", userId);
        const user = await window.AppDB.get('users', userId);
        const logs = await window.AppAttendance.getLogs(userId);

        const logsHTML = logs.length ? `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>In</th>
                            <th>Out</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${logs.map(log => `<tr><td>${log.date}</td><td>${log.checkIn}</td><td>${log.checkOut || '--'}</td></tr>`).join('')}
                    </tbody>
                </table>
            </div>` : '<p>No logs found.</p>';

        document.getElementById('user-details-content').innerHTML = `
            <h3>${user.name}</h3>
            ${logsHTML}
        `;
        document.getElementById('user-details-modal').style.display = 'flex';
    };

    window.app_handleLeave = async (leaveId, status) => {
        const user = window.AppAuth.getUser();
        await window.AppLeaves.updateLeaveStatus(leaveId, status, user.id);
        alert(`Leave ${status}!`);
        // Refresh Admin View
        const contentArea = document.getElementById('page-content');
        contentArea.innerHTML = await window.AppUI.renderAdmin();
    };

    // Listeners for Modal Events 
    // (We keep these as they are internal to app.js logic or standard form submits)
    // Removed old document.addEventListener calls for admin actions since we use global funcs now.

    // Initialization
    window.addEventListener('hashchange', router);
    window.addEventListener('load', initApp);
    window.addEventListener('resize', () => {
        if (sidebar) sidebar.style.display = window.innerWidth > 768 ? 'flex' : 'none';
    });

    console.log("App.js Loaded & Globals Ready");
})();
