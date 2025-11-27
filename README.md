# DKU Event Management System - MySQL Integration Guide

## Overview
This guide will help you set up the DKU Event Management System to connect to your localhost MySQL database on 127.0.0.1:3306.

## Prerequisites
- Node.js (v14 or higher)
- MySQL Server running on localhost:3306
- Database `dku_event_system` created with your schema
- Your stored procedures already created

## Backend Setup

### 1. Install Dependencies
```bash
cd /mnt/okcomputer/output
npm install
```

### 2. Configure Database Connection
Edit `backend.js` and update the database configuration:

```javascript
const dbConfig = {
    host: '127.0.0.1',
    port: 3306,
    user: 'your_mysql_username',    // Change this
    password: 'your_mysql_password', // Change this
    database: 'dku_event_system'
};
```

### 3. Test Database Connection
```bash
node test-connection.js
```

This will test your MySQL connection and verify that:
- Database is accessible
- Events table exists
- Stored procedures are available

### 4. Start the Backend Server
```bash
npm start
```

The backend server will start on port 3000. You should see:
```
✅ Database connected successfully
🚀 Server running on port 3000
📡 API endpoints available at http://localhost:3000/api
```

## Frontend Setup

### 1. Update HTML Files
The frontend HTML files are already configured to use the API. The system will automatically:
- Detect if the backend API is available
- Use real data from MySQL if connected
- Fall back to mock data if API is not available

### 2. API Integration
The frontend includes `api-client.js` which handles all API communication:
- Automatic connection detection
- Real-time filtering using stored procedures
- Error handling and fallback to mock data

## API Endpoints

### GET /api/events
Returns all events with full details from the database.

### POST /api/events/filter
Filters events using your `filter_events` stored procedure:
```json
{
    "start_date": "2025-01-01",
    "end_date": "2025-12-31",
    "event_type": "on_campus",
    "categories": ["Academic", "Career"],
    "organizers": [],
    "locations": ["Academic Building"]
}
```

### GET /api/events/:id
Returns a single event by ID.

### GET /api/categories
Returns all available categories.

### GET /api/locations
Returns all available locations.

### GET /api/organizers
Returns all available organizers.

### GET /api/health
Health check endpoint to verify database connection.

## Testing Your Setup

### 1. Test Database Connection
```bash
node test-connection.js
```

### 2. Test API Endpoints
```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Test events endpoint
curl http://localhost:3000/api/events

# Test filter endpoint
curl -X POST http://localhost:3000/api/events/filter \
  -H "Content-Type: application/json" \
  -d '{"event_type": "on_campus"}'
```

### 3. Test Stored Procedures Directly
Connect to MySQL and test your procedures:

```sql
-- Test basic filter
CALL filter_events(NULL, NULL, NULL, NULL, NULL, NULL);

-- Test with date range
CALL filter_events('2025-01-01', '2025-12-31', NULL, NULL, NULL, NULL);

-- Test with event type
CALL filter_events(NULL, NULL, 'online', NULL, NULL, NULL);

-- Test with categories
CALL filter_events(NULL, NULL, NULL, JSON_ARRAY('Academic', 'Career'), NULL, NULL);

-- Test with locations
CALL filter_events(NULL, NULL, NULL, NULL, NULL, JSON_ARRAY('Academic Building'));

-- Complex filter
CALL filter_events('2025-01-01', '2025-11-30', 'on_campus', 
                   JSON_ARRAY('Academic', 'Career'), NULL, 
                   JSON_ARRAY('Academic Building'));
```

## Troubleshooting

### Database Connection Issues
1. **Ensure MySQL is running:**
   ```bash
   mysql -u your_username -p
   ```

2. **Check database exists:**
   ```sql
   SHOW DATABASES;
   USE dku_event_system;
   SHOW TABLES;
   ```

3. **Verify stored procedures:**
   ```sql
   SHOW PROCEDURE STATUS WHERE Db = 'dku_event_system';
   ```

### Common Errors
- **"Access denied"**: Check username/password in backend.js
- **"Database not found"**: Ensure database name is correct
- **"Procedure not found"**: Run the stored procedure creation scripts
- **"Connection refused"**: Ensure MySQL is running on port 3306

### Debug Mode
Enable detailed logging in backend.js:
```javascript
// Add this to backend.js for more detailed error messages
console.log('Database config:', dbConfig);
```

## Development Tips

### Using Mock Data
If you want to develop without the database, the system automatically falls back to mock data when the API is not available.

### Adding New Features
1. Backend: Add new API endpoints in backend.js
2. Frontend: Add corresponding functions in main-api.js
3. Database: Update stored procedures if needed

### Database Schema Updates
If you modify the database schema:
1. Update the queries in backend.js
2. Update the data transformation in main-api.js
3. Test with test-connection.js

## Production Deployment

### Environment Variables
For production, use environment variables:
```bash
export DB_HOST=127.0.0.1
export DB_PORT=3306
export DB_USER=your_username
export DB_PASSWORD=your_password
export DB_NAME=dku_event_system
```

### Security Considerations
1. Use strong database passwords
2. Implement user authentication
3. Add input validation
4. Use HTTPS in production
5. Configure CORS properly

## Support
If you encounter issues:
1. Check the console logs in your browser
2. Check the backend server logs
3. Verify database connection with test-connection.js
4. Test stored procedures directly in MySQL

## File Structure
```
/mnt/okcomputer/output/
├── index.html              # Main event listing page
├── event-details.html      # Event details page
├── dashboard.html          # User dashboard
├── main-api.js            # Frontend JavaScript with API integration
├── api-client.js          # API client library
├── backend.js             # Backend server (Node.js + Express)
├── test-connection.js     # Database connection test
├── package.json           # Node.js dependencies
├── resources/             # Images and media
│   ├── hero-campus-events.jpg
│   ├── dashboard-abstract.jpg
│   └── club-activities.jpg
├── design.md              # Design documentation
├── interaction.md         # Interaction design
└── outline.md             # Project outline
```

## Next Steps
1. Set up your MySQL database with the provided schema
2. Create the stored procedures
3. Configure the backend connection
4. Test the complete system
5. Deploy to your production environment

The system is now ready to connect to your localhost MySQL database and use your stored procedures for filtering events!