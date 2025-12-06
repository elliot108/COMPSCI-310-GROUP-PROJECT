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
    password: 'your password', // Update with your MySQL password
    database: 'dku_event_system',

    connectionLimit: 10,
    waitForConnections: true,
    
    // FORCE autocommit for all connections
    sessionVariables: {
        'autocommit': 'ON'
    },
    
    // Also add these
    charset: 'utf8mb4',
    timezone: 'local',
    multipleStatements: false,
    
    // IMPORTANT: Set connection flag to enable autocommit
    flags: [
        '-FOUND_ROWS',  // Return found rows instead of changed rows
        '-INTERACTIVE', // Don't use interactive client
        '-MULTI_STATEMENTS' // Disable multiple statements for safety
    ].join(',')
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
        
        // We'll fetch organizer details separately to avoid misaligned GROUP_CONCAT columns
        const eventIds = rows.map(r => r.event_id);

        const organizersByEvent = {};
        if (eventIds.length > 0) {
            const placeholders = eventIds.map(() => '?').join(',');
            const orgQuery = `
                SELECT eo.event_id,
                       eo.organizer_id,
                       o.organizer_type,
                       COALESCE(cl.club_name, sch.name, CONCAT_WS(' ', att.first_name, att.last_name), u.email) AS organizer_name,
                       u.email AS organizer_email
                FROM event_organizer eo
                JOIN Organizers o ON eo.organizer_id = o.organizer_id
                LEFT JOIN Users u ON o.user_id = u.user_id
                LEFT JOIN Organizer_student os ON o.organizer_id = os.organizer_id
                LEFT JOIN Attendees att ON os.attendee_id = att.attendee_id
                LEFT JOIN Clubs cl ON o.organizer_id = cl.organizer_id
                LEFT JOIN Organizer_school sch ON o.organizer_id = sch.organizer_id
                WHERE eo.event_id IN (${placeholders})
            `;

            const [orgRows] = await connection.execute(orgQuery, eventIds);
            orgRows.forEach(r => {
                if (!organizersByEvent[r.event_id]) organizersByEvent[r.event_id] = [];
                organizersByEvent[r.event_id].push({
                    organizer_id: r.organizer_id,
                    name: r.organizer_name || (r.organizer_email ? r.organizer_email.split('@')[0] : 'Unknown'),
                    type: r.organizer_type,
                    contact: r.organizer_email || 'events@dku.edu'
                });
            });
        }

        // Transform the data to match frontend expectations
        const events = rows.map(row => {
            const organizers = organizersByEvent[row.event_id] || [];

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
            JSON.stringify(collaborating_organizers ? collaborating_organizers.filter(id => id !== null) : []), // 18. collaborating_organizers (JSON)
            JSON.stringify(category_ids ? category_ids.filter(id => id !== null) : [])              // 19. category_ids (JSON)
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
        // Helper to ensure null is passed for empty/undefined values
        function toNullableJson(arr) {
            return Array.isArray(arr) && arr.length > 0 ? JSON.stringify(arr) : null;
        }

        const spParams = [
            start_date ? start_date : null,
            end_date ? end_date : null,
            event_type ? event_type : null,
            toNullableJson(categories),
            organizerIdsForSp ? organizerIdsForSp : null,
            toNullableJson(locations)
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
            WHERE e.event_id IN (${eventIds.map(() => '?').join(',')})
            GROUP BY e.event_id
            ORDER BY t.start_date DESC, t.start_time DESC
        `;
        const [eventDetails] = await connection.execute(eventDetailsQuery, eventIds);

        // Step 3: Separate matching and non-matching events, and then by upcoming/past
        const now = new Date();
        const matchingEvents = [];
        const nonMatchingEvents = [];

        // Fetch organizers for all events to ensure correct mapping
        const allEventIds = eventDetails.map(r => r.event_id);
        const allOrganizersByEvent = {};
        if (allEventIds.length > 0) {
            const placeholders = allEventIds.map(() => '?').join(',');
            const orgQuery = `
                SELECT eo.event_id,
                       eo.organizer_id,
                       o.organizer_type,
                       COALESCE(cl.club_name, sch.name, CONCAT_WS(' ', att.first_name, att.last_name), u.email) AS organizer_name,
                       u.email AS organizer_email
                FROM event_organizer eo
                JOIN Organizers o ON eo.organizer_id = o.organizer_id
                LEFT JOIN Users u ON o.user_id = u.user_id
                LEFT JOIN Organizer_student os ON o.organizer_id = os.organizer_id
                LEFT JOIN Attendees att ON os.attendee_id = att.attendee_id
                LEFT JOIN Clubs cl ON o.organizer_id = cl.organizer_id
                LEFT JOIN Organizer_school sch ON o.organizer_id = sch.organizer_id
                WHERE eo.event_id IN (${placeholders})
            `;
            const [orgRows] = await connection.execute(orgQuery, allEventIds);
            orgRows.forEach(r => {
                if (!allOrganizersByEvent[r.event_id]) allOrganizersByEvent[r.event_id] = [];
                allOrganizersByEvent[r.event_id].push({
                    organizer_id: r.organizer_id,
                    name: r.organizer_name || (r.organizer_email ? r.organizer_email.split('@')[0] : 'Unknown'),
                    type: r.organizer_type,
                    contact: r.organizer_email || 'events@dku.edu'
                });
            });
        }

        eventDetails.forEach(row => {
            const eventStartDate = new Date(`${row.start_date}T${row.start_time}`);
            const organizers = allOrganizersByEvent[row.event_id] || [];

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

            if (eventIds.includes(event.event_id)) {
                matchingEvents.push(event);
            } else {
                nonMatchingEvents.push(event);
            }
        });

        // Separate matching and non-matching events into upcoming/past
        const finalUpcomingEvents = [];
        const finalPastEvents = [];

        const sortAndCategorizeEvents = (events) => {
            events.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
            events.forEach(event => {
                const eventStartDate = new Date(`${event.start_date}T${event.start_time}`);
                if (eventStartDate > now) {
                    finalUpcomingEvents.push(event);
                } else {
                    finalPastEvents.push(event);
                }
            });
        };

        sortAndCategorizeEvents(matchingEvents);
        sortAndCategorizeEvents(nonMatchingEvents);

        res.json({ upcoming: finalUpcomingEvents, past: finalPastEvents });
        
    } catch (error) {
        console.error('Error filtering events:', error);
        // Return full error details for debugging (remove in production)
        res.status(500).json({ error: 'Failed to filter events', details: error.message, stack: error.stack });
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

        // Fetch organizers for the event to ensure correct name/type mapping
        const organizers = [];
        try {
            const orgQuery = `
                SELECT eo.organizer_id,
                       o.organizer_type,
                       COALESCE(cl.club_name, sch.name, CONCAT_WS(' ', att.first_name, att.last_name), u.email) AS organizer_name,
                       u.email AS organizer_email
                FROM event_organizer eo
                JOIN Organizers o ON eo.organizer_id = o.organizer_id
                LEFT JOIN Users u ON o.user_id = u.user_id
                LEFT JOIN Organizer_student os ON o.organizer_id = os.organizer_id
                LEFT JOIN Attendees att ON os.attendee_id = att.attendee_id
                LEFT JOIN Clubs cl ON o.organizer_id = cl.organizer_id
                LEFT JOIN Organizer_school sch ON o.organizer_id = sch.organizer_id
                WHERE eo.event_id = ?
            `;
            const [orgRows] = await connection.execute(orgQuery, [eventId]);
            orgRows.forEach(r => organizers.push({
                organizer_id: r.organizer_id,
                name: r.organizer_name || (r.organizer_email ? r.organizer_email.split('@')[0] : 'Unknown'),
                type: r.organizer_type,
                contact: r.organizer_email || 'events@dku.edu'
            }));
        } catch (err) {
            console.debug('Failed to load organizers for event', eventId, err.message);
        }

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

// // Get all categories
// app.get('/api/categories', async (req, res) => {
//     try {
//         const connection = await pool.getConnection();
//         const [rows] = await connection.execute('SELECT category_name FROM categories ORDER BY category_name');
//         connection.release();
        
//         const categories = rows.map(row => row.category_name);
//         res.json(categories);
//     } catch (error) {
//         console.error('Error fetching categories:', error);
//         res.status(500).json({ error: 'Failed to fetch categories' });
//     }
// });

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

app.get('/api/distinct-buildings', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT DISTINCT building FROM Locations ORDER BY building');
        connection.release();
        res.json(rows);
    } catch (error) {
        console.error('Error fetching distinct buildings:', error);
        res.status(500).json({ error: 'Failed to fetch distinct buildings' });
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

// Join club (attendee joins a club)
app.post('/api/clubs/join', async (req, res) => {
    try {
        const { attendee_id, club_id, organizer_id, remind_required } = req.body;

        if (!attendee_id) return res.status(400).json({ error: 'attendee_id is required' });

        const connection = await pool.getConnection();

        // Resolve club_id if organizer_id provided
        let finalClubId = club_id;
        if (!finalClubId) {
            if (!organizer_id) {
                connection.release();
                return res.status(400).json({ error: 'club_id or organizer_id required' });
            }

            const [rows] = await connection.execute('SELECT club_id FROM Clubs WHERE organizer_id = ?', [organizer_id]);
            if (!rows || rows.length === 0) {
                connection.release();
                return res.status(404).json({ error: 'Club not found for organizer' });
            }
            finalClubId = rows[0].club_id;
        }

        // Ensure the attendee exists. Accept either an attendee_id or a user_id (many clients store Users.user_id)
        let targetAttendeeId = attendee_id;
        let [attRows] = await connection.execute('SELECT attendee_id FROM Attendees WHERE attendee_id = ?', [targetAttendeeId]);
        if (!attRows || attRows.length === 0) {
            // attempt to find by user_id as a mapping
            const [byUser] = await connection.execute('SELECT attendee_id FROM Attendees WHERE user_id = ? LIMIT 1', [targetAttendeeId]);
            if (byUser && byUser.length > 0) {
                targetAttendeeId = byUser[0].attendee_id;
            } else {
                // No Attendees row found. See if the provided id is a Users.user_id belonging to an attendee.
                const [userRows] = await connection.execute('SELECT user_id, user_type, email FROM Users WHERE user_id = ? LIMIT 1', [targetAttendeeId]);
                if (userRows && userRows.length > 0) {
                    const user = userRows[0];
                    if (user.user_type && user.user_type.toLowerCase().includes('attendee')) {
                        // Create a minimal Attendees row so the join can proceed
                        try {
                            // Try a more robust insert using available Users data.
                            // Insert user_id and copy basic name/email from Users row (use prefix of email as a simple first_name)
                            const insertSql = `
                                INSERT IGNORE INTO Attendees (user_id, first_name, last_name, email)
                                SELECT user_id, SUBSTRING_INDEX(email, '@', 1) AS first_name, '' AS last_name, email
                                FROM Users WHERE user_id = ?
                            `;
                            const [insertResult] = await connection.execute(insertSql, [user.user_id]);

                            // Try to discover attendee_id afterwards
                            const [newRow] = await connection.execute('SELECT attendee_id FROM Attendees WHERE user_id = ? LIMIT 1', [user.user_id]);
                            if (newRow && newRow.length > 0) targetAttendeeId = newRow[0].attendee_id;
                        } catch (insErr) {
                            console.error('Failed to create Attendees row for user', targetAttendeeId, insErr.message);
                            connection.release();
                            return res.status(500).json({ error: 'Failed to create attendee record', details: insErr.message });
                        }
                    } else {
                        connection.release();
                        return res.status(404).json({ error: 'Attendee not found' });
                    }
                } else {
                    connection.release();
                    return res.status(404).json({ error: 'Attendee not found' });
                }
            }
        }

        // Insert into Club_members (ignore duplicate)
        const remind = remind_required ? 1 : 0;
        try {
            await connection.execute(
                'INSERT IGNORE INTO Club_members (club_id, attendee_id, remind_required) VALUES (?, ?, ?)',
                [finalClubId, targetAttendeeId, remind]
            );
        } catch (err) {
            connection.release();
            console.error('Failed to join club:', err.message);
            return res.status(500).json({ error: 'Failed to join club', details: err.message });
        }

        connection.release();
        return res.json({ success: true, club_id: finalClubId, attendee_id });
    } catch (error) {
        console.error('Error in /api/clubs/join:', error.message);
        return res.status(500).json({ error: error.message });
    }
});

// Check membership status for a given organizer (club) and attendee
app.get('/api/clubs/check', async (req, res) => {
    try {
        const organizer_id = req.query.organizer_id ? parseInt(req.query.organizer_id) : null;
        const attendee_id = req.query.attendee_id ? parseInt(req.query.attendee_id) : null;

        if (!organizer_id || !attendee_id) return res.status(400).json({ error: 'organizer_id and attendee_id are required' });

        const connection = await pool.getConnection();

        // Resolve club_id from organizer
        const [clubRows] = await connection.execute('SELECT club_id FROM Clubs WHERE organizer_id = ?', [organizer_id]);
        if (!clubRows || clubRows.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'Club not found for organizer' });
        }
        const club_id = clubRows[0].club_id;

        // Check club_members
        const [rows] = await connection.execute('SELECT 1 FROM Club_members WHERE club_id = ? AND attendee_id = ? LIMIT 1', [club_id, attendee_id]);
        connection.release();

        return res.json({ club_id, joined: rows && rows.length > 0 });
    } catch (err) {
        console.error('Error checking club membership:', err.message);
        return res.status(500).json({ error: err.message });
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
    const { email, password, first_name, last_name, netId, gradYear, major, categories, clubs } = req.body;
    // console.log('Received gradYear:', gradYear, 'type:', typeof gradYear); // Removed debugging console.log
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

    const connection = await poolMulti.getConnection();
    try {
        // Removed manual email existence check as stored procedure handles it.

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

        // Call sp_signup_attendee with all parameters including categories and clubs
        // The stored procedure now handles email existence check and preferences saving.
        await connection.query('CALL sp_signup_attendee(?, ?, ?, ?, ?, ?, ?, ?, ?, @p_error_message)', [
            email,
            password,
            first_name || null,
            last_name || null,
            netId || null,
            gradYear || 2026,
            major || null,
            JSON.stringify(categories || []), // p_categories_json
            JSON.stringify(clubs || [])      // p_clubs_json
        ]);

        // Read the OUT parameter
        const [outRows] = await connection.query('SELECT @p_error_message AS message');
        const message = outRows && outRows[0] ? outRows[0].message : 'Unknown result';

        if (message.toLowerCase().startsWith('error')) {
            console.error('❌ Signup conflict:', message);
            return res.status(409).json({ error: message });
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
    const { email, password, club_name, club_url, contact_email, yearFounded, categories } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

    const connection = await poolMulti.getConnection();
    try {
        // Removed manual email existence check as stored procedure handles it.

        // ensure session not in strict mode to avoid inserts failing on columns without defaults
        try {
            await connection.query('SET SESSION sql_mode = ""');
        } catch (modeErr) {
            console.debug('Could not set session sql_mode to empty string for club signup:', modeErr.message);
        }

        // Call sp_signup_club with all parameters including categories as JSON
        await connection.query('CALL sp_signup_club(?, ?, ?, ?, ?, ?, ?, @p_error_message)', [
            email,
            password,
            club_name || null,
            club_url || null,
            contact_email || null,
            yearFounded || null, // yearFounded can now be null, as per the SP definition
            JSON.stringify(categories || []) // p_categories_json
        ]);
        const [outRows] = await connection.query('SELECT @p_error_message AS message');
        const message = outRows && outRows[0] ? outRows[0].message : 'Unknown result';

        if (message.toLowerCase().startsWith('error')) {
            console.error('❌ Signup conflict:', message);
            return res.status(409).json({ error: message });
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
        // Removed manual email existence check as stored procedure is assumed to handle it.

        await connection.query('CALL sp_signup_school(?, ?, ?, ?, ?, @p_error_message)', [email, password, department || null, name || null, supervisor || null]);
        const [outRows] = await connection.query('SELECT @p_error_message AS message');
        const message = outRows && outRows[0] ? outRows[0].message : 'Unknown result';

        if (message.toLowerCase().startsWith('error')) {
            console.error('❌ Signup conflict:', message);
            return res.status(409).json({ error: message });
        }

        return res.json({ message });
    } catch (error) {
        console.error('Error during school signup:', error.message);
        return res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

app.post('/api/signup/student', async (req, res) => {
    const { email, password, first_name, last_name, netId, grad_year, major } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

    const connection = await poolMulti.getConnection();
    try {
        // Removed manual email existence check as stored procedure is assumed to handle it.

        // Relax SQL mode for this session to avoid strict-mode errors
        try {
            await connection.query('SET SESSION sql_mode = ""');
        } catch (modeErr) {
            console.debug('Could not set session sql_mode to empty string:', modeErr.message);
        }

        // Call sp_signup_student_organizer with all parameters
        await connection.query('CALL sp_signup_student_organizer(?, ?, ?, ?, ?, ?, ?, @p_error_message)', [
            email,
            password,
            first_name || null,
            last_name || null,
            netId || null,
            grad_year || 2026, 
            major || null
        ]);

        // Read OUT param
        const [outRows] = await connection.query('SELECT @p_error_message AS message');
        const message = outRows && outRows[0] ? outRows[0].message : 'Unknown result';

        if (message.toLowerCase().startsWith('error')) {
            console.error('❌ Signup conflict:', message);
            return res.status(409).json({ error: message });
        }

        return res.json({ message });
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

// NEW: Save user preferences after signup
app.post('/api/save-preferences', async (req, res) => {
    const { user_id, categories, clubs } = req.body;
    
    if (!user_id) return res.status(400).json({ error: 'User ID is required' });

    const connection = await pool.getConnection();
    try {
        // Save category preferences
        if (categories && Array.isArray(categories) && categories.length > 0) {
            // Create array of [user_id, category_id] pairs
            const categoryValues = categories.map(cat_id => [user_id, cat_id]);
            await connection.query(
                'INSERT IGNORE INTO User_categories (user_id, category_id) VALUES ?',
                [categoryValues]
            );
        }
        
        // Save club notifications
        if (clubs && Array.isArray(clubs) && clubs.length > 0) {
            // Create array of [user_id, organizer_id, remind_required] pairs
            const clubValues = clubs.map(club_id => [user_id, club_id, 1]); // 1 = remind_required
            await connection.query(
                'INSERT IGNORE INTO User_organizers_notification (user_id, organizer_id, remind_required) VALUES ?',
                [clubValues]
            );
        }
        
        res.json({ success: true, message: 'Preferences saved successfully' });
    } catch (error) {
        console.error('Error saving preferences:', error);
        res.status(500).json({ error: 'Failed to save preferences' });
    } finally {
        connection.release();
    }
});