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

// Get all categories
app.get('/api/categories', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.execute('SELECT category_name FROM categories ORDER BY category_name');
        connection.release();
        
        const categories = rows.map(row => row.category_name);
        res.json(categories);
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
