const NODE_API = 'http://localhost:3000/api';
const PYTHON_API = 'http://localhost:5000/api/vision';

// --- UTILITIES & WEBRTC ---
function showToast(msg, isError = false) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className = `toast show ${isError ? 'error' : ''}`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function logout() {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

let videoStream = null;
async function initCamera(videoId) {
    const video = document.getElementById(videoId);
    if (!video) return;
    try {
        videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = videoStream;
    } catch (err) { showToast('Camera access denied', true); }
}
if (document.getElementById('videoElement')) initCamera('videoElement');

function captureFrame(videoId) {
    const video = document.getElementById(videoId);
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
}

function dataURLtoBlob(url) {
    let arr = url.split(','), mime = arr[0].match(/:(.*?);/)[1], bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while (n--) { u8arr[n] = bstr.charCodeAt(n); }
    return new Blob([u8arr], { type: mime });
}


// --- INDEX: AUTHENTICATION ---
function switchTab(tab) {
    const lf = document.getElementById('loginForm');
    const rf = document.getElementById('regForm');
    if (lf && rf) {
        lf.style.display = tab === 'login' ? 'block' : 'none';
        rf.style.display = tab === 'reg' ? 'block' : 'none';
        document.getElementById('tabLogin').style.background = tab === 'login' ? 'linear-gradient(135deg, var(--primary-glow), var(--accent-purple))' : 'transparent';
        document.getElementById('tabReg').style.background = tab === 'login' ? 'transparent' : 'linear-gradient(135deg, var(--primary-glow), var(--accent-purple))';
    }
}

function toggleCam() {
    const role = document.getElementById('r_role').value;
    document.getElementById('camSection').style.display = role === 'Student' ? 'block' : 'none';
}

if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${NODE_API}/login`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: e.target.l_user.value, password: e.target.l_pass.value })
            });
            if (!res.ok) throw new Error("Invalid username or password");
            const data = await res.json();
            localStorage.setItem('user', JSON.stringify(data));
            window.location.href = data.role === 'Teacher' ? 'teacher.html' : 'student.html';
        } catch (err) { showToast(err.message, true); }
    });

    document.getElementById('regForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const role = document.getElementById('r_role').value;
        let encoding = [];

        if (role === 'Student') {
            document.getElementById('regBtn').textContent = 'Scanning Face...';
            const frame = captureFrame('videoElement');
            const fd = new FormData();
            fd.append('image', dataURLtoBlob(frame));
            const pyRes = await fetch(`${PYTHON_API}/register`, { method: 'POST', body: fd });
            const pyData = await pyRes.json();
            if (!pyRes.ok) {
                showToast(pyData.error, true);
                document.getElementById('regBtn').textContent = 'Create Account';
                return;
            }
            encoding = pyData.encoding;
        }

        try {
            const res = await fetch(`${NODE_API}/register`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: e.target.r_user.value, password: e.target.r_pass.value,
                    name: e.target.r_name.value, role, faceEncoding: encoding
                })
            });
            if (!res.ok) {
                let errText = "Failed to register";
                try {
                    const errData = await res.json();
                    errText = errData.error || errText;
                } catch { errText = "API endpoint not found (Did you restart the server?)"; }
                throw new Error(errText);
            }
            showToast("Registered Successfully! Please log in.");
            switchTab('login');
        } catch (err) { showToast(err.message, true); }
        finally { document.getElementById('regBtn').textContent = 'Create Account'; }
    });
}

// --- TEACHER DASHBOARD ---
async function initTeacherDashboard() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'Teacher') { logout(); return; }

    if (document.getElementById('welcomeText')) document.getElementById('welcomeText').innerText = `Welcome back, ${user.name}!`;
    if (document.getElementById('profileName')) document.getElementById('profileName').innerText = user.name;
    if (document.getElementById('profileAvatar')) document.getElementById('profileAvatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=4318ff&color=fff&size=128`;

    loadClasses(user.id);
}

async function loadClasses(teacherId) {
    const res = await fetch(`${NODE_API}/classes/teacher/${teacherId}`);
    const classes = await res.json();
    const gradients = ['grad-1', 'grad-2', 'grad-3', 'grad-4'];

    /* 1. Inject Top Class Cards */
    let html = classes.map((c, idx) => `
        <div class="class-card ${gradients[idx % gradients.length]}">
            <h4>${c.name}</h4>
            <p style="flex:1">Enrollments: ${c.roster.length} Active Students</p>
            <div class="card-actions">
                <button onclick="promptStudentAdd('${c._id}')">+ Enroll</button>
                <button onclick="openRecords('${c._id}', '${c.name.replace(/'/g, "\\'")}')">Records</button>
                <button class="live" onclick="location.href='session.html?classId=${c._id}&name=${encodeURIComponent(c.name)}'">Start Live</button>
            </div>
        </div>
    `).join('');

    // Add Creation card block
    html += `<div class="class-card grad-last" onclick="document.getElementById('classModal').style.display='flex'">+ Create Classroom</div>`;
    document.getElementById('classesList').innerHTML = html;

    // Inject Dynamic Left Sidebar Navigation structure
    if (document.getElementById('sidebarNav')) {
        let navHtml = `<a href="teacher.html" class="nav-item active">Global Dashboard</a>`;
        navHtml += classes.map(c => `
            <div style="margin-top: 0.75rem">
                <div style="font-weight:600; font-size:0.85rem; color:#2d3436; padding: 0.25rem 1rem;">${c.name}</div>
                <div style="display:flex; flex-direction:column; padding-left: 1.5rem; gap: 0.1rem; border-left: 2px solid #eee; margin-left:1.5rem;">
                    <a href="#" class="nav-subitem" onclick="promptStudentAdd('${c._id}')">⮑ Enroll Student</a>
                    <a href="#" class="nav-subitem" onclick="openRecords('${c._id}', '${c.name.replace(/'/g, "\\'")}')">⮑ Class Records</a>
                    <a href="#" class="nav-subitem" onclick="location.href='session.html?classId=${c._id}&name=${encodeURIComponent(c.name)}'">⮑ Start Live</a>
                </div>
            </div>
        `).join('');
        document.getElementById('sidebarNav').innerHTML = navHtml;
    }

    /* 2. Global Recent Sessions Integration */
    let allSessions = [];
    for (let c of classes) {
        const sr = await fetch(`${NODE_API}/sessions/class/${c._id}`);
        const sdata = await sr.json();
        sdata.forEach(x => x.className = c.name); // Attach class name for table
        allSessions.push(...sdata);
    }
    allSessions.sort((a, b) => new Date(b.date) - new Date(a.date));

    const recentHtml = allSessions.slice(0, 4).map(s => {
        const classObj = classes.find(c => c._id === s.classId);
        const pIds = s.presentIds.map(p => p._id);
        const dynamicAbsents = classObj ? classObj.roster.filter(r => !pIds.includes(r._id)).length : s.absentIds.length;
        const total = s.presentIds.length + dynamicAbsents;
        const ratio = total ? Math.round((s.presentIds.length / total) * 100) : 0;
        const statusClass = ratio > 70 ? 'done' : 'pending';
        return `<tr>
         <td style="font-weight:600">${s.className}</td>
         <td>${new Date(s.date).toLocaleDateString()}</td>
         <td><span class="status ${statusClass}">${s.presentIds.length} Present</span></td>
         <td style="color:var(--danger)">${dynamicAbsents} Absent</td>
         <td style="color:#4318ff; cursor:pointer;" onclick="openRecords('${s.classId}', '${s.className.replace(/'/g, "\\'")}')">View Data</td>
       </tr>`
    }).join('');

    if (document.getElementById('recentSessionsList')) {
        document.getElementById('recentSessionsList').innerHTML = recentHtml || `<tr><td colspan="5" style="text-align:center; color:#a3aed1">No global metrics yet</td></tr>`;
    }
}

async function openRecords(classId, className) {
    document.getElementById('recordModalTitle').innerText = `${className} Records`;
    document.getElementById('recordsModal').style.display = 'block';
    // Clear old data while loading
    if (document.getElementById('recordsTableBody')) document.getElementById('recordsTableBody').innerHTML = '<tr><td colspan="3">Loading...</td></tr>';

    // Fetch logs
    const res = await fetch(`${NODE_API}/sessions/class/${classId}`);
    const sessions = await res.json();

    const user = JSON.parse(localStorage.getItem('user'));
    const classRes = await fetch(`${NODE_API}/classes/teacher/${user.id}`);
    const classes = await classRes.json();
    const currentClass = classes.find(c => c._id === classId);

    if (sessions.length === 0) {
        document.getElementById('recordsTableBody').innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted)">No sessions recorded yet.</td></tr>';
    } else {
        document.getElementById('recordsTableBody').innerHTML = sessions.map(s => {
            const pIds = s.presentIds.map(p => p._id);
            const absentList = currentClass.roster.filter(r => !pIds.includes(r._id));

            return `<tr>
                <td style="font-weight: 500">${new Date(s.date).toLocaleString()}</td>
                <td style="color: var(--success); font-size: 0.95rem; font-weight: bold; text-align: center;">${s.presentIds.length}</td>
                <td style="color: var(--danger); font-size: 0.85rem">${absentList.map(a => a.name).join('<br>') || 'None'}</td>
            </tr>`;
        }).join('');
    }

    document.getElementById('csvBtn').onclick = () => downloadCSV(classId, className, sessions);
}

async function downloadCSV(classId, className, sessionsCache) {
    const user = JSON.parse(localStorage.getItem('user'));
    const classRes = await fetch(`${NODE_API}/classes/teacher/${user.id}`);
    const classes = await classRes.json();
    const currentClass = classes.find(c => c._id === classId);

    if (!currentClass || currentClass.roster.length === 0) return showToast("No students in roster to export", true);
    if (sessionsCache.length === 0) return showToast("No sessions recorded to export", true);

    // Sort array oldest to newest (columns from left to right)
    const sessions = [...sessionsCache].reverse();

    // Matrix Logging Format (Wide Format)
    let csv = "Student Name,";
    // Column headers are the Session dates
    csv += sessions.map(s => `"${new Date(s.date).toLocaleString().replace(/,/g, '')}"`).join(",") + "\r\n";

    // Each row is exactly one student
    currentClass.roster.forEach(student => {
        let row = `"${student.name}",`;
        sessions.forEach(s => {
            const isPresent = s.presentIds.some(p => p._id === student._id);
            row += (isPresent ? "Present" : "Absent") + ",";
        });
        csv += row.slice(0, -1) + "\r\n";
    });

    // Download Trigger
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${className.replace(/\s/g, '_')}_Attendance_Report.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("CSV Downloaded Successfully!");
}

async function createClass() {
    const name = document.getElementById('newClassName').value;
    const user = JSON.parse(localStorage.getItem('user'));
    await fetch(`${NODE_API} /classes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, teacherId: user.id }) });
    document.getElementById('classModal').style.display = 'none';
    loadClasses(user.id);
}

async function promptStudentAdd(classId) {
    const uname = prompt("Enter the exact Username of the student to enroll:");
    if (!uname) return;
    try {
        const studentsRes = await fetch(`${NODE_API}/students`);
        const students = await studentsRes.json();
        const target = students.find(s => s.username === uname);
        if (!target) throw new Error("Student username not found in database.");

        await fetch(`${NODE_API}/classes/${classId}/enroll`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId: target._id })
        });
        showToast(`Enrolled @${uname} successfully!`);
        loadClasses(JSON.parse(localStorage.getItem('user')).id);
    } catch (e) { showToast(e.message, true); }
}


// --- LIVE SESSION LOGIC ---
let currentSessionId = null;
let currentClassId = null;
let scanInterval = null;
let activePresents = [];

async function startLiveSession() {
    if (!document.getElementById('headerClassName')) return;
    const params = new URLSearchParams(window.location.search);
    currentClassId = params.get('classId');
    document.getElementById('headerClassName').innerText = "Live Session: " + params.get('name');

    // 1. Tell Backend to Start Session
    const res = await fetch(`${NODE_API}/sessions/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ classId: currentClassId }) });
    const session = await res.json();
    currentSessionId = session._id;

    // 2. Load Roster for verification
    const classRes = await fetch(`${NODE_API}/classes/teacher/${JSON.parse(localStorage.getItem('user')).id}`);
    const classes = await classRes.json();
    const currentClass = classes.find(c => c._id === currentClassId);

    document.getElementById('count').innerText = currentClass.roster.length;
    renderRoster(currentClass.roster, []);

    // 3. Begin loop to hit the Python CV microservice
    const allowed_ids = currentClass.roster.map(r => r._id).join(',');
    scanInterval = setInterval(() => performScan(allowed_ids, currentClass.roster), 2000);
}

function renderRoster(roster, presentIds) {
    if (!document.getElementById('rosterList')) return;
    const html = roster.map(r => {
        const isPresent = presentIds.includes(r._id);
        return `<div style="padding: 0.75rem; border-radius: 6px; background: ${isPresent ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)'}; display:flex; justify-content:space-between; align-items:center; border-left: 4px solid ${isPresent ? 'var(--success)' : 'transparent'}">
           <span>${r.name} <i>(@${r.username})</i></span>
           <span style="font-weight: 500; font-size: 0.8rem; color: ${isPresent ? 'var(--success)' : 'var(--text-muted)'}">${isPresent ? 'DETECTED PRESENT ✓' : 'AWAITING SCAN'}</span>
        </div>`;
    }).join('');
    document.getElementById('rosterList').innerHTML = html;
}

async function performScan(allowed_ids, fullRoster) {
    if (!currentSessionId) return;
    try {
        const frame = captureFrame('videoElement');
        const fd = new FormData();
        fd.append('image', dataURLtoBlob(frame));
        fd.append('allowed_ids', allowed_ids);

        const pyRes = await fetch(`${PYTHON_API}/recognize`, { method: 'POST', body: fd });
        if (!pyRes.ok) return; // Silent fail if unrecognized or no face

        const data = await pyRes.json();
        const userId = data.userId;

        if (!activePresents.includes(userId)) {
            activePresents.push(userId);
            await fetch(`${NODE_API}/attendance/log`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: currentSessionId, userId }) });
            showToast(`Marked ${fullRoster.find(r => r._id === userId).name} Present!`);
            renderRoster(fullRoster, activePresents);
        }
    } catch (e) { }
}

async function endSession() {
    clearInterval(scanInterval);
    const res = await fetch(`${NODE_API}/sessions/${currentSessionId}/end`, { method: 'POST' });
    const report = await res.json();
    currentSessionId = null; // stop any latent scans from saving

    document.getElementById('reportPresent').innerHTML = report.presentIds.map(u => `✓ ${u.name}`).join('<br>') || 'None';
    document.getElementById('reportAbsent').innerHTML = report.absentIds.map(u => `✗ ${u.name}`).join('<br>') || 'None';

    document.getElementById('reportModal').style.display = 'block';
}
