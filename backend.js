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
    host: '127.0.0.1',
    port: 3306,
    user: 'root', // Update with your MySQL username
    password: 'your password', // Update with your MySQL password
    database: 'dku_event_system'
};

// Create connection pool
const pool = mysql.createPool(dbConfig);
// Additional pool that allows multiple statements (used for stored procedures with OUT params)
const poolMulti = mysql.createPool(Object.assign({}, dbConfig, { multipleStatements: true }));

// Helper: get number of IN parameters for a stored procedure in the current database
async function getProcedureInParamCount(procName, connection) {
    try {
        const query = `
            SELECT COUNT(*) AS cnt
            FROM information_schema.parameters
            WHERE specific_schema = ?
              AND specific_name = ?
              AND parameter_mode = 'IN'
        `;
        const [rows] = await connection.execute(query, [dbConfig.database, procName]);
        return rows && rows[0] ? Number(rows[0].cnt) : 0;
    } catch (err) {
        console.debug('Could not read procedure params for', procName, err.message);
        return null; // unknown
    }
}

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
                GROUP_CONCAT(DISTINCT eo.organizer_id) as organizer_ids,
                GROUP_CONCAT(DISTINCT o.organizer_type) as organizer_types,
                GROUP_CONCAT(DISTINCT CONCAT_WS(' ', att.first_name, att.last_name)) as attendee_names,
                GROUP_CONCAT(DISTINCT cl.club_name) as club_names,
                GROUP_CONCAT(DISTINCT sch.name) as school_names,
                GROUP_CONCAT(DISTINCT u.email) as organizer_emails,
                ea.application_deadline, eol.online_link, e.flyer
            FROM events e
            JOIN timeslots t ON e.timeslot_id = t.timeslot_id
            LEFT JOIN event_location el ON e.event_id = el.event_id
            LEFT JOIN locations l ON el.location_id = l.location_id
            LEFT JOIN event_categories ec ON e.event_id = ec.event_id
            LEFT JOIN categories c ON ec.category_id = c.category_id
            LEFT JOIN event_organizer eo ON e.event_id = eo.event_id
            LEFT JOIN Organizers o ON eo.organizer_id = o.organizer_id
            LEFT JOIN Users u ON o.user_id = u.user_id
            LEFT JOIN Organizer_student os ON o.organizer_id = os.organizer_id
            LEFT JOIN Attendees att ON os.attendee_id = att.attendee_id
            LEFT JOIN Clubs cl ON o.organizer_id = cl.organizer_id
            LEFT JOIN Organizer_school sch ON o.organizer_id = sch.organizer_id
            LEFT JOIN Event_applications ea ON e.event_id = ea.event_id
            LEFT JOIN Event_online_links eol ON e.event_id = eol.event_id
            GROUP BY e.event_id
            ORDER BY t.start_date DESC, t.start_time DESC
        `;
        
        const [rows] = await connection.execute(query);
        connection.release();
        
        // Transform the data to match frontend expectations
        const events = rows.map(row => {
            // Process organizers
            const organizerIds = row.organizer_ids ? row.organizer_ids.split(',') : [];
            const organizerTypes = row.organizer_types ? row.organizer_types.split(',') : [];
            const attendeeNames = row.attendee_names ? row.attendee_names.split(',') : [];
            const clubNames = row.club_names ? row.club_names.split(',') : [];
            const schoolNames = row.school_names ? row.school_names.split(',') : [];
            const organizerEmails = row.organizer_emails ? row.organizer_emails.split(',') : [];
    
            const organizers = organizerIds.map((id, index) => {
                const type = organizerTypes[index];
                let name = 'Unknown';
                let contact = organizerEmails[index] || 'events@dku.edu';
    
                if (type === 'club' && clubNames[index]) {
                    name = clubNames[index];
                } else if (type === 'school' && schoolNames[index]) {
                    name = schoolNames[index];
                } else if (type === 'student' && attendeeNames[index]) {
                    name = attendeeNames[index];
                } else if (organizerEmails[index]) {
                    name = organizerEmails[index].split('@')[0];
                }
                
                return {
                    organizer_id: id,
                    name: name,
                    type: type,
                    contact: contact
                };
            });

            return {
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
                organizer: organizers.length > 0 ? organizers : [{ name: 'Various Organizers', type: 'school', contact: 'events@dku.edu' }],
                categories: row.categories ? row.categories.split(',') : [],
                event_type: row.event_type,
                cost: row.cost,
                max_participants: row.max_participants,
                application_required: row.application_required === 1,
                perks: row.perks,
                flyer: row.flyer ? row.flyer.toString('base64') : null, // Convert BLOB to base64
                online_link: row.online_link,
                application_deadline: row.application_deadline,
                popularity: Math.floor(Math.random() * 200) + 10 // Mock popularity for now
            };
        });
        
        res.json(events);
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

// Filter events using stored procedure
app.post('/api/events/filter', async (req, res) => {
    let connection = null; // Declare and initialize connection here
    try {
        const {
            start_date,
            end_date,
            event_type,
            categories, // Array of category names
            organizers, // Array of organizer names
            locations   // Array of location labels (building name)
        } = req.body;

        connection = await pool.getConnection(); // Obtain connection at the start of try block
        let organizerIdsForSp = null;

        // Step 1: If organizer names are provided, convert them to organizer_ids
        if (organizers && organizers.length > 0) {
            const organizerNamePlaceholders = organizers.map(() => '?').join(',');
            const fetchOrganizerIdsQuery = `
                SELECT DISTINCT o.organizer_id
                FROM Organizers o
                LEFT JOIN Organizer_student os ON o.organizer_id = os.organizer_id
                LEFT JOIN Attendees att ON os.attendee_id = att.attendee_id
                LEFT JOIN Clubs cl ON o.organizer_id = cl.organizer_id
                LEFT JOIN Organizer_school sch ON o.organizer_id = sch.organizer_id
                WHERE
                    cl.club_name IN (${organizerNamePlaceholders})
                    OR sch.name IN (${organizerNamePlaceholders})
                    OR CONCAT_WS(' ', att.first_name, att.last_name) IN (${organizerNamePlaceholders})
            `;
            const [orgIdRows] = await connection.execute(fetchOrganizerIdsQuery, [...organizers, ...organizers, ...organizers]);
            const tempOrganizerIds = orgIdRows.map(row => row.organizer_id);
            if (tempOrganizerIds.length > 0) {
                organizerIdsForSp = JSON.stringify(tempOrganizerIds);
            } else {
                // If no matching organizers found, no events will match this filter
                return res.json({ upcoming: [], past: [] });
            }
        }
        
        // Prepare parameters for stored procedure
        const spParams = [
            start_date || null,
            end_date || null,
            event_type || null, // event_type is a single string or null now
            categories && categories.length > 0 ? JSON.stringify(categories) : null, // JSON array of names
            organizerIdsForSp, // JSON array of IDs or null
            locations && locations.length > 0 ? JSON.stringify(locations) : null // JSON array of names
        ];

        console.log('Calling filter_events with params:', spParams);

        const [spResult] = await connection.execute(
            'CALL filter_events(?, ?, ?, ?, ?, ?)',
            spParams
        );

        // The stored procedure returns the filtered event IDs in the first result set
        let eventIds = spResult[0].map(row => row.event_id);

        // If no events found by the stored procedure, return empty array
        if (eventIds.length === 0) {
            return res.json({ upcoming: [], past: [] });
        }

        // Step 2: Get full event details for the filtered IDs
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
                GROUP_CONCAT(DISTINCT eo.organizer_id) as organizer_ids,
                GROUP_CONCAT(DISTINCT o.organizer_type) as organizer_types,
                GROUP_CONCAT(DISTINCT CONCAT_WS(' ', att.first_name, att.last_name)) as attendee_names,
                GROUP_CONCAT(DISTINCT cl.club_name) as club_names,
                GROUP_CONCAT(DISTINCT sch.name) as school_names,
                GROUP_CONCAT(DISTINCT u.email) as organizer_emails,
                ea.application_deadline, eol.online_link, e.flyer
            FROM events e
            JOIN timeslots t ON e.timeslot_id = t.timeslot_id
            LEFT JOIN event_location el ON e.event_id = el.event_id
            LEFT JOIN locations l ON el.location_id = l.location_id
            LEFT JOIN event_categories ec ON e.event_id = ec.event_id
            LEFT JOIN categories c ON ec.category_id = c.category_id
            LEFT JOIN event_organizer eo ON e.event_id = eo.event_id
            LEFT JOIN Organizers o ON eo.organizer_id = o.organizer_id
            LEFT JOIN Users u ON o.user_id = u.user_id
            LEFT JOIN Organizer_student os ON o.organizer_id = os.organizer_id
            LEFT JOIN Attendees att ON os.attendee_id = att.attendee_id
            LEFT JOIN Clubs cl ON o.organizer_id = cl.organizer_id
            LEFT JOIN Organizer_school sch ON o.organizer_id = sch.organizer_id
            LEFT JOIN Event_applications ea ON e.event_id = ea.event_id
            LEFT JOIN Event_online_links eol ON e.event_id = eol.event_id
            WHERE e.event_id IN (${eventIds.join(',')})
            GROUP BY e.event_id
            ORDER BY t.start_date DESC, t.start_time DESC
        `;
        
        const [eventDetails] = await connection.execute(eventDetailsQuery);
        
        // Transform the data
        const now = new Date();
        const upcomingEvents = [];
        const pastEvents = [];

        eventDetails.map(row => {
            const eventStartDate = new Date(`${row.start_date}T${row.start_time}`);

            // Process organizers
            const organizerIds = row.organizer_ids ? row.organizer_ids.split(',') : [];
            const organizerTypes = row.organizer_types ? row.organizer_types.split(',') : [];
            const attendeeNames = row.attendee_names ? row.attendee_names.split(',') : [];
            const clubNames = row.club_names ? row.club_names.split(',') : [];
            const schoolNames = row.school_names ? row.school_names.split(',') : [];
            const organizerEmails = row.organizer_emails ? row.organizer_emails.split(',') : [];
    
            const organizers = organizerIds.map((id, index) => {
                const type = organizerTypes[index];
                let name = 'Unknown';
                let contact = organizerEmails[index] || 'events@dku.edu';
    
                if (type === 'club' && clubNames[index]) {
                    name = clubNames[index];
                } else if (type === 'school' && schoolNames[index]) {
                    name = schoolNames[index];
                } else if (type === 'student' && attendeeNames[index]) {
                    name = attendeeNames[index];
                }
                return {
                    organizer_id: id,
                    name: name,
                    type: type,
                    contact: contact
                };
            });

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
                organizer: organizers.length > 0 ? organizers : [{ name: 'Various Organizers', type: 'school', contact: 'events@dku.edu' }],
                categories: row.categories ? row.categories.split(',') : [],
                event_type: row.event_type,
                cost: row.cost,
                max_participants: row.max_participants,
                application_required: row.application_required === 1,
                perks: row.perks,
                flyer: row.flyer ? row.flyer.toString('base64') : null,
                online_link: row.online_link,
                application_deadline: row.application_deadline,
                popularity: Math.floor(Math.random() * 200) + 10
            };

            if (eventStartDate > now) {
                upcomingEvents.push(event);
            } else {
                pastEvents.push(event);
            }
        });

        res.json({ upcoming: upcomingEvents, past: pastEvents });
        
    } catch (error) {
        console.error('Error filtering events:', error);
        res.status(500).json({ error: 'Failed to filter events' });
    } finally {
        if (connection) connection.release();
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
                GROUP_CONCAT(DISTINCT eo.organizer_id) as organizer_ids,
                GROUP_CONCAT(DISTINCT o.organizer_type) as organizer_types,
                GROUP_CONCAT(DISTINCT CONCAT_WS(' ', att.first_name, att.last_name)) as attendee_names,
                GROUP_CONCAT(DISTINCT cl.club_name) as club_names,
                GROUP_CONCAT(DISTINCT sch.name) as school_names,
                GROUP_CONCAT(DISTINCT u.email) as organizer_emails,
                ea.application_deadline, eol.online_link, e.flyer
            FROM events e
            JOIN timeslots t ON e.timeslot_id = t.timeslot_id
            LEFT JOIN event_location el ON e.event_id = el.event_id
            LEFT JOIN locations l ON el.location_id = l.location_id
            LEFT JOIN event_categories ec ON e.event_id = ec.event_id
            LEFT JOIN categories c ON ec.category_id = c.category_id
            LEFT JOIN event_organizer eo ON e.event_id = eo.event_id
            LEFT JOIN Organizers o ON eo.organizer_id = o.organizer_id
            LEFT JOIN Users u ON o.user_id = u.user_id
            LEFT JOIN Organizer_student os ON o.organizer_id = os.organizer_id
            LEFT JOIN Attendees att ON os.attendee_id = att.attendee_id
            LEFT JOIN Clubs cl ON o.organizer_id = cl.organizer_id
            LEFT JOIN Organizer_school sch ON o.organizer_id = sch.organizer_id
            LEFT JOIN Event_applications ea ON e.event_id = ea.event_id
            LEFT JOIN Event_online_links eol ON e.event_id = eol.event_id
            WHERE e.event_id = ?
            GROUP BY e.event_id
        `;
        
        const [rows] = await connection.execute(query, [eventId]);
        connection.release();
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        
        const row = rows[0];

        // Process organizers
        const organizerIds = row.organizer_ids ? row.organizer_ids.split(',') : [];
        const organizerTypes = row.organizer_types ? row.organizer_types.split(',') : [];
        const attendeeNames = row.attendee_names ? row.attendee_names.split(',') : [];
        const clubNames = row.club_names ? row.club_names.split(',') : [];
        const schoolNames = row.school_names ? row.school_names.split(',') : [];
        const organizerEmails = row.organizer_emails ? row.organizer_emails.split(',') : [];

        const organizers = organizerIds.map((id, index) => {
            const type = organizerTypes[index];
            let name = 'Unknown';
            let contact = organizerEmails[index] || 'events@dku.edu';

            if (type === 'club' && clubNames[index]) {
                name = clubNames[index];
            } else if (type === 'school' && schoolNames[index]) {
                name = schoolNames[index];
            } else if (type === 'student' && attendeeNames[index]) {
                name = attendeeNames[index];
            } else if (organizerEmails[index]) {
                name = organizerEmails[index].split('@')[0]; // Use email prefix if no name found
            }
            
            return {
                organizer_id: id,
                name: name,
                type: type,
                contact: contact
            };
        });

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
                capacity: row.max_participants // Assuming max_participants is the event's capacity
            },
            organizer: organizers.length > 0 ? organizers : [{ name: 'Various Organizers', type: 'school', contact: 'events@dku.edu' }],
            categories: row.categories ? row.categories.split(',') : [],
            event_type: row.event_type,
            cost: row.cost,
            max_participants: row.max_participants,
            application_required: row.application_required === 1,
            perks: row.perks,
            flyer: row.flyer ? row.flyer.toString('base64') : null, // Convert BLOB to base64
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

// Get organizer by ID
app.get('/api/organizers/:id', async (req, res) => {
    try {
        const organizerId = req.params.id;
        const connection = await pool.getConnection();

        const query = `
            SELECT 
                o.organizer_id,
                o.organizer_type,
                u.email,
                att.first_name, att.last_name,
                cl.club_name, cl.club_url, cl.contact_email AS club_contact_email,
                sch.name AS school_name, sch.department, sch.supervisor
            FROM Organizers o
            LEFT JOIN Users u ON o.user_id = u.user_id
            LEFT JOIN Organizer_student os ON o.organizer_id = os.organizer_id
            LEFT JOIN Attendees att ON os.attendee_id = att.attendee_id
            LEFT JOIN Clubs cl ON o.organizer_id = cl.organizer_id
            LEFT JOIN Organizer_school sch ON o.organizer_id = sch.organizer_id
            WHERE o.organizer_id = ?
        `;

        const [rows] = await connection.execute(query, [organizerId]);
        connection.release();

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Organizer not found' });
        }

        const row = rows[0];
        let organizerDetails = {
            organizer_id: row.organizer_id,
            type: row.organizer_type,
            email: row.email
        };

        if (row.organizer_type === 'student' && row.first_name) { // Corrected type to 'student'
            organizerDetails.name = `${row.first_name || ''} ${row.last_name || ''}`.trim();
        } else if (row.organizer_type === 'club') {
            organizerDetails.name = row.club_name;
            organizerDetails.club_url = row.club_url;
            organizerDetails.contact_email = row.club_contact_email;
        } else if (row.organizer_type === 'school') {
            organizerDetails.name = row.school_name;
            organizerDetails.department = row.department;
            organizerDetails.supervisor = row.supervisor;
        }
        
        res.json(organizerDetails);
    } catch (error) {
        console.error('Error fetching organizer details:', error.message);
        res.status(500).json({ error: 'Failed to fetch organizer details' });
    }
});

// Get events by organizer ID
app.get('/api/organizers/:id/events', async (req, res) => {
    try {
        const organizerId = req.params.id;
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
                GROUP_CONCAT(DISTINCT c.category_name) as categories
            FROM events e
            JOIN timeslots t ON e.timeslot_id = t.timeslot_id
            LEFT JOIN event_location el ON e.event_id = el.event_id
            LEFT JOIN locations l ON el.location_id = l.location_id
            LEFT JOIN event_categories ec ON e.event_id = ec.event_id
            LEFT JOIN categories c ON ec.category_id = c.category_id
            JOIN event_organizer eo ON e.event_id = eo.event_id
            WHERE eo.organizer_id = ?
            GROUP BY e.event_id
            ORDER BY t.start_date DESC, t.start_time DESC
        `;

        const [rows] = await connection.execute(query, [organizerId]);
        connection.release();

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
        console.error('Error fetching events by organizer:', error.message);
        res.status(500).json({ error: 'Failed to fetch events by organizer' });
    }
});

// Get all organizers with names for filtering (alphabetical)
app.get('/api/all-organizers', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const query = `
            SELECT
                o.organizer_id,
                o.organizer_type,
                u.email,
                CONCAT_WS(' ', att.first_name, att.last_name) as attendee_name,
                cl.club_name,
                sch.name as school_name
            FROM Organizers o
            LEFT JOIN Users u ON o.user_id = u.user_id
            LEFT JOIN Organizer_student os ON o.organizer_id = os.organizer_id
            LEFT JOIN Attendees att ON os.attendee_id = att.attendee_id
            LEFT JOIN Clubs cl ON o.organizer_id = cl.organizer_id
            LEFT JOIN Organizer_school sch ON o.organizer_id = sch.organizer_id
            ORDER BY
                CASE o.organizer_type
                    WHEN 'club' THEN cl.club_name
                    WHEN 'school' THEN sch.name
                    WHEN 'student' THEN CONCAT_WS(' ', att.first_name, att.last_name)
                    ELSE u.email
                END ASC;
        `;
        const [rows] = await connection.execute(query);
        connection.release();

        const organizers = rows.map(row => {
            let name = 'Unknown';
            if (row.organizer_type === 'club' && row.club_name) {
                name = row.club_name;
            } else if (row.organizer_type === 'school' && row.school_name) {
                name = row.school_name;
            } else if (row.organizer_type === 'student' && row.attendee_name) {
                name = row.attendee_name;
            } else if (row.email) {
                name = row.email.split('@')[0];
            }
            return {
                organizer_id: row.organizer_id,
                name: name,
                type: row.organizer_type
            };
        }).filter(org => org.name !== 'Unknown'); // Filter out organizers with unknown names

        res.json(organizers);
    } catch (error) {
        console.error('Error fetching all organizers:', error.message);
        res.status(500).json({ error: 'Failed to fetch organizers' });
    }
});

// Get user by ID (basic profile info)
app.get('/api/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const connection = await pool.getConnection();
        const [rows] = await connection.execute('SELECT user_id, user_type, email FROM Users WHERE user_id = ? LIMIT 1', [userId]);
        connection.release();

        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching user:', error.message);
        return res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// Debug: list stored procedure parameter names and modes (safe helper)
app.get('/api/debug/proc_params/:name', async (req, res) => {
    const name = req.params.name;
    try {
        const connection = await pool.getConnection();
        const query = `
            SELECT parameter_name, parameter_mode, data_type
            FROM information_schema.parameters
            WHERE specific_schema = ? AND specific_name = ?
            ORDER BY ordinal_position
        `;
        const [rows] = await connection.execute(query, [dbConfig.database, name]);
        connection.release();
        res.json(rows);
    } catch (err) {
        console.error('Error reading proc params for', name, err.message);
        res.status(500).json({ error: err.message });
    }
});

// Authentication: Login using stored function fn_user_login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

        const connection = await pool.getConnection();
        const [rows] = await connection.execute('SELECT fn_user_login(?, ?) AS user_id', [email, password]);
        connection.release();

        const userId = rows && rows[0] && rows[0].user_id ? rows[0].user_id : 0;
        if (userId && userId > 0) {
            return res.json({ success: true, user_id: userId });
        }

        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    } catch (error) {
        console.error('Error during login:', error.message);
        return res.status(500).json({ error: 'Login failed.' });
    }
});

// Signup endpoints that call stored procedures. Each procedure uses an OUT parameter for status/error message.
app.post('/api/signup/attendee', async (req, res) => {
    const { email, password, first_name, last_name, netId, gradYear, major } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

    const connection = await poolMulti.getConnection();
    try {
        // Relax SQL mode for this session to avoid strict-mode errors when DB schema
        // has columns without defaults (e.g., grad_year). Remove STRICT_TRANS_TABLES / STRICT_ALL_TABLES.
        try {
            // For safety (and to avoid malformed sql_mode strings on this server), set the
            // current session sql_mode to an empty string so strict-mode doesn't block inserts
            // for columns without defaults while we run the stored procedure.
            await connection.query('SET SESSION sql_mode = ""');
        } catch (modeErr) {
            console.debug('Could not set session sql_mode to empty string:', modeErr.message);
        }

        // Figure out how many IN params the stored procedure expects and call accordingly
        const inCount = await getProcedureInParamCount('sp_signup_attendee', connection);
        const optionalFields = [first_name || null, last_name || null, netId || null, gradYear || null, major || null];

        if (inCount === null) {
            // Unknown signature: try longest to shortest optional sets
            let called = false;
            for (let take = optionalFields.length; take >= 0 && !called; take--) {
                const args = [email, password, ...optionalFields.slice(0, take)];
                const placeholders = new Array(2 + take).fill('?').join(', ');
                try {
                    console.debug('Attempting sp_signup_attendee with', 2 + take, 'IN args');
                    await connection.query(`CALL sp_signup_attendee(${placeholders}, @p_error_message)`, args);
                    called = true;
                } catch (err) {
                    console.debug('sp_signup_attendee attempt failed with', take, 'optional args:', err.message);
                }
            }
            if (!called) throw new Error('Could not call sp_signup_attendee with any signature');
            } else {
            const expectedIn = Number(inCount);
            const numOptionalNeeded = Math.max(0, expectedIn - 2); // email,password are first two
            const args = [email, password, ...optionalFields.slice(0, numOptionalNeeded)];
                console.debug('sp_signup_attendee expects', expectedIn, 'IN args - calling with', args.length);
            const placeholders = new Array(expectedIn).fill('?').join(', ');
            await connection.query(`CALL sp_signup_attendee(${placeholders}, @p_error_message)`, args);
        }

        // Read the OUT parameter
        const [outRows] = await connection.query('SELECT @p_error_message AS message');
        let message = outRows && outRows[0] ? outRows[0].message : 'Unknown result';

        // If the procedure reported success and a major was provided, update Attendees.major for the created user
        if (message && message.toLowerCase().startsWith('success') && major) {
            try {
                const [userRows] = await connection.execute('SELECT user_id FROM Users WHERE email = ? LIMIT 1', [email]);
                const uid = userRows && userRows[0] ? userRows[0].user_id : null;
                if (uid) {
                    await connection.execute('UPDATE Attendees SET major = ? WHERE user_id = ?', [major, uid]);
                    message = message + ' Major recorded.';
                } else {
                    message = message + ' (Could not find user to set major)';
                }
            } catch (uErr) {
                console.error('Failed to set major for attendee user:', uErr.message);
                // don't fail the signup overall — return message with note
                message = message + ' (Failed to save major)';
            }
        }

        return res.json({ message });
    } catch (error) {
        console.error('Error during attendee signup:', error.message);
        return res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

app.post('/api/signup/club', async (req, res) => {
    const { email, password, club_name, club_url, contact_email, yearFounded } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

    const connection = await poolMulti.getConnection();
    try {
        // ensure session not in strict mode to avoid inserts failing on columns without defaults
        try {
            await connection.query('SET SESSION sql_mode = ""');
        } catch (modeErr) {
            console.debug('Could not set session sql_mode to empty string for club signup:', modeErr.message);
        }
        await connection.query('CALL sp_signup_club(?, ?, ?, ?, ?, ?, @p_error_message)', [email, password, club_name || null, club_url || null, contact_email || null, yearFounded || null]);
        const [outRows] = await connection.query('SELECT @p_error_message AS message');
        let message = outRows && outRows[0] ? outRows[0].message : 'Unknown result';

        // If signup succeeded and a yearFounded was provided, update the Clubs row for this organizer
        if (message && message.toLowerCase().startsWith('success') && yearFounded) {
            try {
                // find the user_id
                const [userRows] = await connection.execute('SELECT user_id FROM Users WHERE email = ? LIMIT 1', [email]);
                const uid = userRows && userRows[0] ? userRows[0].user_id : null;
                if (uid) {
                    // find the latest organizer for this user
                    const [orgRows] = await connection.execute('SELECT organizer_id FROM Organizers WHERE user_id = ? ORDER BY organizer_id DESC LIMIT 1', [uid]);
                    const orgId = orgRows && orgRows[0] ? orgRows[0].organizer_id : null;
                    if (orgId) {
                        // update Clubs table
                        await connection.execute('UPDATE Clubs SET year_founded = ? WHERE organizer_id = ?', [yearFounded, orgId]);
                        message = message + ' Year recorded.';
                    } else {
                        message = message + ' (Could not find organizer to set year founded)';
                    }
                } else {
                    message = message + ' (Could not find user to set year founded)';
                }
            } catch (uErr) {
                console.error('Failed to set year founded for club:', uErr.message);
                message = message + ' (Failed to save year)';
            }
        }

        return res.json({ message });
    } catch (error) {
        console.error('Error during club signup:', error.message);
        return res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

app.post('/api/signup/school', async (req, res) => {
    const { email, password, department, name, supervisor } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

    const connection = await poolMulti.getConnection();
    try {
        await connection.query('CALL sp_signup_school(?, ?, ?, ?, ?, @p_error_message)', [email, password, department || null, name || null, supervisor || null]);
        const [outRows] = await connection.query('SELECT @p_error_message AS message');
        const message = outRows && outRows[0] ? outRows[0].message : 'Unknown result';
        return res.json({ message });
    } catch (error) {
        console.error('Error during school signup:', error.message);
        return res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

app.post('/api/signup/student', async (req, res) => {
    const { email, password, first_name, last_name, netId, gradYear, major } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

    const connection = await poolMulti.getConnection();
    try {
        // Relax SQL mode for this session to avoid strict-mode errors
        try {
            await connection.query('SET SESSION sql_mode = ""');
        } catch (modeErr) {
            console.debug('Could not set session sql_mode to empty string:', modeErr.message);
        }

        // Decide how many IN params the procedure expects by inspecting information_schema
        try {
            // Decide how many IN params the procedure expects and call accordingly
            const inCount = await getProcedureInParamCount('sp_signup_student_organizer', connection);
            const optionalFields = [first_name || null, last_name || null, netId || null, gradYear || null, major || null];

            if (inCount === null) {
                // Unknown signature: attempt longest to shortest
                let called = false;
                for (let take = optionalFields.length; take >= 0 && !called; take--) {
                    const args = [email, password, ...optionalFields.slice(0, take)];
                    const placeholders = new Array(2 + take).fill('?').join(', ');
                    try {
                        await connection.query(`CALL sp_signup_student_organizer(${placeholders}, @p_error_message)`, args);
                        called = true;
                    } catch (err) {
                        console.debug('sp_signup_student_organizer attempt failed with', take, 'optional args:', err.message);
                    }
                }
                if (!called) throw new Error('Could not call sp_signup_student_organizer with any signature');
            } else {
                const expectedIn = Number(inCount);
                const numOptionalNeeded = Math.max(0, expectedIn - 2);
                const args = [email, password, ...optionalFields.slice(0, numOptionalNeeded)];
                const placeholders = new Array(expectedIn).fill('?').join(', ');
                await connection.query(`CALL sp_signup_student_organizer(${placeholders}, @p_error_message)`, args);
            }

            // Read OUT param
            const [outRows] = await connection.query('SELECT @p_error_message AS message');
            let message = outRows && outRows[0] ? outRows[0].message : 'Unknown result';

            // If success and major provided, set major on Attendees
            if (message && message.toLowerCase().startsWith('success') && major) {
                try {
                    const [userRows] = await connection.execute('SELECT user_id FROM Users WHERE email = ? LIMIT 1', [email]);
                    const uid = userRows && userRows[0] ? userRows[0].user_id : null;
                    if (uid) {
                        await connection.execute('UPDATE Attendees SET major = ? WHERE user_id = ?', [major, uid]);
                        message = message + ' Major recorded.';
                    } else {
                        message = message + ' (Could not find user to set major)';
                    }
                } catch (uErr) {
                    console.error('Failed to set major for student organizer user:', uErr.message);
                    message = message + ' (Failed to save major)';
                }
            }

            return res.json({ message });
        } catch (innerErr) {
            throw innerErr;
        }
    } catch (error) {
        console.error('Error during student organizer signup:', error.message);
        return res.status(500).json({ error: error.message });
    } finally {
        connection.release();
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
