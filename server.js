const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// MySQL Connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "Anish", // Add your MySQL password here
    database: "rollcall"
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Signup endpoint
app.post('/signup', async (req, res) => {
    const { name, email, register, password } = req.body;

    // Validate input
    if (!name || !email || !register || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        // Check if user already exists
        const checkQuery = 'SELECT register FROM users WHERE register = ? OR email = ?';
        db.query(checkQuery, [register, email], async (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ message: 'Server error' });
            }

            if (results.length > 0) {
                return res.status(400).json({ message: 'User already exists' });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert new user
            const insertQuery = 'INSERT INTO users (name, email, register, password) VALUES (?, ?, ?, ?)';
            db.query(insertQuery, [name, email, register, hashedPassword], (err) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ message: 'Error creating user' });
                }

                res.status(201).json({ message: 'User created successfully' });
            });
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Login endpoint
app.post('/login', async (req, res) => {
    const { register, password } = req.body;

    try {
        const query = 'SELECT * FROM users WHERE register = ?';
        db.query(query, [register], async (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ message: 'Server error' });
            }

            if (results.length === 0) {
                return res.status(401).json({ message: 'Invalid credentials for result' });
            }

            const user = results[0];
            const validPassword = await bcrypt.compare(password, user.password);

            if (!validPassword) {
                return res.status(401).json({ message: 'Invalid credentials for password' });
            }

            // Send user data without password
            const userData = {
                name: user.name,
                email: user.email,
                register: user.register
            };

            res.json(userData);
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get student attendance for all subjects
app.get('/getStudentAttendance', (req, res) => {
    const { register } = req.query;

    if (!register) {
        return res.status(400).json({ message: 'Register number is required' });
    }

    // List of all attendance tables
    const attendanceTables = [
        'attendance_22CS410',
        'attendance_22CS420',
        'attendance_22CS430',
        'attendance_22CS440',
        'attendance_22CS450',
        'attendance_22EG660',
        'attendance_22CS470',
        'attendance_22CS480',
        'attendance_22CS490'
    ];

    const attendanceData = {};

    // Function to get attendance for a specific subject
    const getAttendanceForSubject = (tableName) => {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT attendancedate, status 
                FROM ${tableName} 
                WHERE register = ? 
                ORDER BY attendancedate DESC
            `;
            
            db.query(query, [register], (err, results) => {
                if (err) {
                    reject(err);
                    return;
                }
                // Add subject code to each record
                results = results.map(record => ({
                    ...record,
                    subject: tableName.replace('attendance_', '')
                }));
                resolve(results);
            });
        });
    };

    // Get attendance for all subjects
    Promise.all(attendanceTables.map(table => 
        getAttendanceForSubject(table)
            .then(results => {
                if (results.length > 0) {
                    attendanceData[table.replace('attendance_', '')] = results;
                }
            })
            .catch(err => {
                console.error(`Error fetching attendance for ${table}:`, err);
            })
    ))
    .then(() => {
        res.json(attendanceData);
    })
    .catch(err => {
        console.error('Error fetching attendance data:', err);
        res.status(500).json({ message: 'Error fetching attendance data' });
    });
});

// Get available subjects
app.get('/getSubjects', (req, res) => {
    const query = 'SELECT * FROM sem4_courses ORDER BY course_code';
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching subjects:', err);
            return res.status(500).json({ message: 'Error fetching subjects' });
        }
        res.json(results);
    });
});

// Get students by subject
app.get('/getStudentsBySubject', (req, res) => {
    const { courseCode } = req.query;

    if (!courseCode) {
        return res.status(400).json({ message: 'Course code is required' });
    }

    // Query to get all students since they are all enrolled in all subjects
    const query = `
        SELECT register, name, email
        FROM users
        ORDER BY register
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching students:', err);
            return res.status(500).json({ message: 'Error fetching students' });
        }
        res.json(results);
    });
});

// Staff signup endpoint
app.post('/staff/signup', async (req, res) => {
    console.log('Received staff signup request:', req.body);

    const { name, email, staffId, department, password } = req.body;

    // Validate input
    if (!name || !email || !staffId || !department || !password) {
        console.log('Missing required fields:', { name, email, staffId, department, password: password ? 'exists' : 'missing' });
        return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate staff ID length
    if (staffId.length > 16) {
        console.log('Staff ID too long:', staffId.length);
        return res.status(400).json({ message: 'Staff ID must be 16 characters or less' });
    }

    try {
        // Check if staff already exists
        const checkQuery = 'SELECT staff_id FROM staffs WHERE staff_id = ? OR email = ?';
        console.log('Checking for existing staff:', { staffId, email });
        
        db.query(checkQuery, [staffId, email], async (err, results) => {
            if (err) {
                console.error('Database check error:', err);
                return res.status(500).json({ message: 'Server error during staff check' });
            }

            if (results.length > 0) {
                console.log('Staff already exists:', results[0]);
                return res.status(400).json({ message: 'Staff member already exists' });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);
            console.log('Password hashed successfully');

            // Insert new staff member
            const insertQuery = 'INSERT INTO staffs (name, email, staff_id, department, password) VALUES (?, ?, ?, ?, ?)';
            console.log('Attempting to insert staff:', { name, email, staffId, department });
            
            db.query(insertQuery, [name, email, staffId, department, hashedPassword], (err) => {
                if (err) {
                    console.error('Database insert error:', err);
                    return res.status(500).json({ 
                        message: 'Error creating staff account',
                        error: err.message 
                    });
                }

                console.log('Staff account created successfully');
                res.status(201).json({ message: 'Staff account created successfully' });
            });
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ 
            message: 'Server error',
            error: error.message 
        });
    }
});

// Staff login endpoint
app.post('/staff/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const query = 'SELECT * FROM staffs WHERE email = ?';
        db.query(query, [email], async (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ message: 'Server error' });
            }

            if (results.length === 0) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            const staff = results[0];
            const validPassword = await bcrypt.compare(password, staff.password);

            if (!validPassword) {
                return res.status(401).json({ message: 'Invalid email or password' });
            }

            // Don't send password in response
            const { password: _, ...staffData } = staff;
            res.json(staffData);
        });
    } catch (error) {
        console.error('Staff login error:', error);
        res.status(500).json({ message: 'An error occurred during login' });
    }
});

// Submit attendance endpoint
app.post('/submitAttendance', async (req, res) => {
    const { courseCode, date, attendance } = req.body;

    if (!courseCode || !date || !attendance || !Array.isArray(attendance)) {
        return res.status(400).json({ message: 'Invalid attendance data' });
    }

    const tableName = `attendance_${courseCode}`;

    try {
        // Check if attendance already exists for this date
        const checkQuery = `SELECT register FROM ${tableName} WHERE attendancedate = ?`;
        db.query(checkQuery, [date], (err, results) => {
            if (err) {
                console.error('Error checking existing attendance:', err);
                return res.status(500).json({ message: 'Server error' });
            }

            if (results.length > 0) {
                return res.status(400).json({ message: 'Attendance already marked for this date' });
            }

            // Insert attendance records
            const insertQuery = `INSERT INTO ${tableName} (register, attendancedate, status) VALUES ?`;
            const values = attendance.map(record => [record.register, date, record.status]);

            db.query(insertQuery, [values], (err) => {
                if (err) {
                    console.error('Error inserting attendance:', err);
                    return res.status(500).json({ message: 'Error saving attendance' });
                }

                res.json({ message: 'Attendance marked successfully' });
            });
        });
    } catch (error) {
        console.error('Attendance submission error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get attendance for a specific date
app.get('/getAttendance', (req, res) => {
    const { courseCode, date } = req.query;

    if (!courseCode || !date) {
        return res.status(400).json({ message: 'Course code and date are required' });
    }

    const tableName = `attendance_${courseCode}`;
    const query = `SELECT register, status FROM ${tableName} WHERE attendancedate = ?`;

    db.query(query, [date], (err, results) => {
        if (err) {
            console.error('Error fetching attendance:', err);
            return res.status(500).json({ message: 'Error fetching attendance' });
        }
        res.json(results);
    });
});

// Update attendance endpoint
app.post('/updateAttendance', async (req, res) => {
    const { courseCode, date, attendance } = req.body;

    if (!courseCode || !date || !attendance || !Array.isArray(attendance)) {
        return res.status(400).json({ message: 'Invalid attendance data' });
    }

    const tableName = `attendance_${courseCode}`;

    try {
        // Delete existing attendance for this date
        const deleteQuery = `DELETE FROM ${tableName} WHERE attendancedate = ?`;
        db.query(deleteQuery, [date], (err) => {
            if (err) {
                console.error('Error deleting existing attendance:', err);
                return res.status(500).json({ message: 'Error updating attendance' });
            }

            // Insert updated attendance records
            const insertQuery = `INSERT INTO ${tableName} (register, attendancedate, status) VALUES ?`;
            const values = attendance.map(record => [record.register, date, record.status]);

            db.query(insertQuery, [values], (err) => {
                if (err) {
                    console.error('Error inserting updated attendance:', err);
                    return res.status(500).json({ message: 'Error updating attendance' });
                }

                res.json({ message: 'Attendance updated successfully' });
            });
        });
    } catch (error) {
        console.error('Attendance update error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.listen(5000, () => console.log("Server running on port 5000"));
