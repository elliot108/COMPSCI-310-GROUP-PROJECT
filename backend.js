// DKU Event Management System - Backend API
// MySQL Database Connection and Stored Procedure Calls

const mysql = require('mysql2/promise');
const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection configuration
const dbConfig = {

    host: 'localhost',
    port: 3306,
    user: 'root', // Update with your MySQL username
    password: 'Yrycs584!', // Update with your MySQL password
    database: 'dku_event_system'
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
}

// API Routes

// Get all events with full details
app.get('/api/events', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        
        const query = `
            SELECT 
                e.event_id,
                e.title,
                e.description,
                e.perks,
                e.max_participants,
                e.application_required,
                e.event_type,
                e.cost,
                t.start_date,
                t.end_date,
                t.start_time,
                t.end_time,
                GROUP_CONCAT(DISTINCT l.building) as buildings,
                GROUP_CONCAT(DISTINCT l.label) as location_labels,
                GROUP_CONCAT(DISTINCT c.category_name) as categories,
                GROUP_CONCAT(DISTINCT organizer_id) as organizer_ids
            FROM events e
            JOIN timeslots t ON e.timeslot_id = t.timeslot_id
            LEFT JOIN event_location el ON e.event_id = el.event_id
            LEFT JOIN locations l ON el.location_id = l.location_id
            LEFT JOIN event_categories ec ON e.event_id = ec.event_id
            LEFT JOIN categories c ON ec.category_id = c.category_id
            LEFT JOIN event_organizer eo ON e.event_id = eo.event_id
            GROUP BY e.event_id
            ORDER BY t.start_date DESC, t.start_time DESC
        `;
        
        const [rows] = await connection.execute(query);
        connection.release();
        
        // Transform the data to match frontend expectations
        const events = rows.map(row => ({
            event_id: row.event_id,
            title: row.title,
            description: row.description,
            start_date: row.start_date,
            end_date: row.end_date,
            start_time: row.start_time,
            end_time: row.end_time,
            location: {
                building: row.buildings ? row.buildings.split(',')[0] : 'TBD',
                label: row.location_labels ? row.location_labels.split(',')[0] : 'Location TBD',
                capacity: row.max_participants
            },
            organizer: {
                name: 'Various Organizers', // You can expand this to get actual organizer names
                type: 'school',
                contact: 'events@dku.edu'
            },
            categories: row.categories ? row.categories.split(',') : [],
            event_type: row.event_type,
            cost: row.cost,
            max_participants: row.max_participants,
            application_required: row.application_required === 1,
            perks: row.perks,
            popularity: Math.floor(Math.random() * 200) + 10 // Mock popularity for now
        }));
        
        res.json(events);
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

// Filter events using stored procedure
app.post('/api/events/filter', async (req, res) => {
    try {
        const {
            start_date,
            end_date,
            event_type,
            categories,
            organizers,
            locations
        } = req.body;

        const connection = await pool.getConnection();
        
        // Prepare parameters for stored procedure
        const params = [
            start_date || null,
            end_date || null,
            event_type || null,
            categories && categories.length > 0 ? JSON.stringify(categories) : null,
            organizers && organizers.length > 0 ? JSON.stringify(organizers) : null,
            locations && locations.length > 0 ? JSON.stringify(locations) : null
        ];

        console.log('Calling filter_events with params:', params);

        const [rows] = await connection.execute(
            'CALL filter_events(?, ?, ?, ?, ?, ?)',
            params
        );
        
        connection.release();
        
        // The stored procedure returns the filtered event IDs
        const eventIds = rows[0].map(row => row.event_id);
        
        // If no events found, return empty array
        if (eventIds.length === 0) {
            return res.json([]);
        }
        
        // Get full event details for the filtered IDs
        const eventDetailsQuery = `
            SELECT 
                e.event_id,
                e.title,
                e.description,
                e.perks,
                e.max_participants,
                e.application_required,
                e.event_type,
                e.cost,
                t.start_date,
                t.end_date,
                t.start_time,
                t.end_time,
                GROUP_CONCAT(DISTINCT l.building) as buildings,
                GROUP_CONCAT(DISTINCT l.label) as location_labels,
                GROUP_CONCAT(DISTINCT c.category_name) as categories,
                GROUP_CONCAT(DISTINCT organizer_id) as organizer_ids
            FROM events e
            JOIN timeslots t ON e.timeslot_id = t.timeslot_id
            LEFT JOIN event_location el ON e.event_id = el.event_id
            LEFT JOIN locations l ON el.location_id = l.location_id
            LEFT JOIN event_categories ec ON e.event_id = ec.event_id
            LEFT JOIN categories c ON ec.category_id = c.category_id
            LEFT JOIN event_organizer eo ON e.event_id = eo.event_id
            WHERE e.event_id IN (${eventIds.join(',')})
            GROUP BY e.event_id
            ORDER BY t.start_date DESC, t.start_time DESC
        `;
        
        const [eventDetails] = await pool.execute(eventDetailsQuery);
        
        // Transform the data
        const events = eventDetails.map(row => ({
            event_id: row.event_id,
            title: row.title,
            description: row.description,
            start_date: row.start_date,
            end_date: row.end_date,
            start_time: row.start_time,
            end_time: row.end_time,
            location: {
                building: row.buildings ? row.buildings.split(',')[0] : 'TBD',
                label: row.location_labels ? row.location_labels.split(',')[0] : 'Location TBD',
                capacity: row.max_participants
            },
            organizer: {
                name: 'Various Organizers',
                type: 'school',
                contact: 'events@dku.edu'
            },
            categories: row.categories ? row.categories.split(',') : [],
            event_type: row.event_type,
            cost: row.cost,
            max_participants: row.max_participants,
            application_required: row.application_required === 1,
            perks: row.perks,
            popularity: Math.floor(Math.random() * 200) + 10
        }));
        
        res.json(events);
        
    } catch (error) {
        console.error('Error filtering events:', error);
        res.status(500).json({ error: 'Failed to filter events' });
    }
});

// Get event by ID
app.get('/api/events/:id', async (req, res) => {
    try {
        const eventId = req.params.id;
        const connection = await pool.getConnection();
        
        const query = `
            SELECT 
                e.*,
                t.start_date,
                t.end_date,
                t.start_time,
                t.end_time,
                GROUP_CONCAT(DISTINCT l.building) as buildings,
                GROUP_CONCAT(DISTINCT l.label) as location_labels,
                GROUP_CONCAT(DISTINCT l.capacity) as capacities,
                GROUP_CONCAT(DISTINCT c.category_name) as categories,
                GROUP_CONCAT(DISTINCT organizer_id) as organizer_ids
            FROM events e
            JOIN timeslots t ON e.timeslot_id = t.timeslot_id
            LEFT JOIN event_location el ON e.event_id = el.event_id
            LEFT JOIN locations l ON el.location_id = l.location_id
            LEFT JOIN event_categories ec ON e.event_id = ec.event_id
            LEFT JOIN categories c ON ec.category_id = c.category_id
            LEFT JOIN event_organizer eo ON e.event_id = eo.event_id
            WHERE e.event_id = ?
            GROUP BY e.event_id
        `;
        
        const [rows] = await connection.execute(query, [eventId]);
        connection.release();
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        
        const row = rows[0];
        const event = {
            event_id: row.event_id,
            title: row.title,
            description: row.description,
            start_date: row.start_date,
            end_date: row.end_date,
            start_time: row.start_time,
            end_time: row.end_time,
            location: {
                building: row.buildings ? row.buildings.split(',')[0] : 'TBD',
                label: row.location_labels ? row.location_labels.split(',')[0] : 'Location TBD',
                capacity: row.max_participants
            },
            organizer: {
                name: 'Various Organizers',
                type: 'school',
                contact: 'events@dku.edu'
            },
            categories: row.categories ? row.categories.split(',') : [],
            event_type: row.event_type,
            cost: row.cost,
            max_participants: row.max_participants,
            application_required: row.application_required === 1,
            perks: row.perks,
            flyer_url: row.flyer_url,
            online_link: row.online_link,
            application_deadline: row.application_deadline,
            popularity: Math.floor(Math.random() * 200) + 10
        };
        
        res.json(event);
    } catch (error) {
        console.error('Error fetching event:', error);
        res.status(500).json({ error: 'Failed to fetch event' });
    }
});

// Get all categories WITH IDs
app.get('/api/categories', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.execute(
            'SELECT category_id, category_name FROM categories ORDER BY category_name'
        );
        connection.release();
        
        res.json(rows); // This now returns [{category_id: 1, category_name: 'Academic'}, ...]
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Get all locations
app.get('/api/locations', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.execute('SELECT building, label, capacity FROM locations ORDER BY building');
        connection.release();
        
        res.json(rows);
    } catch (error) {
        console.error('Error fetching locations:', error);
        res.status(500).json({ error: 'Failed to fetch locations' });
    }
});

// Get all organizers
app.get('/api/organizers', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.execute('SELECT organizer_id, organizer_type FROM organizers ORDER BY organizer_id');
        connection.release();
        
        res.json(rows);
    } catch (error) {
        console.error('Error fetching organizers:', error);
        res.status(500).json({ error: 'Failed to fetch organizers' });
    }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
    const isConnected = await testConnection();
    res.json({ 
        status: isConnected ? 'healthy' : 'unhealthy',
        database: isConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// Start server
const PORT = process.env.PORT || 3000;

async function startServer() {
    const isConnected = await testConnection();
    
    if (!isConnected) {
        console.error('Cannot start server: Database connection failed');
        process.exit(1);
    }
    
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
    });
}

startServer().catch(console.error);

module.exports = app;

/////////
// Create Event API
app.post('/api/events', async (req, res) => {
    console.log('📥 Received create event request:', req.body);
    
    try {
        // Extract ALL parameters that the procedure expects
        const {
            title, description, perks, max_participants, application_required,
            application_link, application_deadline, flyer_url, event_type, online_link,
            building, label, start_date, end_date, start_time, end_time, cost,
            organizer_id, collaborating_organizers, category_ids
        } = req.body;

        const finalMaxParticipants = max_participants === '' ? null : parseInt(max_participants);
        const finalCost = cost === '' ? 0 : parseInt(cost);  // Default to 0 if empty

        // IMPORTANT: Prepare ALL 19 parameters in EXACT order the procedure expects
        // Based on your procedure definition: uploadEvent(
        //   newTitle, newDescription, newPerks, newMax_participants, newApplication_required,
        //   newApplication_link, newApplication_deadline, newFlyer, newEvent_type, newOnline_link,
        //   newBuilding, newLabel, newStartDate, newEndDate, newStartTime, newEndTime,
        //   organizer_id_param, collaborating_organizers, category_ids, OUT newEvent_id
        // )
        
        const procedureParams = [
            // 1-19: IN parameters
            title || '',                    // 1. newTitle (VARCHAR(45))
            description || '',              // 2. newDescription (VARCHAR(1000))
            perks || null,                  // 3. newPerks (VARCHAR(100)) - CAN BE NULL
            parseInt(max_participants) || 0, // 4. newMax_participants (INT)
            parseInt(application_required) || 0, // 5. newApplication_required (TINYINT)
            application_link || null,       // 6. newApplication_link (VARCHAR(45)) - CAN BE NULL
            application_deadline || null,   // 7. newApplication_deadline (DATE) - CAN BE NULL
            flyer_url || null,              // 8. newFlyer (BLOB) - CAN BE NULL
            event_type || 'on_campus',      // 9. newEvent_type (ENUM)
            online_link || null,            // 10. newOnline_link (VARCHAR(45)) - CAN BE NULL
            building || null,               // 11. newBuilding (VARCHAR(45)) - CAN BE NULL
            label || null,                  // 12. newLabel (VARCHAR(45)) - CAN BE NULL
            start_date,                     // 13. newStartDate (DATE)
            end_date,                       // 14. newEndDate (DATE)
            start_time,                     // 15. newStartTime (TIME)
            end_time,   
            finalCost,                    // 16. newEndTime (TIME)
            parseInt(organizer_id) || 0,    // 17. organizer_id_param (INT)
            // JSON parameters - MUST be properly stringified
            JSON.stringify(collaborating_organizers || []), // 18. collaborating_organizers (JSON)
            JSON.stringify(category_ids || [])              // 19. category_ids (JSON)
            // 20th parameter is OUT: @newEvent_id
        ];
        
        console.log('🔧 Procedure parameters (19 total):');
        procedureParams.forEach((param, index) => {
            console.log(`  ${index + 1}: ${param} (type: ${typeof param})`);
        });

        const connection = await pool.getConnection();
        
        try {
            // Call the stored procedure with ALL 19 parameters
            const sql = `CALL uploadEvent(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, @newEvent_id)`;
            console.log('📝 SQL:', sql);
            console.log('📦 Params count:', procedureParams.length);
            
            const [result] = await connection.query(sql, procedureParams);
            
            // Get the output parameter
            const [[output]] = await connection.query('SELECT @newEvent_id AS newEventId');
            const newEventId = output.newEventId;
            
            console.log('✅ Event created with ID:', newEventId);
            
            res.status(201).json({ 
                success: true, 
                newEventId: newEventId,
                message: 'Event created successfully'
            });
            
        } catch (sqlError) {
            console.error('❌ SQL Error:', sqlError.message);
            console.error('SQL Code:', sqlError.code);
            console.error('SQL State:', sqlError.sqlState);
            console.error('Full error:', sqlError);
            
            // More detailed error info
            if (sqlError.sql) {
                console.error('Actual SQL executed:', sqlError.sql);
            }
            
            throw sqlError;
        } finally {
            connection.release();
        }
        
    } catch (error) {
        console.error('❌ Error creating event:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Failed to create event',
            sqlMessage: error.sqlMessage,
            code: error.code,
            sqlState: error.sqlState
        });
    }
});

// Debug: Test if procedure exists
app.get('/api/test-procedure', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        
        // Try to call the procedure
        await connection.query('CALL validateOrganizer(1)');
        
        connection.release();
        res.json({ success: true, message: 'Procedure exists and works' });
        
    } catch (error) {
        console.error('Procedure test failed:', error.message);
        res.status(500).json({ 
            success: false, 
            message: error.message,
            sqlMessage: error.sqlMessage 
        });
    }
});
// Get all buildings
app.get('/api/buildings', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query(`
            SELECT 
                building,
                COUNT(*) as label_count,
                MAX(capacity) as max_capacity,
                GROUP_CONCAT(label ORDER BY label SEPARATOR ', ') as all_labels
            FROM Locations 
            GROUP BY building 
            ORDER BY building
        `);
        connection.release();
        res.json(rows);
    } catch (error) {
        console.error('Error fetching buildings:', error);
        res.status(500).json({ error: 'Failed to fetch buildings' });
    }
});


// Get labels for a specific building
app.get('/api/buildings/:building/labels', async (req, res) => {
    try {
        const building = decodeURIComponent(req.params.building);
        const connection = await pool.getConnection();
        const [rows] = await connection.query(
            'SELECT location_id, label, capacity FROM Locations WHERE building = ? ORDER BY label',
            [building]
        );
        connection.release();
        res.json(rows);
    } catch (error) {
        console.error('Error fetching labels:', error);
        res.status(500).json({ error: 'Failed to fetch labels' });
    }
});