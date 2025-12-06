# DKU Event Management System

## Overview

The DKU Event Management System is a comprehensive platform designed to manage events, organizers, attendees, and clubs within the Duke Kunshan University ecosystem. It features a Node.js Express backend, a dynamic frontend, and integrates with a MySQL database for data storage and retrieval, utilizing stored procedures for efficient data operations.

## Getting Started

Follow these steps to set up and run the DKU Event Management System locally.

### Prerequisites

*   **Node.js**: v14 or higher
*   **MySQL Server**: Running on `localhost:3306`
*   **Database**: A MySQL database named `dku_event_system` with your defined schema and stored procedures already created.

### 1. Backend Setup

1.  **Install Dependencies**: Navigate to the project root and install Node.js dependencies:
    ```bash
    npm install
    ```
2.  **Configure Database Connection**: Open `backend.js` and update the `dbConfig` with your MySQL credentials:
    ```javascript
    const dbConfig = {
        host: '127.0.0.1',
        port: 3306,
        user: 'your_mysql_username',    // Update this
        password: 'your_mysql_password', // Update this
        database: 'dku_event_system'
    };
    ```
3.  **Start the Server**:
    ```bash
    npm start
    ```
    You should see output similar to this:
    ```
    ✅ Database connected successfully
    🚀 Server running on port 3000
    📡 API endpoints available at http://localhost:3000/api
    ```

### 2. Frontend Setup

The frontend HTML files (`index.html`, `event-details.html`, `dashboard.html`, `signup.html`, `login.html`) are pre-configured to interact with the backend API. They automatically detect API availability and use real data from MySQL, falling back to mock data if the API is not accessible.

No additional setup is typically required for the frontend. Just open `index.html` (or any other HTML file) in your browser after the backend server is running.

## API Endpoints

The backend provides the following API endpoints:

| Method | Endpoint                     | Description                                            |
| :----- | :--------------------------- | :----------------------------------------------------- |
| `GET`  | `/api/events`                | Retrieve all events with full details.                 |
| `POST` | `/api/events/filter`         | Filter events based on criteria (uses `filter_events` stored procedure). |
| `GET`  | `/api/events/:id`            | Retrieve a single event by ID.                         |
| `GET`  | `/api/categories`            | Retrieve all available event categories.               |
| `GET`  | `/api/locations`             | Retrieve all available event locations.                |
| `GET`  | `/api/organizers`            | Retrieve all available organizers.                     |
| `GET`  | `/api/organizers/:id`        | Retrieve details for a specific organizer.             |
| `GET`  | `/api/organizers/:id/events` | Retrieve events organized by a specific organizer.     |
| `POST` | `/api/clubs/join`            | Allow an attendee to join a club.                      |
| `GET`  | `/api/clubs/check`           | Check if an attendee is a member of a club.            |
| `GET`  | `/api/all-organizers`        | Retrieve all organizers with names for filtering.      |
| `GET`  | `/api/users/:id`             | Retrieve basic profile information for a user.         |
| `POST` | `/api/login`                 | User login (uses `fn_user_login` stored function).     |
| `POST` | `/api/signup/attendee`       | Signup for a new attendee account (uses `sp_signup_attendee` stored procedure). |
| `POST` | `/api/signup/club`           | Signup for a new club organizer account (uses `sp_signup_club` stored procedure). |
| `POST` | `/api/signup/school`         | Signup for a new school organizer account (uses `sp_signup_school` stored procedure). |
| `POST` | `/api/signup/student`        | Signup for a new student organizer account (uses `sp_signup_student_organizer` stored procedure). |
| `POST` | `/api/save-preferences`      | Save user category and club preferences.               |
| `GET`  | `/api/health`                | Health check endpoint to verify database connection.   |

## Testing

### 1. Verify Database Connection

Ensure your MySQL database is properly configured and accessible:
```bash
node test-connection.js
```

### 2. Test API Endpoints

Use `curl` or a tool like Postman to test the API:

```bash
# Test health endpoint
curl http://localhost:3000/api/health

# Test events endpoint
curl http://localhost:3000/api/events

# Test filter endpoint (example)
curl -X POST http://localhost:3000/api/events/filter \
  -H "Content-Type: application/json" \
  -d '{"event_type": "on_campus"}'
```

### 3. Test Stored Procedures Directly (MySQL Client)

Connect to your MySQL database and execute stored procedures directly to verify their logic:

```sql
-- Example: Test basic event filter
CALL filter_events(NULL, NULL, NULL, NULL, NULL, NULL);

-- Example: Test attendee signup
CALL sp_signup_attendee('test@example.com', 'password123', 'Test', 'User', 'testnetid', 2026, 'CS', '[]', '[]', @p_error_message);
SELECT @p_error_message;
```

## Troubleshooting

*   **Database Connection Issues**:
    *   Verify MySQL server is running.
    *   Check `backend.js` for correct `dbConfig` (host, port, user, password, database name).
    *   Ensure the `dku_event_system` database and all required tables/procedures exist.
*   **"Graduation year is required" error**:
    *   This error originates from your MySQL database. You need to inspect the `sp_signup_attendee` stored procedure and the `grad_year` column in the `Attendees` table. Ensure the column allows `NULL` values if `grad_year` is intended to be optional, or adjust the stored procedure's validation logic.
*   **"Procedure not found"**: Ensure your stored procedures are created in the `dku_event_system` database.

## Development Tips

*   The system automatically falls back to mock data if the backend API is unreachable, allowing frontend development independently.
*   For detailed logging, add `console.log('Database config:', dbConfig);` in `backend.js`.
*   Remember to update relevant queries and data transformations in `backend.js` if you modify your database schema.

## File Structure

```
.
├── index.html              # Main event listing page
├── event-details.html      # Event details page
├── dashboard.html          # User dashboard
├── signup.html             # User signup page
├── login.html              # User login page
├── main-api.js             # Frontend JavaScript with API integration
├── api-client.js           # API client library
├── auth.js                 # Authentication helper functions
├── backend.js              # Backend server (Node.js + Express)
├── test-connection.js      # Database connection test
├── package.json            # Node.js dependencies
├── README.md               # Project documentation
└── resources/              # Images and media
    ├── hero-campus-events.jpg
    ├── dashboard-abstract.jpg
    └── club-activities.jpg
```

## Next Steps

1.  **Finalize MySQL Setup**: Ensure your `dku_event_system` database, schema, and all stored procedures (especially `sp_signup_attendee` and `ValidateGradYear`) are correctly configured to handle graduation year data as intended.
2.  **Test Thoroughly**: Verify all API endpoints and signup flows.
3.  **Deploy**: Prepare for deployment to your production environment.
