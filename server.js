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
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            const user = results[0];
            const validPassword = await bcrypt.compare(password, user.password);

            if (!validPassword) {
                return res.status(401).json({ message: 'Invalid credentials' });
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

// Teacher login endpoint
app.post('/teacherLogin', (req, res) => {
    const { username, password } = req.body;
    
    // Direct authentication for teachers
    if (username === 'teacher' && password === 'teacher123') {
        res.json({
            success: true,
            role: 'teacher',
            name: 'Teacher'
        });
    } else {
        res.status(401).json({
            success: false,
            message: 'Invalid credentials'
        });
    }
});

// Get subjects endpoint
app.get('/getSubjects', (req, res) => {
    const query = 'SELECT course_code, course_name FROM sem4_courses';
    db.query(query, (error, results) => {
        if (error) {
            console.error('Error fetching subjects:', error);
            res.status(500).json({ error: 'Error fetching subjects' });
            return;
        }
        res.json(results);
    });
});

// Get students by subject endpoint
app.get('/getStudentsBySubject', (req, res) => {
    const { subject } = req.query;
    const query = `
        SELECT DISTINCT u.register, u.name 
        FROM users u 
        JOIN sem4_courses c ON u.register = c.register 
        WHERE c.course_code = ?
    `;
    db.query(query, [subject], (error, results) => {
        if (error) {
            console.error('Error fetching students:', error);
            res.status(500).json({ error: 'Error fetching students' });
            return;
        }
        res.json(results);
    });
});

// Get attendance by date endpoint
app.get('/getAttendanceByDate', (req, res) => {
    const { subject, date } = req.query;
    const query = `
        SELECT a.register, a.status 
        FROM attendance_22CS410 a 
        JOIN sem4_courses c ON a.register = c.register 
        WHERE c.course_code = ? AND a.attendancedate = ?
    `;
    db.query(query, [subject, date], (error, results) => {
        if (error) {
            console.error('Error fetching attendance:', error);
            res.status(500).json({ error: 'Error fetching attendance' });
            return;
        }
        res.json(results);
    });
});

// Save attendance endpoint
app.post('/saveAttendance', (req, res) => {
    const { subject, date, attendance } = req.body;
    
    // Start transaction
    db.beginTransaction(err => {
        if (err) {
            console.error('Error starting transaction:', err);
            res.status(500).json({ error: 'Error saving attendance' });
            return;
        }

        // Delete existing attendance for the date and subject
        const deleteQuery = `
            DELETE a FROM attendance_22CS410 a 
            JOIN sem4_courses c ON a.register = c.register 
            WHERE c.course_code = ? AND a.attendancedate = ?
        `;
        db.query(deleteQuery, [subject, date], (error) => {
            if (error) {
                db.rollback(() => {
                    console.error('Error deleting existing attendance:', error);
                    res.status(500).json({ error: 'Error saving attendance' });
                });
                return;
            }

            // Insert new attendance records
            if (attendance.length > 0) {
                const insertQuery = 'INSERT INTO attendance_22CS410 (register, attendancedate, status) VALUES ?';
                const values = attendance.map(a => [a.register, a.attendancedate, a.status]);
                
                db.query(insertQuery, [values], (error) => {
                    if (error) {
                        db.rollback(() => {
                            console.error('Error inserting attendance:', error);
                            res.status(500).json({ error: 'Error saving attendance' });
                        });
                        return;
                    }

                    // Commit transaction
                    db.commit(err => {
                        if (err) {
                            db.rollback(() => {
                                console.error('Error committing transaction:', err);
                                res.status(500).json({ error: 'Error saving attendance' });
                            });
                            return;
                        }
                        res.json({ success: true });
                    });
                });
            } else {
                // If no attendance records, just commit
                db.commit(err => {
                    if (err) {
                        db.rollback(() => {
                            console.error('Error committing transaction:', err);
                            res.status(500).json({ error: 'Error saving attendance' });
                        });
                        return;
                    }
                    res.json({ success: true });
                });
            }
        });
    });
});

app.listen(5000, () => console.log("Server running on port 5000"));
