// API Client for DKU Event Management System
// Handles all backend communication

class APIClient {
    constructor(baseURL = 'http://localhost:3000/api') {
        this.baseURL = baseURL;
        this.isConnected = false;
    }

    // Test API connection
    async testConnection() {
        try {
            const response = await fetch(`${this.baseURL}/health`);
            const data = await response.json();
            this.isConnected = data.status === 'healthy';
            return this.isConnected;
        } catch (error) {
            console.error('API connection failed:', error);
            this.isConnected = false;
            return false;
        }
    }

    // Get all events
    async getEvents() {
        try {
            const response = await fetch(`${this.baseURL}/events`);
            if (!response.ok) throw new Error('Failed to fetch events');
            return await response.json();
        } catch (error) {
            console.error('Error fetching events:', error);
            return [];
        }
    }

    // Get single event by ID
    async getEvent(id) {
        try {
            const response = await fetch(`${this.baseURL}/events/${id}`);
            if (!response.ok) throw new Error('Failed to fetch event');
            return await response.json();
        } catch (error) {
            console.error('Error fetching event:', error);
            return null;
        }
    }

    // Filter events using stored procedure
    async filterEvents(filters) {
        try {
            const response = await fetch(`${this.baseURL}/events/filter`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(filters)
            });
            
            if (!response.ok) throw new Error('Failed to filter events');
            return await response.json();
        } catch (error) {
            console.error('Error filtering events:', error);
            return [];
        }
    }

    // Get all categories
    async getCategories() {
        try {
            const response = await fetch(`${this.baseURL}/categories`);
            if (!response.ok) throw new Error('Failed to fetch categories');
            return await response.json();
        } catch (error) {
            console.error('Error fetching categories:', error);
            return [];
        }
    }

    // Get all locations
    async getLocations() {
        try {
            const response = await fetch(`${this.baseURL}/locations`);
            if (!response.ok) throw new Error('Failed to fetch locations');
            return await response.json();
        } catch (error) {
            console.error('Error fetching locations:', error);
            return [];
        }
    }

    // Get all organizers
    async getOrganizers() {
        try {
            const response = await fetch(`${this.baseURL}/all-organizers`); // Changed to /all-organizers
            if (!response.ok) throw new Error('Failed to fetch organizers');
            return await response.json();
        } catch (error) {
            console.error('Error fetching organizers:', error);
            return [];
        }
    }

    // Get single organizer by ID
    async getOrganizer(id) {
        try {
            const response = await fetch(`${this.baseURL}/organizers/${id}`);
            if (!response.ok) throw new Error('Failed to fetch organizer');
            return await response.json();
        } catch (error) {
            console.error('Error fetching organizer:', error);
            return null;
        }
    }

    // Get events by organizer ID
    async getEventsByOrganizer(organizerId) {
        try {
            const response = await fetch(`${this.baseURL}/organizers/${organizerId}/events`);
            if (!response.ok) throw new Error('Failed to fetch events by organizer');
            return await response.json();
        } catch (error) {
            console.error('Error fetching events by organizer:', error);
            return [];
        }
    }

    // Join a club (attendee joins club by organizer_id or club_id)
    async joinClub(payload) {
        try {
            const response = await fetch(`${this.baseURL}/clubs/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            // return parsed server response even when status is not 200 so UI can display the message
            const json = await response.json().catch(() => ({}));
            return { ok: response.ok, status: response.status, json };
        } catch (error) {
            console.error('Error joining club:', error);
            return { ok: false, error: error.message };
        }
    }

    // Check if attendee already joined a club (using organizer_id)
    async checkClubMembership(organizerId, attendeeId) {
        try {
            const params = new URLSearchParams({ organizer_id: organizerId, attendee_id: attendeeId });
            const response = await fetch(`${this.baseURL}/clubs/check?${params.toString()}`);
            if (!response.ok) throw new Error('Failed to check club membership');
            return await response.json();
        } catch (error) {
            console.error('Error checking club membership:', error);
            return { ok: false, error: error.message };
        }
    }
}

// Create global API client instance
window.apiClient = new APIClient();

// Initialize API client on page load
document.addEventListener('DOMContentLoaded', async () => {
    const isConnected = await window.apiClient.testConnection();
    if (isConnected) {
        console.log('✅ Connected to backend API');
    } else {
        console.log('⚠️  Using mock data (backend not connected)');
    }
});