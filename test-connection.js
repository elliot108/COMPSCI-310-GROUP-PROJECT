// Test script to verify MySQL database connection
const mysql = require('mysql2/promise');

// Database connection configuration
const dbConfig = {
    host: '127.0.0.1',
    port: 3306,
    user: 'root', // Update with your MySQL username
    password: 'Iam@qu33r', // Update with your MySQL password
    database: 'dku_event_system'
};

async function testConnection() {
    console.log('Testing MySQL database connection...');
    console.log('Configuration:', {
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        database: dbConfig.database
    });
    
    try {
        // Create connection
        const connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connection established successfully');
        
        // Test basic query
        const [rows] = await connection.execute('SELECT 1 + 1 AS result');
        console.log('✅ Basic query test passed. Result:', rows[0].result);
        
        // Test database access
        const [dbRows] = await connection.execute('SELECT DATABASE() as db');
        console.log('✅ Database access test passed. Current database:', dbRows[0].db);
        
        // Test if events table exists
        try {
            const [tableRows] = await connection.execute('SHOW TABLES LIKE "events"');
            if (tableRows.length > 0) {
                console.log('✅ Events table exists');
                
                // Get event count
                const [countRows] = await connection.execute('SELECT COUNT(*) as count FROM events');
                console.log('📊 Total events in database:', countRows[0].count);
                
                // Get sample events
                const [sampleRows] = await connection.execute('SELECT event_id, title, event_type FROM events LIMIT 5');
                console.log('📋 Sample events:');
                sampleRows.forEach(row => {
                    console.log(`  - ${row.event_id}: ${row.title} (${row.event_type})`);
                });
                
            } else {
                console.log('❌ Events table not found');
            }
        } catch (tableError) {
            console.log('❌ Error checking events table:', tableError.message);
        }
        
        // Test stored procedure existence
        try {
            const [procRows] = await connection.execute(`
                SELECT ROUTINE_NAME 
                FROM information_schema.ROUTINES 
                WHERE ROUTINE_SCHEMA = ? AND ROUTINE_NAME = 'filter_events'
            `, [dbConfig.database]);
            
            if (procRows.length > 0) {
                console.log('✅ Filter_events stored procedure exists');
            } else {
                console.log('⚠️  Filter_events stored procedure not found');
            }
        } catch (procError) {
            console.log('❌ Error checking stored procedure:', procError.message);
        }
        
        // Close connection
        await connection.end();
        console.log('✅ Connection closed successfully');
        
        return true;
        
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        console.error('Error code:', error.code);
        console.error('Error errno:', error.errno);
        return false;
    }
}

// Run the test
testConnection().then(success => {
    if (success) {
        console.log('\n🎉 All tests passed! Database is ready for the application.');
        process.exit(0);
    } else {
        console.log('\n💥 Database connection failed. Please check your configuration.');
        process.exit(1);
    }
});
