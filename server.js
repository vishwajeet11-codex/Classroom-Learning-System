const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Multer Config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});

const upload = multer({ storage });

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded files

// MongoDB Connection
mongoose.connect('mongodb://127.0.0.1:27017/elearning').then(() => {
    console.log('Connected to MongoDB');
    seedData();
}).catch(err => {
    console.error('MongoDB connection error:', err);
});

// Models
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['teacher', 'student'], required: true }
});
const User = mongoose.model('User', userSchema);

const assignmentSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    subject: { type: String, default: 'General' },
    className: { type: String, default: '' },
    attachment: String, // Path to file
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    submissions: [{
        student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        content: String,
        attachment: String, // Path to file
        submittedAt: { type: Date, default: Date.now }
    }]
});
const Assignment = mongoose.model('Assignment', assignmentSchema);

function deleteStoredFile(filePath) {
    if (!filePath) return;

    const resolvedPath = path.resolve(__dirname, filePath);
    if (!resolvedPath.startsWith(uploadDir)) return;
    if (fs.existsSync(resolvedPath)) fs.unlinkSync(resolvedPath);
}

async function deleteAssignmentAndFiles(assignment) {
    if (!assignment) return;

    deleteStoredFile(assignment.attachment);
    assignment.submissions.forEach(submission => deleteStoredFile(submission.attachment));
    await Assignment.deleteOne({ _id: assignment._id });
}

// New Schemas
const testSchema = new mongoose.Schema({
    title: { type: String, required: true },
    timeLimit: { type: Number, default: 0 }, // in minutes
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    questions: [{
        text: String,
        options: [String],
        correctAnswer: Number // index of correct option
    }]
});
const Test = mongoose.model('Test', testSchema);

const testSubmissionSchema = new mongoose.Schema({
    test: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    score: Number,
    total: Number,
    submittedAt: { type: Date, default: Date.now }
});
const TestSubmission = mongoose.model('TestSubmission', testSubmissionSchema);

const scheduleSchema = new mongoose.Schema({
    day: String,
    timeSlot: String,
    subject: String
});
const Schedule = mongoose.model('Schedule', scheduleSchema);

const noteSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: String,
    attachment: String,
    subject: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});
const Note = mongoose.model('Note', noteSchema);

const reportSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    subject: String,
    marks: Number,
    attendance: Number,
    remarks: String,
    updatedAt: { type: Date, default: Date.now }
});
const Report = mongoose.model('Report', reportSchema);

const calendarEventSchema = new mongoose.Schema({
    date: Date,
    title: String,
    description: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});
const CalendarEvent = mongoose.model('CalendarEvent', calendarEventSchema);

const timetableConfigSchema = new mongoose.Schema({
    name: { type: String, unique: true, default: 'main' },
    slots: { type: [mongoose.Schema.Types.Mixed], default: [] },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedAt: { type: Date, default: Date.now }
});
const TimetableConfig = mongoose.model('TimetableConfig', timetableConfigSchema);

const chatMessageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: String,
    timestamp: { type: Date, default: Date.now }
});
const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

const defaultTimetableSlots = [
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

// Routes

// Register
app.post('/api/register', async (req, res) => {
    const { username, password, role } = req.body;
    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) return res.status(400).json({ success: false, message: 'Username already exists' });

        const newUser = new User({ username, password, role });
        await newUser.save();
        res.json({ success: true, message: 'Registration successful' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username, password });
        if (user) {
            res.json({ success: true, user: { id: user._id, username: user.username, role: user.role } });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Assignments
app.get('/api/assignments', async (req, res) => {
    const { userId, role } = req.query;
    try {
        let assignments;
        if (role === 'teacher') {
            assignments = await Assignment.find({ createdBy: userId }).populate('submissions.student', 'username');
        } else {
            assignments = await Assignment.find().populate('createdBy', 'username');
        }
        res.json(assignments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Assignment (Teacher only) - Supports File Upload
app.post('/api/assignments', upload.single('attachment'), async (req, res) => {
    const { title, description, subject, className, teacherId } = req.body;
    const attachment = req.file ? req.file.path : null;

    try {
        const newAssignment = new Assignment({
            title,
            description,
            subject,
            className,
            attachment,
            createdBy: teacherId
        });
        await newAssignment.save();
        res.json({ success: true, assignment: newAssignment });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Submit Assignment (Student only) - Supports File Upload
app.post('/api/assignments/:id/submit', upload.single('attachment'), async (req, res) => {
    const { id } = req.params;
    const { studentId, content } = req.body;
    const attachment = req.file ? req.file.path : null;

    try {
        const assignment = await Assignment.findById(id);
        if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

        assignment.submissions.push({ student: studentId, content, attachment });
        await assignment.save();
        res.json({ success: true, message: 'Assignment submitted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/assignments/:id', async (req, res) => {
    const { teacherId } = req.query;

    try {
        const assignment = await Assignment.findOne({ _id: req.params.id, createdBy: teacherId });
        if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });

        await deleteAssignmentAndFiles(assignment);
        res.json({ success: true, message: 'Assignment deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/assignments/delete-multiple', async (req, res) => {
    const { ids, teacherId } = req.body;

    try {
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, message: 'No assignment ids provided' });
        }

        const assignments = await Assignment.find({ _id: { $in: ids }, createdBy: teacherId });
        if (assignments.length === 0) {
            return res.status(404).json({ success: false, message: 'No matching assignments found' });
        }

        for (const assignment of assignments) {
            await deleteAssignmentAndFiles(assignment);
        }

        res.json({
            success: true,
            message: `${assignments.length} assignment${assignments.length > 1 ? 's' : ''} deleted successfully`,
            deletedIds: assignments.map(assignment => assignment._id)
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- NEW ROUTES ---

// Tests
app.get('/api/tests', async (req, res) => {
    try {
        const tests = await Test.find().populate('createdBy', 'username');
        res.json(tests);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/tests', async (req, res) => {
    try {
        const newTest = new Test(req.body);
        await newTest.save();
        res.json({ success: true, test: newTest });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/tests/:id', async (req, res) => {
    const { teacherId } = req.query;

    try {
        const test = await Test.findOne({ _id: req.params.id, createdBy: teacherId });
        if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

        await TestSubmission.deleteMany({ test: test._id });
        await Test.deleteOne({ _id: test._id });
        res.json({ success: true, message: 'Test deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/tests/:id/submit', async (req, res) => {
    const { id } = req.params;
    const { studentId, answers } = req.body;
    try {
        const test = await Test.findById(id);
        if (!test) return res.status(404).json({ message: 'Test not found' });

        let score = 0;
        test.questions.forEach((q, index) => {
            if (answers[index] == q.correctAnswer) score++;
        });

        const submission = new TestSubmission({
            test: id,
            student: studentId,
            score,
            total: test.questions.length
        });
        await submission.save();
        res.json({ success: true, score, total: test.questions.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/tests/:id/submissions', async (req, res) => {
    try {
        const submissions = await TestSubmission.find({ test: req.params.id }).populate('student', 'username');
        res.json(submissions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Schedule
app.get('/api/timetable', async (req, res) => {
    try {
        const timetable = await TimetableConfig.findOne({ name: 'main' });
        res.json({
            success: true,
            slots: timetable && Array.isArray(timetable.slots) && timetable.slots.length > 0 ? timetable.slots : defaultTimetableSlots
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/timetable', async (req, res) => {
    const { slots, teacherId } = req.body;

    try {
        if (!Array.isArray(slots) || slots.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid timetable data' });
        }

        const timetable = await TimetableConfig.findOneAndUpdate(
            { name: 'main' },
            { name: 'main', slots, updatedBy: teacherId || null, updatedAt: new Date() },
            { new: true, upsert: true }
        );

        res.json({ success: true, message: 'Timetable updated successfully', slots: timetable.slots });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/schedule', async (req, res) => {
    try {
        const schedule = await Schedule.find();
        res.json(schedule);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/schedule', async (req, res) => {
    try {
        const { day, timeSlot, subject } = req.body;
        let entry = await Schedule.findOne({ day, timeSlot });
        if (entry) {
            entry.subject = subject;
            await entry.save();
        } else {
            entry = new Schedule({ day, timeSlot, subject });
            await entry.save();
        }
        res.json({ success: true, entry });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Notes
app.get('/api/notes', async (req, res) => {
    try {
        const notes = await Note.find().populate('createdBy', 'username');
        res.json(notes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/notes', upload.single('attachment'), async (req, res) => {
    const { title, content, subject, teacherId } = req.body;
    const attachment = req.file ? req.file.path : null;
    try {
        const newNote = new Note({ title, content, subject, attachment, createdBy: teacherId });
        await newNote.save();
        res.json({ success: true, note: newNote });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/notes/:id', async (req, res) => {
    const { teacherId } = req.query;

    try {
        const note = await Note.findOne({ _id: req.params.id, createdBy: teacherId });
        if (!note) return res.status(404).json({ success: false, message: 'Note not found' });

        deleteStoredFile(note.attachment);
        await Note.deleteOne({ _id: note._id });
        res.json({ success: true, message: 'Note deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Reports
app.get('/api/reports', async (req, res) => {
    const { studentId } = req.query;
    try {
        let query = {};
        if (studentId) query.student = studentId;
        const reports = await Report.find(query).populate('student', 'username');
        res.json(reports);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/reports', async (req, res) => {
    const { studentId, subject, marks, attendance, remarks } = req.body;
    try {
        let report = await Report.findOne({ student: studentId, subject });
        if (report) {
            report.marks = marks;
            report.attendance = attendance;
            report.remarks = remarks;
            report.updatedAt = Date.now();
            await report.save();
        } else {
            report = new Report({ student: studentId, subject, marks, attendance, remarks });
            await report.save();
        }
        res.json({ success: true, report });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Users (for Reports and other lists)
app.get('/api/users/students', async (req, res) => {
    try {
        const students = await User.find({ role: 'student' }, 'username _id');
        res.json(students);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Calendar
app.get('/api/calendar', async (req, res) => {
    try {
        const events = await CalendarEvent.find();
        res.json(events);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/calendar', async (req, res) => {
    try {
        const newEvent = new CalendarEvent(req.body);
        await newEvent.save();
        res.json({ success: true, event: newEvent });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/calendar/:id', async (req, res) => {
    const { teacherId } = req.query;

    try {
        const event = await CalendarEvent.findOne({ _id: req.params.id, createdBy: teacherId });
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

        await CalendarEvent.deleteOne({ _id: event._id });
        res.json({ success: true, message: 'Calendar event deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Chat
app.get('/api/chat', async (req, res) => {
    try {
        const messages = await ChatMessage.find().populate('sender', 'username role').sort('timestamp');
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/chat', async (req, res) => {
    try {
        const newMsg = new ChatMessage({ sender: req.body.senderId, text: req.body.text });
        await newMsg.save();
        const populatedMsg = await ChatMessage.findById(newMsg._id).populate('sender', 'username role');
        res.json({ success: true, message: populatedMsg });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Helper to seed data
async function seedData() {
    const count = await User.countDocuments();
    if (count === 0) {
        console.log('Seeding initial users...');
        await User.create([
            { username: 'teacher1', password: 'password', role: 'teacher' },
            { username: 'student1', password: 'password', role: 'student' }
        ]);
        console.log('Users seeded');
    }
}

const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Stop the existing process or start with a different port, for example in PowerShell: $env:PORT=3001; node server.js`);
        process.exit(1);
    }

    console.error('Server startup error:', err);
    process.exit(1);
});
