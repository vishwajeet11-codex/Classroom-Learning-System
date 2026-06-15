const API_URL = 'http://localhost:3000/api';
const timetableDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
let teacherAssignmentsState = [];
let selectedAssignmentIds = new Set();
let assignmentDeleteInProgress = false;
let testDeleteInProgress = false;
let noteDeleteInProgress = false;
let calendarDeleteInProgress = false;
let timetableState = [];
const defaultTimetable = [
    {
        time: '11:30 am - 12:20 pm',
        monday: { subject: 'GO', teacher: 'Rutuja C.' },
        tuesday: { subject: 'ANDROID', teacher: 'Suvarna G.' },
        wednesday: { subject: 'SPM', teacher: 'Jayshree K.' },
        thursday: { subject: 'IOT', teacher: 'Rutuja C.' },
        friday: { subject: 'MIS', teacher: 'Suvarna G.' },
        saturday: { subject: 'GO', teacher: 'Jayshree K.' }
    },
    {
        time: '12:20 pm - 1:10 pm',
        monday: { subject: 'ANDROID', teacher: 'Suvarna G.' },
        tuesday: { subject: 'GO', teacher: 'Rutuja C.' },
        wednesday: { subject: 'MIS', teacher: 'Jayshree K.' },
        thursday: { subject: 'SPM', teacher: 'Suvarna G.' },
        friday: { subject: 'IOT', teacher: 'Rutuja C.' },
        saturday: { subject: 'ANDROID', teacher: 'Suvarna G.' }
    },
    {
        time: '1:10 pm - 2:00 pm',
        monday: { subject: 'IOT', teacher: 'Rutuja C.' },
        tuesday: { subject: 'MIS', teacher: 'Jayshree K.' },
        wednesday: { subject: 'GO', teacher: 'Rutuja C.' },
        thursday: { subject: 'ANDROID', teacher: 'Suvarna G.' },
        friday: { subject: 'SPM', teacher: 'Jayshree K.' },
        saturday: { subject: 'MIS', teacher: 'Suvarna G.' }
    },
    {
        time: '2:00 pm - 2:30 pm',
        isBreak: true,
        monday: { subject: '-', teacher: '' },
        tuesday: { subject: '-', teacher: '' },
        wednesday: { subject: '-', teacher: '' },
        thursday: { subject: '-', teacher: '' },
        friday: { subject: '-', teacher: '' },
        saturday: { subject: '-', teacher: '' }
    },
    {
        time: '2:30 pm - 5:30 pm',
        monday: { batch: 'Batch A', subject: 'ANDROID', teacher: 'Suvarna G.' },
        tuesday: { batch: 'Batch B', subject: 'GO', teacher: 'Rutuja C.' },
        wednesday: { batch: 'Batch C', subject: 'PROJECT', teacher: 'Jayshree K.' },
        thursday: { batch: 'Batch A', subject: 'IOT', teacher: 'Rutuja C.' },
        friday: { batch: 'Batch B', subject: 'PROJECT', teacher: 'Suvarna G.' },
        saturday: { batch: 'Batch C', subject: 'GO', teacher: 'Jayshree K.' }
    }
];

// Utilities
function getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

function logout() {
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

async function parseApiResponse(res) {
    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
        return res.json();
    }

    const text = await res.text();
    const compactText = text.trim();

    if (compactText.startsWith('<!DOCTYPE') || compactText.startsWith('<html')) {
        throw new Error('Server returned HTML instead of API JSON. Restart the Node server and try again.');
    }

    throw new Error(compactText || 'Unexpected server response');
}

// SPA Routing
function showSection(sectionId, linkElement) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
    // Show target section
    const target = document.getElementById(sectionId);
    if(target) target.classList.add('active');

    // Update active nav link
    if (linkElement) {
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        linkElement.classList.add('active');
    }

    // Load data based on section
    if(sectionId === 'testsSection') loadTests();
    else if(sectionId === 'scheduleSection') loadSchedule();
    else if(sectionId === 'manageAssignmentsSection') loadTeacherAssignments();
    else if(sectionId === 'notesSection') loadNotes();
    else if(sectionId === 'calendarSection') loadCalendar();
    else if(sectionId === 'reportsSection') {
        const user = getUser();
        if(user && user.role === 'teacher') loadStudentsForReports();
        else loadStudentReports();
    }
    else if(sectionId === 'chatSection') {
        loadChat();
        if(!window.chatInterval) window.chatInterval = setInterval(loadChat, 3000);
    } else {
        if(window.chatInterval) {
            clearInterval(window.chatInterval);
            window.chatInterval = null;
        }
    }
}

function toggleAuth(mode) {
    if (mode === 'register') {
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = 'block';
        document.getElementById('formTitle').innerText = 'Register';
    } else {
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('formTitle').innerText = 'Login';
    }
}

// Page Specific Logic

// Login & Register Page
if (document.getElementById('loginForm')) {
    // Login
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();

            if (data.success) {
                localStorage.setItem('user', JSON.stringify(data.user));
                window.location.href = data.user.role === 'teacher' ? 'teacher.html' : 'student.html';
            } else {
                alert(data.message);
            }
        } catch (err) {
            console.error(err);
            alert('Login failed. Ensure server is running.');
        }
    });

    // Register
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('regUsername').value;
        const password = document.getElementById('regPassword').value;
        const role = document.getElementById('regRole').value;

        try {
            const res = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, role })
            });
            const data = await res.json();
            if (data.success) {
                alert('Registration successful! Please login.');
                toggleAuth('login');
            } else {
                alert(data.message);
            }
        } catch (err) {
            console.error(err);
        }
    });
}

// Teacher Dashboard
if (document.getElementById('assignmentsList')) {
    const user = getUser();
    if (!user || user.role !== 'teacher') {
        window.location.href = 'index.html';
    } else {
        document.getElementById('userDisplay').textContent = user.username;
        loadTeacherAssignments();

        document.getElementById('createAssignmentForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData();
            formData.append('title', document.getElementById('assignmentTitle').value);
            formData.append('description', document.getElementById('assignmentDesc').value);
            formData.append('subject', document.getElementById('assignmentSubject').value);
            formData.append('className', document.getElementById('assignmentClassName').value);
            formData.append('teacherId', user.id);

            const fileInput = document.getElementById('assignmentFile');
            if (fileInput.files[0]) {
                formData.append('attachment', fileInput.files[0]);
            }

            try {
                const res = await fetch(`${API_URL}/assignments`, {
                    method: 'POST',
                    body: formData // No Content-Type header needed for FormData
                });
                const data = await res.json();
                if (data.success) {
                    closeModal('createAssignmentModal');
                    loadTeacherAssignments();
                    e.target.reset(); // Clear form
                    showAssignmentManagementStatus('Assignment created successfully.', 'success');
                }
            } catch (err) {
                console.error(err);
            }
        });

        const selectAllCheckbox = document.getElementById('selectAllAssignments');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    selectedAssignmentIds = new Set(teacherAssignmentsState.map(assignment => assignment._id));
                } else {
                    selectedAssignmentIds.clear();
                }
                renderManageAssignmentsTable();
            });
        }
    }
}

async function loadTeacherAssignments() {
    const user = getUser();
    const res = await fetch(`${API_URL}/assignments?role=teacher&userId=${user.id}`);
    const assignments = await res.json();
    teacherAssignmentsState = assignments;
    selectedAssignmentIds = new Set(
        Array.from(selectedAssignmentIds).filter(id =>
            teacherAssignmentsState.some(assignment => String(assignment._id) === String(id))
        )
    );

    renderTeacherAssignmentCards(assignments);
    renderManageAssignmentsTable();
}

function normalizeAttachmentPath(filePath) {
    return filePath ? String(filePath).replace(/\\/g, '/') : '';
}

function getAttachmentFileName(filePath) {
    const normalizedPath = normalizeAttachmentPath(filePath);
    return normalizedPath ? normalizedPath.split('/').pop() : '-';
}

function renderTeacherAssignmentCards(assignments) {
    const container = document.getElementById('assignmentsList');
    if (!container) return;

    container.innerHTML = assignments.map(a => `
        <div class="card">
            <h3>${a.title} <span style="font-size:0.8em; color:var(--accent-color); float:right">${a.subject}</span></h3>
            <p>${a.description}</p>
            ${a.attachment ? `<a href="/${normalizeAttachmentPath(a.attachment)}" target="_blank" style="color:#4db6ac; display:block; margin-bottom:10px;">View Attachment</a>` : ''}
            <div class="card-meta">
                Class: ${a.className || '-'}<br>
                Created: ${new Date(a.createdAt).toLocaleDateString()}<br>
                Submissions: ${a.submissions.length}
            </div>
            <button onclick="openSubmissionsModal('${a._id}')" style="margin-top: 10px; background-color: var(--secondary-color);">View Submissions</button>
        </div>
    `).join('');
}

function renderManageAssignmentsTable() {
    const tbody = document.getElementById('manageAssignmentsBody');
    if (!tbody) return;

    const selectAllCheckbox = document.getElementById('selectAllAssignments');
    const selectedCountLabel = document.getElementById('selectedAssignmentsCount');
    const deleteSelectedBtn = document.getElementById('deleteSelectedAssignmentsBtn');

    tbody.innerHTML = teacherAssignmentsState.length === 0
        ? `<tr><td colspan="7" class="empty-state">No assignments uploaded yet.</td></tr>`
        : teacherAssignmentsState.map(assignment => {
            const checked = selectedAssignmentIds.has(assignment._id) ? 'checked' : '';
            const fileName = getAttachmentFileName(assignment.attachment);
            const filePath = normalizeAttachmentPath(assignment.attachment);
            return `
                <tr>
                    <td class="checkbox-cell">
                        <input type="checkbox" class="assignment-row-checkbox" ${checked} onchange="toggleAssignmentSelection('${assignment._id}', this.checked)">
                    </td>
                    <td>${assignment.title}</td>
                    <td>${assignment.subject}</td>
                    <td>${assignment.className || '-'}</td>
                    <td>${new Date(assignment.createdAt).toLocaleDateString()}</td>
                    <td>
                        ${assignment.attachment
                            ? `<a class="table-link" href="/${filePath}" target="_blank">${fileName}</a>`
                            : '-'}
                    </td>
                    <td>
                        <button class="icon-button" onclick="deleteAssignment('${assignment._id}')" ${assignmentDeleteInProgress ? 'disabled' : ''}>🗑 Delete</button>
                    </td>
                </tr>
            `;
        }).join('');

    if (selectAllCheckbox) {
        selectAllCheckbox.checked = teacherAssignmentsState.length > 0 && selectedAssignmentIds.size === teacherAssignmentsState.length;
        selectAllCheckbox.indeterminate = selectedAssignmentIds.size > 0 && selectedAssignmentIds.size < teacherAssignmentsState.length;
    }

    if (selectedCountLabel) {
        selectedCountLabel.textContent = `${selectedAssignmentIds.size} selected`;
    }

    if (deleteSelectedBtn) {
        deleteSelectedBtn.disabled = assignmentDeleteInProgress || selectedAssignmentIds.size === 0;
        deleteSelectedBtn.textContent = assignmentDeleteInProgress ? 'Deleting...' : 'Delete Selected';
    }
}

function toggleAssignmentSelection(id, isChecked) {
    if (isChecked) selectedAssignmentIds.add(id);
    else selectedAssignmentIds.delete(id);
    renderManageAssignmentsTable();
}

async function deleteAssignment(id) {
    const user = getUser();
    if (!window.confirm('Are you sure you want to delete this assignment?')) return;

    setAssignmentDeleteState(true);
    try {
        const res = await fetch(`${API_URL}/assignments/${id}?teacherId=${user.id}`, {
            method: 'DELETE'
        });
        const data = await parseApiResponse(res);

        if (!res.ok || !data.success) {
            throw new Error(data.message || data.error || 'Failed to delete assignment');
        }

        teacherAssignmentsState = teacherAssignmentsState.filter(assignment => assignment._id !== id);
        selectedAssignmentIds.delete(id);
        renderTeacherAssignmentCards(teacherAssignmentsState);
        renderManageAssignmentsTable();
        showAssignmentManagementStatus('Assignment deleted successfully.', 'success');
    } catch (err) {
        console.error(err);
        showAssignmentManagementStatus(err.message || 'Failed to delete assignment.', 'error');
    } finally {
        setAssignmentDeleteState(false);
    }
}

async function deleteSelectedAssignments() {
    const user = getUser();
    const ids = Array.from(selectedAssignmentIds);
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} selected assignment${ids.length > 1 ? 's' : ''}?`)) return;

    setAssignmentDeleteState(true);
    try {
        const res = await fetch(`${API_URL}/assignments/delete-multiple`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids, teacherId: user.id })
        });
        const data = await parseApiResponse(res);

        if (!res.ok || !data.success) {
            throw new Error(data.message || data.error || 'Failed to delete selected assignments');
        }

        const deletedIds = new Set((data.deletedIds || []).map(String));
        teacherAssignmentsState = teacherAssignmentsState.filter(assignment => !deletedIds.has(String(assignment._id)));
        selectedAssignmentIds.clear();
        renderTeacherAssignmentCards(teacherAssignmentsState);
        renderManageAssignmentsTable();
        showAssignmentManagementStatus(data.message || 'Assignments deleted successfully.', 'success');
    } catch (err) {
        console.error(err);
        showAssignmentManagementStatus(err.message || 'Failed to delete selected assignments.', 'error');
    } finally {
        setAssignmentDeleteState(false);
    }
}

function setAssignmentDeleteState(isDeleting) {
    assignmentDeleteInProgress = isDeleting;
    renderManageAssignmentsTable();
}

function showAssignmentManagementStatus(message, type) {
    const status = document.getElementById('assignmentManagementStatus');
    if (!status) return;

    status.className = `status-banner fade-in ${type}`;
    status.textContent = message;
    status.style.display = 'block';

    clearTimeout(showAssignmentManagementStatus.timeoutId);
    showAssignmentManagementStatus.timeoutId = setTimeout(() => {
        status.style.display = 'none';
    }, 4000);
}

function openSubmissionsModal(assignmentId) {
    const user = getUser();
    // Re-fetch assignments to get latest data (or store globally, but fetching is safer for simple app)
    fetch(`${API_URL}/assignments?role=teacher&userId=${user.id}`)
        .then(res => res.json())
        .then(assignments => {
            const assignment = assignments.find(a => a._id === assignmentId);
            if (!assignment) return;

            const container = document.getElementById('submissionsListContainer');
            if (assignment.submissions.length === 0) {
                container.innerHTML = '<p>No submissions yet.</p>';
            } else {
                container.innerHTML = `
                    <table style="width:100%; border-collapse: collapse; margin-top: 15px;">
                        <thead>
                            <tr style="background: rgba(255,255,255,0.05); text-align: left;">
                                <th style="padding: 10px; border-bottom: 1px solid #444;">Student</th>
                                <th style="padding: 10px; border-bottom: 1px solid #444;">Date</th>
                                <th style="padding: 10px; border-bottom: 1px solid #444;">Content</th>
                                <th style="padding: 10px; border-bottom: 1px solid #444;">Attachment</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${assignment.submissions.map(sub => `
                                <tr>
                                    <td style="padding: 10px; border-bottom: 1px solid #333;">${sub.student ? sub.student.username : 'Unknown'}</td>
                                    <td style="padding: 10px; border-bottom: 1px solid #333;">${new Date(sub.submittedAt).toLocaleString()}</td>
                                    <td style="padding: 10px; border-bottom: 1px solid #333;">${sub.content}</td>
                                    <td style="padding: 10px; border-bottom: 1px solid #333;">
                                        ${sub.attachment ? `<a href="/${sub.attachment}" target="_blank" style="color: var(--accent-color);">Download</a>` : '-'}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            }
            openModal('viewSubmissionsModal');
        })
        .catch(err => console.error(err));
}

// --- TEACHER NEW FEATURES ---
let questionCount = 0;
function addQuestionBlock() {
    questionCount++;
    const container = document.getElementById('questionsContainer');
    const div = document.createElement('div');
    div.className = 'question-block';
    div.innerHTML = `
        <label>Question ${questionCount}</label>
        <input type="text" name="qText" required style="margin-bottom:10px;">
        <label>Options (Comma separated)</label>
        <input type="text" name="qOptions" placeholder="A, B, C, D" required style="margin-bottom:10px;">
        <label>Correct Option Index (0 for first, 1 for second...)</label>
        <input type="number" name="qCorrect" min="0" required>
    `;
    container.appendChild(div);
}

if (document.getElementById('createTestForm')) {
    document.getElementById('createTestForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = getUser();
        const title = document.getElementById('testTitle').value;
        const timeLimit = document.getElementById('testTimeLimit').value;
        
        const qBlocks = document.querySelectorAll('.question-block');
        const questions = Array.from(qBlocks).map(block => {
            return {
                text: block.querySelector('[name="qText"]').value,
                options: block.querySelector('[name="qOptions"]').value.split(',').map(s=>s.trim()),
                correctAnswer: parseInt(block.querySelector('[name="qCorrect"]').value)
            };
        });

        const res = await fetch(`${API_URL}/tests`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({title, timeLimit, createdBy: user.id, questions})
        });
        const data = await res.json();
        if(data.success) {
            closeModal('createTestModal');
            loadTests();
            e.target.reset();
            document.getElementById('questionsContainer').innerHTML = '';
            questionCount = 0;
            showSectionStatus('testsStatus', 'Test created successfully.', 'success');
        }
    });

    document.getElementById('editScheduleForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = getUser();
        const dayKey = document.getElementById('scheduleDayKey').value;
        const rowTime = document.getElementById('scheduleRowTime').value;
        const batch = document.getElementById('scheduleBatch').value.trim();
        const subject = document.getElementById('scheduleSubject').value.trim().toUpperCase();
        const teacher = document.getElementById('scheduleTeacher').value.trim();

        const updatedSlots = timetableState.map(slot => {
            if (slot.time !== rowTime) return slot;

            return {
                ...slot,
                [dayKey]: {
                    ...slot[dayKey],
                    batch,
                    subject,
                    teacher
                }
            };
        });

        const res = await fetch(`${API_URL}/timetable`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ slots: updatedSlots, teacherId: user.id })
        });
        const data = await res.json();
        if(data.success) {
            timetableState = data.slots;
            closeModal('editScheduleModal');
            renderTimetable('teacherTimetableBody');
            showSectionStatus('scheduleStatus', 'Timetable updated successfully.', 'success');
            e.target.reset();
        } else {
            showSectionStatus('scheduleStatus', data.message || 'Failed to update timetable.', 'error');
        }
    });

    document.getElementById('uploadNoteForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = getUser();
        const formData = new FormData();
        formData.append('title', document.getElementById('noteTitle').value);
        formData.append('subject', document.getElementById('noteSubject').value);
        formData.append('content', document.getElementById('noteContent').value);
        formData.append('teacherId', user.id);
        
        const file = document.getElementById('noteFile').files[0];
        if(file) formData.append('attachment', file);

        const res = await fetch(`${API_URL}/notes`, { method: 'POST', body: formData });
        const data = await res.json();
        if(data.success) {
            closeModal('uploadNoteModal');
            loadNotes();
            e.target.reset();
            showSectionStatus('notesStatus', 'Note uploaded successfully.', 'success');
        }
    });

    document.getElementById('addReportForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const studentId = document.getElementById('reportFormStudent').value;
        const subject = document.getElementById('reportSubject').value;
        const marks = document.getElementById('reportMarks').value;
        const attendance = document.getElementById('reportAttendance').value;
        const remarks = document.getElementById('reportRemarks').value;

        const res = await fetch(`${API_URL}/reports`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({studentId, subject, marks, attendance, remarks})
        });
        const data = await res.json();
        if(data.success) {
            closeModal('addReportModal');
            loadTeacherReports();
            e.target.reset();
        }
    });

    document.getElementById('addEventForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = getUser();
        const date = document.getElementById('eventDate').value;
        const title = document.getElementById('eventTitle').value;
        const description = document.getElementById('eventDescription').value;

        const res = await fetch(`${API_URL}/calendar`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({date, title, description, createdBy: user.id})
        });
        const data = await res.json();
        if(data.success) {
            closeModal('addEventModal');
            loadCalendar();
            e.target.reset();
            showSectionStatus('calendarStatus', 'Calendar event added successfully.', 'success');
        }
    });
}

async function loadStudentsForReports() {
    const res = await fetch(`${API_URL}/users/students`);
    const students = await res.json();
    const select1 = document.getElementById('reportStudentSelect');
    const select2 = document.getElementById('reportFormStudent');
    
    const options = students.map(s => `<option value="${s._id}">${s.username}</option>`).join('');
    if(select1.options.length <= 1) select1.innerHTML += options;
    if(select2.options.length == 0) select2.innerHTML = options;
    loadTeacherReports();
}

async function loadTeacherReports() {
    const studentId = document.getElementById('reportStudentSelect').value;
    if(!studentId) {
        document.getElementById('teacherReportsBody').innerHTML = '';
        return;
    }
    const res = await fetch(`${API_URL}/reports?studentId=${studentId}`);
    const reports = await res.json();
    const tbody = document.getElementById('teacherReportsBody');
    tbody.innerHTML = reports.map(r => `
        <tr>
            <td>${r.student.username}</td>
            <td>${r.subject}</td>
            <td>${r.marks}</td>
            <td>${r.attendance}%</td>
            <td>${r.remarks || '-'}</td>
        </tr>
    `).join('');
}

// Student Dashboard
if (document.getElementById('studentAssignmentsList')) {
    const user = getUser();
    if (!user || user.role !== 'student') {
        window.location.href = 'index.html';
    } else {
        document.getElementById('userDisplay').textContent = user.username;
        loadStudentAssignments();

        document.getElementById('submitAssignmentForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const assignmentId = document.getElementById('submitAssignmentId').value;
            const formData = new FormData();
            formData.append('studentId', user.id);
            formData.append('content', document.getElementById('submissionContent').value);

            const fileInput = document.getElementById('submissionFile');
            if (fileInput.files[0]) {
                formData.append('attachment', fileInput.files[0]);
            }

            try {
                const res = await fetch(`${API_URL}/assignments/${assignmentId}/submit`, {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                if (data.success) {
                    alert('Assignment Submitted!');
                    closeModal('submitAssignmentModal');
                }
            } catch (err) {
                console.error(err);
            }
        });
    }
}

async function loadStudentAssignments() {
    const user = getUser();
    const res = await fetch(`${API_URL}/assignments?role=student`);
    const assignments = await res.json();

    const container = document.getElementById('studentAssignmentsList');
    container.innerHTML = assignments.map(a => `
        <div class="card">
            <h3>${a.title} <span style="font-size:0.8em; color:var(--accent-color); float:right">${a.subject}</span></h3>
            <p>${a.description}</p>
            ${a.attachment ? `<a href="/${a.attachment}" target="_blank" style="color:#4db6ac; display:block; margin-bottom:10px;">View Attachment</a>` : ''}
            <div class="card-meta">
                Posted by: ${a.createdBy ? a.createdBy.username : 'Unknown'}
            </div>
            <button onclick="openSubmitModal('${a._id}')" style="margin-top: 10px;">Submit Work</button>
        </div>
    `).join('');
}

function openSubmitModal(id) {
    document.getElementById('submitAssignmentId').value = id;
    openModal('submitAssignmentModal');
}

// --- SHARED/STUDENT NEW FEATURES ---
let activeTest = null;
let testTimer = null;

async function loadTests() {
    const user = getUser();
    const res = await fetch(`${API_URL}/tests`);
    const tests = await res.json();
    
    const listId = user.role === 'teacher' ? 'teacherTestsList' : 'studentTestsList';
    const container = document.getElementById(listId);
    
    if(!container) return;

    container.innerHTML = tests.map(t => `
        <div class="card">
            <h3>${t.title}</h3>
            <p>Questions: ${t.questions.length}</p>
            <p>Time Limit: ${t.timeLimit ? t.timeLimit + ' mins' : 'None'}</p>
            <div class="card-meta">By: ${t.createdBy.username}</div>
            ${user.role === 'student' ? `<button onclick="startTest('${t._id}')" style="margin-top:10px;">Attempt Test</button>` : 
            `<div class="card-actions">
                <button onclick="viewTestSubmissions('${t._id}')" style="background:var(--secondary-color);">View Results</button>
                ${String(t.createdBy._id || '') === String(user.id) ? `<button class="icon-button" onclick="deleteTest('${t._id}')" ${testDeleteInProgress ? 'disabled' : ''}>🗑 Delete</button>` : ''}
            </div>`}
        </div>
    `).join('');
}

async function deleteTest(id) {
    const user = getUser();
    if (!window.confirm('Are you sure you want to delete this test?')) return;

    testDeleteInProgress = true;
    loadTests();
    try {
        const res = await fetch(`${API_URL}/tests/${id}?teacherId=${user.id}`, { method: 'DELETE' });
        const data = await parseApiResponse(res);
        if (!res.ok || !data.success) throw new Error(data.message || data.error || 'Failed to delete test');

        showSectionStatus('testsStatus', data.message || 'Test deleted successfully.', 'success');
        loadTests();
    } catch (err) {
        console.error(err);
        showSectionStatus('testsStatus', err.message || 'Failed to delete test.', 'error');
    } finally {
        testDeleteInProgress = false;
        loadTests();
    }
}

async function viewTestSubmissions(testId) {
    const res = await fetch(`${API_URL}/tests/${testId}/submissions`);
    const submissions = await res.json();
    
    const container = document.getElementById('submissionsListContainer');
    document.getElementById('submissionsModalTitle').innerText = 'Test Results';
    
    if (submissions.length === 0) {
        container.innerHTML = '<p>No attempts yet.</p>';
    } else {
        container.innerHTML = `
            <table class="data-table" style="margin-top: 15px;">
                <thead>
                    <tr>
                        <th>Student</th>
                        <th>Date</th>
                        <th>Score</th>
                        <th>Percentage</th>
                    </tr>
                </thead>
                <tbody>
                    ${submissions.map(sub => `
                        <tr>
                            <td>${sub.student ? sub.student.username : 'Unknown'}</td>
                            <td>${new Date(sub.submittedAt).toLocaleString()}</td>
                            <td>${sub.score} / ${sub.total}</td>
                            <td>${Math.round((sub.score / sub.total) * 100)}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
    openModal('viewSubmissionsModal');
}

async function startTest(id) {
    const res = await fetch(`${API_URL}/tests`);
    const tests = await res.json();
    activeTest = tests.find(t => t._id === id);
    if(!activeTest) return;

    document.getElementById('attemptTestTitle').innerText = activeTest.title;
    document.getElementById('attemptTestId').value = activeTest._id;
    
    const container = document.getElementById('testQuestionsContainer');
    container.innerHTML = activeTest.questions.map((q, i) => `
        <div class="question-block" style="text-align:left;">
            <p><strong>Q${i+1}: ${q.text}</strong></p>
            ${q.options.map((opt, optIndex) => `
                <label style="display:block; margin-top:5px;">
                    <input type="radio" name="q_${i}" value="${optIndex}" style="width:auto; margin-right:10px;" required>
                    ${opt}
                </label>
            `).join('')}
        </div>
    `).join('');

    if(activeTest.timeLimit > 0) {
        let timeRemaining = activeTest.timeLimit * 60;
        document.getElementById('testTimerDisplay').innerText = `Time Remaining: ${Math.floor(timeRemaining/60)}:${(timeRemaining%60).toString().padStart(2,'0')}`;
        testTimer = setInterval(() => {
            timeRemaining--;
            document.getElementById('testTimerDisplay').innerText = `Time Remaining: ${Math.floor(timeRemaining/60)}:${(timeRemaining%60).toString().padStart(2,'0')}`;
            if(timeRemaining <= 0) {
                clearInterval(testTimer);
                alert("Time's up! Auto-submitting...");
                document.getElementById('attemptTestForm').dispatchEvent(new Event('submit'));
            }
        }, 1000);
    } else {
        document.getElementById('testTimerDisplay').innerText = '';
    }

    openModal('attemptTestModal');
}

if(document.getElementById('attemptTestForm')) {
    document.getElementById('attemptTestForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        clearInterval(testTimer);
        const user = getUser();
        const testId = document.getElementById('attemptTestId').value;
        const answers = [];
        activeTest.questions.forEach((q, i) => {
            const selected = document.querySelector(`input[name="q_${i}"]:checked`);
            answers.push(selected ? parseInt(selected.value) : -1);
        });

        const res = await fetch(`${API_URL}/tests/${testId}/submit`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({studentId: user.id, answers})
        });
        const data = await res.json();
        if(data.success) {
            alert(`Test Submitted! Your Score: ${data.score}/${data.total}`);
            closeModal('attemptTestModal');
        }
    });
}

async function loadSchedule() {
    const user = getUser();
    await loadTimetableData();

    if (user.role === 'student') {
        renderTimetable('studentTimetableBody');
        return;
    }

    if (user.role === 'teacher') {
        renderTimetable('teacherTimetableBody');
        return;
    }

    const res = await fetch(`${API_URL}/schedule`);
    const schedule = await res.json();
    
    const tbodyId = user.role === 'teacher' ? 'teacherScheduleBody' : 'studentScheduleBody';
    const tbody = document.getElementById(tbodyId);
    if(!tbody) return;

    tbody.innerHTML = schedule.map(s => `
        <tr>
            <td>${s.day}</td>
            <td>${s.timeSlot}</td>
            <td>${s.subject}</td>
        </tr>
    `).join('');
}

function renderTimetable(targetId) {
    const tbody = document.getElementById(targetId);
    if (!tbody) return;
    const user = getUser();
    const canEdit = user && user.role === 'teacher' && targetId === 'teacherTimetableBody';

    tbody.innerHTML = timetableState.map(slot => {
        const rowClass = slot.isBreak ? 'timetable-break' : '';
        const cells = timetableDays.map(day => renderTimetableCell(slot[day], slot, day, slot.isBreak, canEdit)).join('');
        return `
            <tr class="${rowClass}">
                <td class="timetable-time">${slot.time}</td>
                ${cells}
            </tr>
        `;
    }).join('');
}

function renderTimetableCell(entry, slot, dayKey, isBreak = false, canEdit = false) {
    const subjectClass = getTimetableSubjectClass(entry.subject, isBreak);
    const batchLine = entry.batch ? `<span class="timetable-batch">${entry.batch}</span>` : '';
    const teacherLine = entry.teacher ? `<span class="timetable-teacher">${entry.teacher}</span>` : '';
    const editButton = canEdit && !isBreak
        ? `<button type="button" class="timetable-edit-button" onclick="openTimetableEditModal('${dayKey}', '${escapeJsString(slot.time)}')">Edit</button>`
        : '';

    return `
        <td class="timetable-cell ${subjectClass}">
            ${batchLine}
            <span class="timetable-subject">${entry.subject}</span>
            ${teacherLine}
            ${editButton}
        </td>
    `;
}

function getTimetableSubjectClass(subject, isBreak) {
    if (isBreak) return 'subject-break';
    return `subject-${String(subject).toLowerCase()}`;
}

async function loadTimetableData() {
    try {
        const res = await fetch(`${API_URL}/timetable`);
        const data = await res.json();
        timetableState = res.ok && data.success && Array.isArray(data.slots) ? data.slots : JSON.parse(JSON.stringify(defaultTimetable));
    } catch (err) {
        console.error(err);
        timetableState = JSON.parse(JSON.stringify(defaultTimetable));
    }
}

function openFirstEditableTimetableCell() {
    const firstSlot = timetableState.find(slot => !slot.isBreak);
    if (!firstSlot) return;
    openTimetableEditModal('monday', firstSlot.time);
}

function openTimetableEditModal(dayKey, time) {
    const slot = timetableState.find(item => item.time === time);
    if (!slot || slot.isBreak || !slot[dayKey]) return;

    const dayLabel = dayKey.charAt(0).toUpperCase() + dayKey.slice(1);
    const entry = slot[dayKey];
    document.getElementById('scheduleDayLabel').value = dayLabel;
    document.getElementById('scheduleTimeLabel').value = time;
    document.getElementById('scheduleBatch').value = entry.batch || '';
    document.getElementById('scheduleSubject').value = entry.subject || '';
    document.getElementById('scheduleTeacher').value = entry.teacher || '';
    document.getElementById('scheduleDayKey').value = dayKey;
    document.getElementById('scheduleRowTime').value = time;
    openModal('editScheduleModal');
}

function escapeJsString(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function loadNotes() {
    const user = getUser();
    const res = await fetch(`${API_URL}/notes`);
    const notes = await res.json();
    
    const listId = user.role === 'teacher' ? 'teacherNotesList' : 'studentNotesList';
    const container = document.getElementById(listId);
    if(!container) return;

    container.innerHTML = notes.map(n => `
        <div class="card">
            <h3>${n.title} <span style="font-size:0.8em; float:right;">${n.subject}</span></h3>
            <p>${n.content || ''}</p>
            ${n.attachment ? `<a href="/${normalizeAttachmentPath(n.attachment)}" target="_blank" style="color:var(--accent-color);">Download Attachment</a>` : ''}
            <div class="card-meta">By: ${n.createdBy.username}</div>
            ${user.role === 'teacher' ? `<div class="card-actions">
                ${String(n.createdBy._id || '') === String(user.id) ? `<button class="icon-button" onclick="deleteNote('${n._id}')" ${noteDeleteInProgress ? 'disabled' : ''}>🗑 Delete</button>` : ''}
            </div>` : ''}
        </div>
    `).join('');
}

async function deleteNote(id) {
    const user = getUser();
    if (!window.confirm('Are you sure you want to delete this note?')) return;

    noteDeleteInProgress = true;
    loadNotes();
    try {
        const res = await fetch(`${API_URL}/notes/${id}?teacherId=${user.id}`, { method: 'DELETE' });
        const data = await parseApiResponse(res);
        if (!res.ok || !data.success) throw new Error(data.message || data.error || 'Failed to delete note');

        showSectionStatus('notesStatus', data.message || 'Note deleted successfully.', 'success');
        loadNotes();
    } catch (err) {
        console.error(err);
        showSectionStatus('notesStatus', err.message || 'Failed to delete note.', 'error');
    } finally {
        noteDeleteInProgress = false;
        loadNotes();
    }
}

async function loadStudentReports() {
    const user = getUser();
    const res = await fetch(`${API_URL}/reports?studentId=${user.id}`);
    const reports = await res.json();
    
    const tbody = document.getElementById('studentReportsBody');
    if(!tbody) return;

    tbody.innerHTML = reports.map(r => `
        <tr>
            <td>${r.subject}</td>
            <td>${r.marks}</td>
            <td>${r.attendance}%</td>
            <td>${r.remarks || '-'}</td>
        </tr>
    `).join('');
}

async function loadCalendar() {
    const user = getUser();
    const res = await fetch(`${API_URL}/calendar`);
    const events = await res.json();
    
    const gridId = user.role === 'teacher' ? 'teacherCalendarGrid' : 'studentCalendarGrid';
    const grid = document.getElementById(gridId);
    if(!grid) return;

    // Very basic UI for events
    grid.innerHTML = events.map(e => `
        <div class="calendar-day">
            <h4>${new Date(e.date).toLocaleDateString()}</h4>
            <strong>${e.title}</strong>
            <p style="font-size:0.8em; margin-top:5px;">${e.description || ''}</p>
            ${user.role === 'teacher' && String(e.createdBy || '') === String(user.id) ? `<div class="card-actions" style="margin-top: 12px;">
                <button class="icon-button" onclick="deleteCalendarEvent('${e._id}')" ${calendarDeleteInProgress ? 'disabled' : ''}>🗑 Delete</button>
            </div>` : ''}
        </div>
    `).join('');
}

async function deleteCalendarEvent(id) {
    const user = getUser();
    if (!window.confirm('Are you sure you want to delete this calendar event?')) return;

    calendarDeleteInProgress = true;
    loadCalendar();
    try {
        const res = await fetch(`${API_URL}/calendar/${id}?teacherId=${user.id}`, { method: 'DELETE' });
        const data = await parseApiResponse(res);
        if (!res.ok || !data.success) throw new Error(data.message || data.error || 'Failed to delete calendar event');

        showSectionStatus('calendarStatus', data.message || 'Calendar event deleted successfully.', 'success');
        loadCalendar();
    } catch (err) {
        console.error(err);
        showSectionStatus('calendarStatus', err.message || 'Failed to delete calendar event.', 'error');
    } finally {
        calendarDeleteInProgress = false;
        loadCalendar();
    }
}

function showSectionStatus(elementId, message, type) {
    const status = document.getElementById(elementId);
    if (!status) return;

    status.className = `status-banner fade-in ${type}`;
    status.textContent = message;
    status.style.display = 'block';

    if (status._hideTimeoutId) {
        clearTimeout(status._hideTimeoutId);
    }

    status._hideTimeoutId = setTimeout(() => {
        status.style.display = 'none';
    }, 4000);
}

// Chat functionality
if(document.getElementById('chatForm')) {
    document.getElementById('chatForm').addEventListener('submit', async(e) => {
        e.preventDefault();
        const user = getUser();
        const input = document.getElementById('chatInput');
        
        await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({senderId: user.id, text: input.value})
        });
        
        input.value = '';
        loadChat();
    });
}

async function loadChat() {
    const res = await fetch(`${API_URL}/chat`);
    const messages = await res.json();
    
    const container = document.getElementById('chatMessages');
    const user = getUser();
    if(!container || !user) return;

    const isScrolledToBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 1;

    container.innerHTML = messages.map(m => {
        const isOwn = m.sender._id === user.id;
        const roleTag = m.sender.role === 'teacher' ? '<span style="color: gold;">[Teacher]</span> ' : '';
        return `
            <div class="chat-message ${isOwn ? 'own' : ''}">
                <span class="sender">${roleTag}${m.sender.username} - ${new Date(m.timestamp).toLocaleTimeString()}</span>
                <div class="text">${m.text}</div>
            </div>
        `;
    }).join('');

    if(isScrolledToBottom) {
        container.scrollTop = container.scrollHeight;
    }
}
