// Event Management System - Main JavaScript File with API Integration

// Global state management
const AppState = {
    events: { upcoming: [], past: [] }, // Separate upcoming and past events
    filteredEvents: { upcoming: [], past: [] },
    allCategories: [],
    allOrganizers: [],
    allLocations: [],
    currentFilters: {
        search: '',
        dateRange: { start: null, end: null },
        eventTypes: [],
        categories: [],
        organizers: [], // Changed to array for multiple selection
        locations: [],   // Changed to array for multiple selection
        costRange: { min: null, max: null }
    },
    currentSort: { upcoming: 'date-asc', past: 'date-desc' }, // Separate sorts
    currentPage: { upcoming: 1, past: 1 },
    eventsPerPage: 12,
    isLoading: false,
    useMockData: false // Flag to use mock data if API is not available
};

// Mock event data (fallback when API is not available)
const mockEvents = [
    {
        event_id: 1,
        title: "AI and Machine Learning Workshop Series",
        description: "Comprehensive workshop series covering AI fundamentals, neural networks, and practical applications using TensorFlow and PyTorch.",
        start_date: "2024-12-15",
        end_date: "2024-12-15",
        start_time: "14:00",
        end_time: "17:00",
        location: {
            building: "Innovation Center",
            label: "Main Campus, Innovation Center",
            capacity: 60
        },
        organizer: {
            name: "AI Research Club",
            type: "club",
            contact: "ai.club@dku.edu"
        },
        categories: ["academic", "tech"],
        event_type: "on_campus",
        cost: 0,
        max_participants: 60,
        application_required: false,
        perks: "Certificate of completion, networking opportunities, learning resources",
        flyer_url: "resources/club-activities.jpg",
        online_link: null,
        application_deadline: null,
        popularity: 48
    },
    {
        event_id: 2,
        title: "Data Science Fundamentals Workshop",
        description: "Learn the basics of data analysis, visualization techniques, and statistical methods for data-driven decision making.",
        start_date: "2024-12-18",
        end_date: "2024-12-18",
        start_time: "10:00",
        end_time: "12:00",
        location: {
            building: "Library",
            label: "Library, Room 205",
            capacity: 40
        },
        organizer: {
            name: "Data Science Society",
            type: "club",
            contact: "data.society@dku.edu"
        },
        categories: ["academic", "tech"],
        event_type: "on_campus",
        cost: 0,
        max_participants: 40,
        application_required: true,
        perks: "Hands-on experience with real datasets, course materials",
        flyer_url: "resources/dashboard-abstract.jpg",
        online_link: null,
        application_deadline: "2024-12-16",
        popularity: 32
    },
    {
        event_id: 3,
        title: "Future of AI in Healthcare Seminar",
        description: "Explore how artificial intelligence is revolutionizing medical diagnosis, treatment planning, and healthcare delivery.",
        start_date: "2024-12-20",
        end_date: "2024-12-20",
        start_time: "15:00",
        end_time: "16:30",
        location: {
            building: "Auditorium",
            label: "Main Auditorium",
            capacity: 200
        },
        organizer: {
            name: "Medical Ethics Department",
            type: "school",
            contact: "med.ethics@dku.edu"
        },
        categories: ["academic", "career"],
        event_type: "on_campus",
        cost: 0,
        max_participants: 200,
        application_required: false,
        perks: "Professional networking, industry insights",
        flyer_url: "resources/hero-campus-events.jpg",
        online_link: null,
        application_deadline: null,
        popularity: 67
    },
    {
        event_id: 4,
        title: "AI Innovation Challenge Hackathon",
        description: "24-hour hackathon bringing together students to solve real-world problems using artificial intelligence and machine learning.",
        start_date: "2025-01-05",
        end_date: "2025-01-06",
        start_time: "09:00",
        end_time: "09:00",
        location: {
            building: "Innovation Center",
            label: "Innovation Center, Main Hall",
            capacity: 100
        },
        organizer: {
            name: "Tech Innovation Club",
            type: "club",
            contact: "tech.innovation@dku.edu"
        },
        categories: ["tech", "career"],
        event_type: "on_campus",
        cost: 0,
        max_participants: 100,
        application_required: true,
        perks: "Cash prizes, internship opportunities, mentorship",
        flyer_url: "resources/club-activities.jpg",
        online_link: null,
        application_deadline: "2025-01-03",
        popularity: 89
    },
    {
        event_id: 5,
        title: "International Cultural Festival",
        description: "Celebrate diversity with performances, food, and cultural exhibitions from around the world.",
        start_date: "2025-01-15",
        end_date: "2025-01-15",
        start_time: "18:00",
        end_time: "22:00",
        location: {
            building: "Student Center",
            label: "Student Center Ballroom",
            capacity: 300
        },
        organizer: {
            name: "International Student Association",
            type: "student",
            contact: "isa@dku.edu"
        },
        categories: ["cultural", "social"],
        event_type: "on_campus",
        cost: 0,
        max_participants: 300,
        application_required: false,
        perks: "Cultural exchange, international cuisine, performances",
        flyer_url: "resources/hero-campus-events.jpg",
        online_link: null,
        application_deadline: null,
        popularity: 156
    },
    {
        event_id: 6,
        title: "Sustainability Conference 2024",
        description: "Two-day conference focusing on environmental sustainability, green technology, and climate action initiatives.",
        start_date: "2024-12-22",
        end_date: "2024-12-23",
        start_time: "09:00",
        end_time: "17:00",
        location: {
            building: "Main Auditorium",
            label: "Main Campus, Auditorium",
            capacity: 250
        },
        organizer: {
            name: "Environmental Science Department",
            type: "school",
            contact: "env.sci@dku.edu"
        },
        categories: ["academic", "volunteer"],
        event_type: "on_campus",
        cost: 0,
        max_participants: 250,
        application_required: true,
        perks: "Professional certificate, networking lunch, conference materials",
        flyer_url: "resources/dashboard-abstract.jpg",
        online_link: null,
        application_deadline: "2024-12-20",
        popularity: 73
    },
    {
        event_id: 7,
        title: "Winter Networking Mixer",
        description: "Professional networking event connecting students with industry leaders and alumni.",
        start_date: "2025-01-10",
        end_date: "2025-01-10",
        start_time: "19:00",
        end_time: "22:00",
        location: {
            building: "Student Center",
            label: "Student Center Ballroom",
            capacity: 150
        },
        organizer: {
            name: "Career Services",
            type: "school",
            contact: "career@dku.edu"
        },
        categories: ["career", "social"],
        event_type: "on_campus",
        cost: 0,
        max_participants: 150,
        application_required: true,
        perks: "Professional networking, resume review, industry connections",
        flyer_url: "resources/club-activities.jpg",
        online_link: null,
        application_deadline: "2025-01-08",
        popularity: 94
    },
    {
        event_id: 8,
        title: "Blockchain Technology Seminar",
        description: "Introduction to blockchain technology, cryptocurrency, and decentralized applications.",
        start_date: "2024-12-25",
        end_date: "2024-12-25",
        start_time: "14:00",
        end_time: "16:00",
        location: {
            building: "Online",
            label: "Virtual Event",
            capacity: 500
        },
        organizer: {
            name: "FinTech Club",
            type: "club",
            contact: "fintech@dku.edu"
        },
        categories: ["tech", "academic"],
        event_type: "online",
        cost: 0,
        max_participants: 500,
        application_required: false,
        perks: "Digital certificate, access to recording, resource materials",
        flyer_url: "resources/dashboard-abstract.jpg",
        online_link: "https://dku.zoom.us/webinar/blockchain2024",
        application_deadline: null,
        popularity: 45
    }
];

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    // Check if API is available
    const apiAvailable = await checkAPIAvailability();
    
    if (apiAvailable) {
        console.log('✅ Using real API data');
        AppState.useMockData = false;
        await loadRealData();
    } else {
        console.log('⚠️  Using mock data (API not available)');
        AppState.useMockData = true;
        loadMockData();
    }
    
    // Initialize components
    initializeAnimations();
    initializeFilters();
    initializeEventDisplay();
    initializeSearch();
    initializeParticleBackground();
    
    // Initial render
    renderEvents();
    updateResultsCount();
    
    console.log('DKU Event Management System initialized');
}

async function checkAPIAvailability() {
    try {
        const response = await fetch('http://localhost:3000/api/health');
        const data = await response.json();
        return data.status === 'healthy';
    } catch (error) {
        return false;
    }
}

async function loadRealData() {
    try {
        // Load events from API
        const eventsResponse = await window.apiClient.filterEvents({}); // Fetch all events
        
        // Load categories, locations, and organizers
        const [categories, locations, organizers] = await Promise.all([
            window.apiClient.getCategories(),
            window.apiClient.getLocations(),
            window.apiClient.getOrganizers() // get all organizers for filter
        ]);
        
        AppState.events.upcoming = eventsResponse.upcoming || [];
        AppState.events.past = eventsResponse.past || [];
        AppState.filteredEvents.upcoming = [...AppState.events.upcoming];
        AppState.filteredEvents.past = [...AppState.events.past];
        
        AppState.allCategories = categories;
        AppState.allLocations = locations;
        AppState.allOrganizers = organizers;

        // Populate filter dropdowns/inputs with real data
        populateFilterOptions(AppState.allCategories, AppState.allLocations, AppState.allOrganizers);
        
    } catch (error) {
        console.error('Error loading real data:', error);
        // Fallback to mock data
        loadMockData();
    }
}

function loadMockData() {
    const now = new Date();
    const mockUpcoming = mockEvents.filter(event => new Date(`${event.start_date}T${event.start_time}`) > now);
    const mockPast = mockEvents.filter(event => new Date(`${event.start_date}T${event.start_time}`) <= now);

    AppState.events.upcoming = [...mockUpcoming];
    AppState.events.past = [...mockPast];
    AppState.filteredEvents.upcoming = [...mockUpcoming];
    AppState.filteredEvents.past = [...mockPast];
    
    // Populate filter dropdowns with mock data
    const categories = ['academic', 'cultural', 'sports', 'social', 'career', 'volunteer', 'arts', 'tech'];
    const locations = [
        { building: 'Main Campus', label: 'Main Campus' },
        { building: 'Student Center', label: 'Student Center' },
        { building: 'Library', label: 'Library' },
        { building: 'Sports Complex', label: 'Sports Complex' },
        { building: 'Auditorium', label: 'Auditorium' },
        { building: 'Online', label: 'Online'}
    ];
    const organizers = [
        { organizer_id: 1, name: 'AI Research Club', type: 'club' },
        { organizer_id: 2, name: 'Data Science Society', type: 'club' },
        { organizer_id: 3, name: 'Medical Ethics Department', type: 'school' },
        { organizer_id: 4, name: 'Tech Innovation Club', type: 'club' },
        { organizer_id: 5, name: 'International Student Association', type: 'student' },
        { organizer_id: 6, name: 'Environmental Science Department', type: 'school' },
        { organizer_id: 7, name: 'Career Services', type: 'school' },
        { organizer_id: 8, name: 'FinTech Club', type: 'club' }
    ];
    
    AppState.allCategories = categories;
    AppState.allLocations = locations;
    AppState.allOrganizers = organizers;

    populateFilterOptions(AppState.allCategories, AppState.allLocations, AppState.allOrganizers);
}

function populateFilterOptions(categories, locations, organizers) {
    // Populate category filter
    const categorySelect = document.getElementById('categoryFilter');
    if (categorySelect) {
        categorySelect.innerHTML = categories.map(category => 
            `<option value="${category}">${category}</option>`
        ).join('');
    }
    
    // Populate location filter
    const locationSelect = document.getElementById('locationFilter');
    if (locationSelect) {
        locationSelect.innerHTML = '<option value="">All Locations</option>' +
            locations.map(location => 
                `<option value="${location.label}">${location.label}</option>`
            ).join('');
    }
    
    // Populate organizer filter
    const organizerSelect = document.getElementById('organizerFilter');
    if (organizerSelect) {
        organizerSelect.innerHTML = '<option value="">All Organizers</option>' +
            organizers.map(organizer => 
                `<option value="${organizer.name}">${organizer.name}</option>`
            ).join('');
    }
}

// Animation initialization
function initializeAnimations() {
    // Reveal animations on scroll
    const revealElements = document.querySelectorAll('.reveal-up');
    
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    revealElements.forEach(element => {
        revealObserver.observe(element);
    });
    
    // Animate stats on hero section
    animateStats();
}

function animateStats() {
    const stats = [
        { id: 'totalEvents', target: AppState.events.upcoming.length + AppState.events.past.length, duration: 2000 },
        { id: 'activeEvents', target: AppState.events.upcoming.filter(e => new Date(e.start_date) >= new Date()).length, duration: 1500 },
        { id: 'totalStudents', target: 1847, duration: 2500 }
    ];
    
    stats.forEach(stat => {
        const element = document.getElementById(stat.id);
        if (element) {
            animateNumber(element, 0, stat.target, stat.duration);
        }
    });
}

function animateNumber(element, start, end, duration) {
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const current = Math.floor(start + (end - start) * progress);
        element.textContent = current.toLocaleString();
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

// Particle background using p5.js
function initializeParticleBackground() {
    const container = document.getElementById('particle-container');
    if (!container) return;
    
    new p5((p) => {
        let particles = [];
        const numParticles = 50;
        
        p.setup = function() {
            const canvas = p.createCanvas(container.offsetWidth, container.offsetHeight);
            canvas.parent(container);
            
            // Create particles
            for (let i = 0; i < numParticles; i++) {
                particles.push({
                    x: p.random(p.width),
                    y: p.random(p.height),
                    vx: p.random(-0.5, 0.5),
                    vy: p.random(-0.5, 0.5),
                    size: p.random(2, 6),
                    opacity: p.random(0.1, 0.3)
                });
            }
        };
        
        p.draw = function() {
            p.clear();
            
            // Update and draw particles
            particles.forEach(particle => {
                // Update position
                particle.x += particle.vx;
                particle.y += particle.vy;
                
                // Wrap around edges
                if (particle.x < 0) particle.x = p.width;
                if (particle.x > p.width) particle.x = 0;
                if (particle.y < 0) particle.y = p.height;
                if (particle.y > p.height) particle.y = 0;
                
                // Draw particle
                p.fill(255, 255, 255, particle.opacity * 255);
                p.noStroke();
                p.ellipse(particle.x, particle.y, particle.size);
            });
            
            // Draw connections
            particles.forEach((particle, i) => {
                particles.slice(i + 1).forEach(other => {
                    const distance = p.dist(particle.x, particle.y, other.x, other.y);
                    if (distance < 100) {
                        const opacity = p.map(distance, 0, 100, 0.1, 0);
                        p.stroke(255, 255, 255, opacity * 255);
                        p.strokeWeight(1);
                        p.line(particle.x, particle.y, other.x, other.y);
                    }
                });
            });
        };
        
        p.windowResized = function() {
            p.resizeCanvas(container.offsetWidth, container.offsetHeight);
        };
    });
}

// Filter functionality
function initializeFilters() {
    // Date range filters
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    if (startDateInput && endDateInput) {
        startDateInput.addEventListener('change', handleDateFilterChange);
        endDateInput.addEventListener('change', handleDateFilterChange);
    }
    
    // Event type filters
    const eventTypeFilters = document.querySelectorAll('.event-type-filter');
    eventTypeFilters.forEach(filter => {
        filter.addEventListener('change', handleEventTypeFilterChange);
    });
    
    // Category filter
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', handleCategoryFilterChange);
    }
    
    // Organizer filter
    const organizerFilter = document.getElementById('organizerFilter');
    if (organizerFilter) {
        organizerFilter.addEventListener('change', handleOrganizerFilterChange);
    }
    
    // Location filter
    const locationFilter = document.getElementById('locationFilter');
    if (locationFilter) {
        locationFilter.addEventListener('change', handleLocationFilterChange);
    }
    
    // Cost range filters
    const minCostInput = document.getElementById('minCost');
    const maxCostInput = document.getElementById('maxCost');
    
    if (minCostInput && maxCostInput) {
        minCostInput.addEventListener('input', handleCostFilterChange);
        maxCostInput.addEventListener('input', handleCostFilterChange);
    }
    
    // Filter action buttons
    const applyFiltersBtn = document.getElementById('applyFilters');
    const clearFiltersBtn = document.getElementById('clearFilters');
    
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', applyFilters);
    }
    
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', clearAllFilters);
    }
}

function handleDateFilterChange() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    AppState.currentFilters.dateRange = {
        start: startDate || null,
        end: endDate || null
    };
    
    applyFilters();
}

function handleEventTypeFilterChange() {
    const selectedTypes = Array.from(document.querySelectorAll('.event-type-filter:checked'))
        .map(cb => cb.value);
    
    AppState.currentFilters.eventTypes = selectedTypes;
    applyFilters();
}

function handleCategoryFilterChange() {
    const categorySelect = document.getElementById('categoryFilter');
    AppState.currentFilters.categories = Array.from(categorySelect.selectedOptions).map(option => option.value);
    applyFilters();
}

function handleOrganizerFilterChange() {
    const organizerSelect = document.getElementById('organizerFilter');
    AppState.currentFilters.organizers = Array.from(organizerSelect.selectedOptions).map(option => option.value);
    applyFilters();
}

function handleLocationFilterChange() {
    const locationSelect = document.getElementById('locationFilter');
    AppState.currentFilters.locations = Array.from(locationSelect.selectedOptions).map(option => option.value);
    applyFilters();
}

function handleCostFilterChange() {
    const minCost = parseInt(document.getElementById('minCost').value) || null;
    const maxCost = parseInt(document.getElementById('maxCost').value) || null;
    
    AppState.currentFilters.costRange = { min: minCost, max: maxCost };
    applyFilters();
}

async function applyFilters() {
    showLoadingState();
    
    try {
        let filteredData = { upcoming: [], past: [] };
        
        if (AppState.useMockData) {
            // Use local filtering for mock data
            filteredData = filterEventsLocally();
        } else {
            // Use API for real data
            filteredData = await filterEventsViaAPI();
        }
        
        AppState.filteredEvents.upcoming = filteredData.upcoming || [];
        AppState.filteredEvents.past = filteredData.past || [];
        
        AppState.currentPage.upcoming = 1;
        AppState.currentPage.past = 1;
        
        renderEvents();
        updateResultsCount();
        updateActiveFiltersDisplay();
        
    } catch (error) {
        console.error('Error applying filters:', error);
        showNotification('Error applying filters', 'error');
    } finally {
        hideLoadingState();
    }
}

function filterEventsLocally() {
    const now = new Date();
    let filteredUpcoming = AppState.events.upcoming.filter(event => new Date(`${event.start_date}T${event.start_time}`) > now);
    let filteredPast = AppState.events.past.filter(event => new Date(`${event.start_date}T${event.start_time}`) <= now);
    
    // Apply search filter
    if (AppState.currentFilters.search) {
        const searchTerm = AppState.currentFilters.search.toLowerCase();
        filteredUpcoming = filteredUpcoming.filter(event => 
            event.title.toLowerCase().includes(searchTerm) ||
            event.description.toLowerCase().includes(searchTerm) ||
            (event.organizer && event.organizer.some(org => org.name.toLowerCase().includes(searchTerm)))
        );
        filteredPast = filteredPast.filter(event => 
            event.title.toLowerCase().includes(searchTerm) ||
            event.description.toLowerCase().includes(searchTerm) ||
            (event.organizer && event.organizer.some(org => org.name.toLowerCase().includes(searchTerm)))
        );
    }
    
    // Apply date range filter
    if (AppState.currentFilters.dateRange.start || AppState.currentFilters.dateRange.end) {
        const filterByDate = (event) => {
            const eventDate = new Date(event.start_date);
            const startDate = AppState.currentFilters.dateRange.start ? new Date(AppState.currentFilters.dateRange.start) : null;
            const endDate = AppState.currentFilters.dateRange.end ? new Date(AppState.currentFilters.dateRange.end) : null;
            
            if (startDate && eventDate < startDate) return false;
            if (endDate && eventDate > endDate) return false;
            
            return true;
        };
        filteredUpcoming = filteredUpcoming.filter(filterByDate);
        filteredPast = filteredPast.filter(filterByDate);
    }
    
    // Apply event type filter
    if (AppState.currentFilters.eventTypes.length > 0) {
        const filterByType = (event) => AppState.currentFilters.eventTypes.includes(event.event_type);
        filteredUpcoming = filteredUpcoming.filter(filterByType);
        filteredPast = filteredPast.filter(filterByType);
    }
    
    // Apply category filter
    if (AppState.currentFilters.categories.length > 0) {
        const filterByCategory = (event) => event.categories.some(category => AppState.currentFilters.categories.includes(category));
        filteredUpcoming = filteredUpcoming.filter(filterByCategory);
        filteredPast = filteredPast.filter(filterByCategory);
    }
    
    // Apply organizer filter
    if (AppState.currentFilters.organizers.length > 0) {
        const filterByOrganizer = (event) => event.organizer.some(org => AppState.currentFilters.organizers.includes(org.name));
        filteredUpcoming = filteredUpcoming.filter(filterByOrganizer);
        filteredPast = filteredPast.filter(filterByOrganizer);
    }
    
    // Apply location filter
    if (AppState.currentFilters.locations.length > 0) {
        const filterByLocation = (event) => AppState.currentFilters.locations.includes(event.location.label);
        filteredUpcoming = filteredUpcoming.filter(filterByLocation);
        filteredPast = filteredPast.filter(filterByLocation);
    }
    
    // Apply cost range filter
    if (AppState.currentFilters.costRange.min !== null || AppState.currentFilters.costRange.max !== null) {
        const filterByCost = (event) => {
            const minCost = AppState.currentFilters.costRange.min;
            const maxCost = AppState.currentFilters.costRange.max;
            
            if (minCost !== null && event.cost < minCost) return false;
            if (maxCost !== null && event.cost > maxCost) return false;
            
            return true;
        };
        filteredUpcoming = filteredUpcoming.filter(filterByCost);
        filteredPast = filteredPast.filter(filterByCost);
    }
    
    return { upcoming: filteredUpcoming, past: filteredPast };
}

async function filterEventsViaAPI() {
    try {
        const filters = {
            start_date: AppState.currentFilters.dateRange.start,
            end_date: AppState.currentFilters.dateRange.end,
            event_type: AppState.currentFilters.eventTypes.length > 0 ? AppState.currentFilters.eventTypes[0] : null, // Send only the first selected type
            categories: AppState.currentFilters.categories,
            organizers: AppState.currentFilters.organizers,
            locations: AppState.currentFilters.locations
        };
        
        const response = await window.apiClient.filterEvents(filters);
        
        if (!response.ok) throw new Error('Failed to filter events');
        
        return await response.json();
        
    } catch (error) {
        console.error('API filter error:', error);
        // Fallback to local filtering
        return filterEventsLocally();
    }
}

function clearAllFilters() {
    // Reset filter state
    AppState.currentFilters = {
        search: '',
        dateRange: { start: null, end: null },
        eventTypes: [],
        categories: [],
        organizers: [],
        locations: [],
        costRange: { min: null, max: null }
    };
    
    // Clear form inputs
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('globalSearch').value = '';

    // Clear multi-selects
    const categorySelect = document.getElementById('categoryFilter');
    if (categorySelect) Array.from(categorySelect.options).forEach(option => option.selected = false);
    const organizerSelect = document.getElementById('organizerFilter');
    if (organizerSelect) Array.from(organizerSelect.options).forEach(option => option.selected = false);
    const locationSelect = document.getElementById('locationFilter');
    if (locationSelect) Array.from(locationSelect.options).forEach(option => option.selected = false);

    document.getElementById('minCost').value = '';
    document.getElementById('maxCost').value = '';
    
    // Uncheck event type filters
    document.querySelectorAll('.event-type-filter').forEach(cb => {
        cb.checked = false;
    });
    
    // Reset filtered events
    AppState.filteredEvents.upcoming = [...AppState.events.upcoming];
    AppState.filteredEvents.past = [...AppState.events.past];
    AppState.currentPage.upcoming = 1;
    AppState.currentPage.past = 1;
    
    renderEvents();
    updateResultsCount();
    updateActiveFiltersDisplay();
}

function updateActiveFiltersDisplay() {
    const activeFiltersContainer = document.getElementById('activeFilters');
    const filterTagsContainer = document.getElementById('filterTags');
    
    if (!activeFiltersContainer || !filterTagsContainer) return;
    
    const activeFilters = [];
    
    // Check each filter type
    if (AppState.currentFilters.search) {
        activeFilters.push({ type: 'Search', value: AppState.currentFilters.search });
    }
    
    if (AppState.currentFilters.dateRange.start || AppState.currentFilters.dateRange.end) {
        const startStr = AppState.currentFilters.dateRange.start ? new Date(AppState.currentFilters.dateRange.start).toDateString() : 'Any';
        const endStr = AppState.currentFilters.dateRange.end ? new Date(AppState.currentFilters.dateRange.end).toDateString() : 'Any';
        const dateRange = `${startStr} - ${endStr}`;
        activeFilters.push({ type: 'Date Range', value: dateRange });
    }
    
    if (AppState.currentFilters.eventTypes.length > 0) {
        activeFilters.push({ type: 'Event Types', value: AppState.currentFilters.eventTypes.join(', ') });
    }
    
    if (AppState.currentFilters.categories.length > 0) {
        activeFilters.push({ type: 'Categories', value: AppState.currentFilters.categories.join(', ') });
    }
    
    if (AppState.currentFilters.organizers.length > 0) {
        activeFilters.push({ type: 'Organizers', value: AppState.currentFilters.organizers.join(', ') });
    }
    
    if (AppState.currentFilters.locations.length > 0) {
        activeFilters.push({ type: 'Locations', value: AppState.currentFilters.locations.join(', ') });
    }
    
    if (AppState.currentFilters.costRange.min !== null || AppState.currentFilters.costRange.max !== null) {
        const costRange = `$${AppState.currentFilters.costRange.min || 0} - $${AppState.currentFilters.costRange.max || '∞'}`;
        activeFilters.push({ type: 'Cost Range', value: costRange });
    }
    
    if (activeFilters.length > 0) {
        activeFiltersContainer.classList.remove('hidden');
        filterTagsContainer.innerHTML = activeFilters.map(filter => `
            <div class="flex items-center justify-between bg-gray-100 rounded px-2 py-1 text-xs">
                <span><strong>${filter.type}:</strong> ${filter.value}</span>
            </div>
        `).join('');
    } else {
        activeFiltersContainer.classList.add('hidden');
    }
}

// Search functionality
function initializeSearch() {
    const globalSearch = document.getElementById('globalSearch');
    if (globalSearch) {
        let searchTimeout;
        globalSearch.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                AppState.currentFilters.search = e.target.value;
                applyFilters();
            }, 300);
        });
    }
}

// Event display functionality
function initializeEventDisplay() {
    // Sort controls for upcoming events
    const sortByUpcomingSelect = document.getElementById('sortByUpcoming');
    if (sortByUpcomingSelect) {
        sortByUpcomingSelect.addEventListener('change', (e) => handleSortChange(e, 'upcoming'));
    }

    // Sort controls for past events
    const sortByPastSelect = document.getElementById('sortByPast');
    if (sortByPastSelect) {
        sortByPastSelect.addEventListener('change', (e) => handleSortChange(e, 'past'));
    }

    // Load more button (if still needed, considering separate sections)
    // const loadMoreBtn = document.getElementById('loadMore');
    // if (loadMoreBtn) {
    //     loadMoreBtn.addEventListener('click', loadMoreEvents);
    // }
}

function handleSortChange(e, section) {
    AppState.currentSort[section] = e.target.value;
    renderEvents();
}

function renderEvents(append = false) {
    const upcomingEventsGrid = document.getElementById('upcomingEventsGrid');
    const pastEventsGrid = document.getElementById('pastEventsGrid');
    const emptyState = document.getElementById('emptyState');

    if (!upcomingEventsGrid || !pastEventsGrid) return;

    // Render upcoming events
    const sortedUpcomingEvents = sortEvents(AppState.filteredEvents.upcoming, AppState.currentSort.upcoming);
    const upcomingEventsToShow = sortedUpcomingEvents.slice(0, AppState.currentPage.upcoming * AppState.eventsPerPage);
    upcomingEventsGrid.innerHTML = upcomingEventsToShow.map(event => createEventCard(event)).join('');

    // Render past events
    const sortedPastEvents = sortEvents(AppState.filteredEvents.past, AppState.currentSort.past);
    const pastEventsToShow = sortedPastEvents.slice(0, AppState.currentPage.past * AppState.eventsPerPage);
    pastEventsGrid.innerHTML = pastEventsToShow.map(event => createEventCard(event)).join('');

    // Update empty state visibility
    if (AppState.filteredEvents.upcoming.length === 0 && AppState.filteredEvents.past.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
    }

    // Update load more button visibility (if keeping it for future pagination within sections)
    // const loadMoreBtn = document.getElementById('loadMore');
    // if (loadMoreBtn) {
    //     const hasMoreUpcoming = AppState.currentPage.upcoming * AppState.eventsPerPage < AppState.filteredEvents.upcoming.length;
    //     const hasMorePast = AppState.currentPage.past * AppState.eventsPerPage < AppState.filteredEvents.past.length;
    //     if (hasMoreUpcoming || hasMorePast) {
    //         loadMoreBtn.classList.remove('hidden');
    //     } else {
    //         loadMoreBtn.classList.add('hidden');
    //     }
    // }

    addEventCardListeners();
}

function sortEvents(events, sortType) {
    const sorted = [...events];
    
    switch (sortType) {
        case 'date-desc':
            return sorted.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
        case 'date-asc':
            return sorted.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
        case 'cost-asc':
            return sorted.sort((a, b) => a.cost - b.cost);
        case 'cost-desc':
            return sorted.sort((a, b) => b.cost - a.cost);
        case 'popularity':
            return sorted.sort((a, b) => b.popularity - a.popularity);
        default:
            return sorted;
    }
}

function createEventCard(event, type = 'upcoming') {
    const eventDate = new Date(event.start_date);
    const formattedDate = eventDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
    
    const formattedTime = formatTime(event.start_time);
    const costDisplay = event.cost === 0 ? 'Free' : `$${event.cost}`;
    const costClass = event.cost === 0 ? 'text-green-600' : 'text-orange-600';
    
    const eventTypeColors = {
        'online': 'bg-blue-100 text-blue-800',
        'on_campus': 'bg-green-100 text-green-800',
        'off_campus': 'bg-purple-100 text-purple-800'
    };
    
    const eventTypeColor = eventTypeColors[event.event_type] || 'bg-gray-100 text-gray-800';

    const imageUrl = event.flyer ? `data:image/jpeg;base64,${event.flyer}` : 'resources/hero-campus-events.jpg';

    const organizerNames = event.organizer && event.organizer.length > 0 
        ? event.organizer.map(org => `<a href="organizer-details.html?id=${org.organizer_id}" class="hover:underline">${org.name}</a>`).join(', ') 
        : 'Various Organizers';

    const applicationStatus = event.application_required 
        ? '<span class="text-red-600">Application Required</span>' 
        : '<span class="text-green-600">No Application</span>';

    const locationDisplay = event.online_link 
        ? `<a href="${event.online_link}" target="_blank" class="text-blue-600 hover:underline">Online Event</a>`
        : `${event.location.building || ''}, ${event.location.label || 'TBD'}`.trim();
    
    return `
        <a href="event-details.html?id=${event.event_id}" class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden card-hover block">
            <div class="h-48 relative" style="background-image: url('${imageUrl}'); background-size: cover; background-position: center;">
                <div class="absolute top-4 left-4">
                    <span class="event-type-badge ${eventTypeColor} px-3 py-1 rounded-full text-sm font-medium">
                        ${event.event_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                </div>
            </div>
            <div class="p-6">
                <h3 class="text-lg font-semibold text-gray-800 mb-2 line-clamp-2">${event.title}</h3>
                <p class="text-gray-600 text-sm mb-4 line-clamp-2">${event.description}</p>
                
                <div class="space-y-2 mb-4">
                    <div class="flex items-center text-sm text-gray-500">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V6a2 2 0 012-2h4a2 2 0 012 2v1m-6 0h6m-6 0l-1 1v4a2 2 0 01-2 2H6a2 2 0 01-2-2V8l-1-1m1 0V7a2 2 0 012-2h4a2 2 0 012 2v1"></path>
                        </svg>
                        ${locationDisplay}
                    </div>
                    <div class="flex items-center text-sm text-gray-500">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        ${formattedDate} • ${formattedTime}
                    </div>
                    <div class="flex items-center text-sm text-gray-500">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                        </svg>
                        ${organizerNames}
                    </div>
                </div>
                
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                        ${event.categories.slice(0, 2).map(category => 
                            `<span class="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">${category}</span>`
                        ).join('')}
                    </div>
                    <span class="text-sm font-semibold ${costClass}">${costDisplay} ${applicationStatus}</span>
                </div>
            </div>
        </a>
    `;
}

function formatTime(timeString) {
    if (!timeString) return 'TBD';
    
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    
    return `${displayHour}:${minutes} ${ampm}`;
}

function addEventCardListeners() {
    // Event card click handlers
    document.querySelectorAll('[data-event-id]').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.save-event-btn')) return;
            
            const eventId = parseInt(card.dataset.eventId);
            showEventDetails(eventId);
        });
    });
    
    // Save event button handlers
    document.querySelectorAll('.save-event-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const eventId = parseInt(btn.dataset.eventId);
            toggleSaveEvent(eventId);
        });
    });
}

function showEventDetails(eventId) {
    // Fetch event details from the backend using the API client
    window.location.href = `event-details.html?id=${eventId}`;
}

function toggleSaveEvent(eventId) {
    // Simulate saving/unsaving event
    // This functionality will be implemented with API calls in a later task.
    showNotification('Save Event feature coming soon!', 'info');
}

function updateResultsCount() {
    const resultsCount = document.getElementById('resultsCount');
    if (!resultsCount) return;
    
    const totalUpcoming = AppState.filteredEvents.upcoming.length;
    const totalPast = AppState.filteredEvents.past.length;
    const showingUpcoming = Math.min(totalUpcoming, AppState.currentPage.upcoming * AppState.eventsPerPage);
    const showingPast = Math.min(totalPast, AppState.currentPage.past * AppState.eventsPerPage);
    
    if (totalUpcoming === 0 && totalPast === 0) {
        resultsCount.textContent = 'No events found';
    } else if (totalUpcoming === AppState.events.upcoming.length && totalPast === AppState.events.past.length) {
        resultsCount.textContent = `Showing all ${totalUpcoming + totalPast} events`;
    } else {
        resultsCount.textContent = `Showing ${totalUpcoming + totalPast} filtered events`;
    }
}

function showLoadingState() {
    AppState.isLoading = true;
    const loadingState = document.getElementById('loadingState');
    if (loadingState) {
        loadingState.classList.remove('hidden');
    }
}

function hideLoadingState() {
    AppState.isLoading = false;
    const loadingState = document.getElementById('loadingState');
    if (loadingState) {
        loadingState.classList.add('hidden');
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-20 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transform translate-x-full transition-transform duration-300`;
    
    const colors = {
        success: 'bg-green-500 text-white',
        error: 'bg-red-500 text-white',
        info: 'bg-blue-500 text-white',
        warning: 'bg-yellow-500 text-black'
    };
    
    notification.className += ` ${colors[type] || colors.info}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // Animate out and remove
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Utility functions
function scrollToEvents() {
    const eventsSection = document.querySelector('main');
    if (eventsSection) {
        eventsSection.scrollIntoView({ behavior: 'smooth' });
    }
}

function showCreateEvent() {
    showNotification('Create Event feature coming soon!', 'info');
}

// Export functions for global access
window.scrollToEvents = scrollToEvents;
window.showCreateEvent = showCreateEvent;
window.clearAllFilters = clearAllFilters;
window.showEventDetails = showEventDetails;

console.log('DKU Event Management System - JavaScript loaded successfully');