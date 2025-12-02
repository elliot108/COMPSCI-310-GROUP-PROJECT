// Event Management System - Main JavaScript File with API Integration

// Global state management
const AppState = {
    events: [],
    filteredEvents: [],
    currentFilters: {
        search: '',
        dateRange: { start: null, end: null },
        eventTypes: [],
        categories: [],
        organizer: '',
        location: '',
        costRange: { min: null, max: null }
    },
    currentSort: 'date-desc',
    currentView: 'grid',
    currentPage: 1,
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
    initializeSQLViewer();
    
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
        const response = await fetch('http://localhost:3000/api/events');
        const events = await response.json();
        
        // Load categories, locations, and organizers
        const [categoriesResponse, locationsResponse, organizersResponse] = await Promise.all([
            fetch('http://localhost:3000/api/categories'),
            fetch('http://localhost:3000/api/locations'),
            fetch('http://localhost:3000/api/organizers')
        ]);
        
        const categories = await categoriesResponse.json();
        const locations = await locationsResponse.json();
        const organizers = await organizersResponse.json();
        
        AppState.events = events;
        AppState.filteredEvents = events;
        
        // Populate filter dropdowns with real data
        populateFilterOptions(categories, locations, organizers);
        
    } catch (error) {
        console.error('Error loading real data:', error);
        // Fallback to mock data
        loadMockData();
    }
}

function loadMockData() {
    AppState.events = [...mockEvents];
    AppState.filteredEvents = [...mockEvents];
    
    // Populate filter dropdowns with mock data
    const categories = ['academic', 'cultural', 'sports', 'social', 'career', 'volunteer', 'arts', 'tech'];
    const locations = [
        { building: 'Main Campus', label: 'Main Campus' },
        { building: 'Student Center', label: 'Student Center' },
        { building: 'Library', label: 'Library' },
        { building: 'Sports Complex', label: 'Sports Complex' },
        { building: 'Auditorium', label: 'Auditorium' }
    ];
    const organizers = [
        { organizer_id: 1, organizer_type: 'student' },
        { organizer_id: 2, organizer_type: 'club' },
        { organizer_id: 3, organizer_type: 'school' }
    ];
    
    populateFilterOptions(categories, locations, organizers);
}

function populateFilterOptions(categories, locations, organizers) {
    // Populate category filter
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.innerHTML = categories.map(category => 
            `<option value="${category}">${category}</option>`
        ).join('');
    }
    
    // Populate location filter
    const locationFilter = document.getElementById('locationFilter');
    if (locationFilter) {
        locationFilter.innerHTML = '<option value="">All Locations</option>' +
            locations.map(location => 
                `<option value="${location.building}">${location.label}</option>`
            ).join('');
    }
    
    // Populate organizer filter
    const organizerFilter = document.getElementById('organizerFilter');
    if (organizerFilter) {
        organizerFilter.innerHTML = '<option value="">All Organizers</option>' +
            organizers.map(organizer => 
                `<option value="${organizer.organizer_type}">${organizer.organizer_type}</option>`
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
        { id: 'totalEvents', target: AppState.events.length, duration: 2000 },
        { id: 'activeEvents', target: AppState.events.filter(e => new Date(e.start_date) >= new Date()).length, duration: 1500 },
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
    const selectedCategories = Array.from(categorySelect.selectedOptions)
        .map(option => option.value);
    
    AppState.currentFilters.categories = selectedCategories;
    applyFilters();
}

function handleOrganizerFilterChange() {
    const organizer = document.getElementById('organizerFilter').value;
    AppState.currentFilters.organizer = organizer;
    applyFilters();
}

function handleLocationFilterChange() {
    const location = document.getElementById('locationFilter').value;
    AppState.currentFilters.location = location;
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
        let filtered = [];
        
        if (AppState.useMockData) {
            // Use local filtering for mock data
            filtered = filterEventsLocally();
        } else {
            // Use API for real data
            filtered = await filterEventsViaAPI();
        }
        
        AppState.filteredEvents = filtered;
        AppState.currentPage = 1;
        
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
    let filtered = [...AppState.events];
    
    // Apply search filter
    if (AppState.currentFilters.search) {
        const searchTerm = AppState.currentFilters.search.toLowerCase();
        filtered = filtered.filter(event => 
            event.title.toLowerCase().includes(searchTerm) ||
            event.description.toLowerCase().includes(searchTerm) ||
            event.organizer.name.toLowerCase().includes(searchTerm)
        );
    }
    
    // Apply date range filter
    if (AppState.currentFilters.dateRange.start || AppState.currentFilters.dateRange.end) {
        filtered = filtered.filter(event => {
            const eventDate = new Date(event.start_date);
            const startDate = AppState.currentFilters.dateRange.start ? new Date(AppState.currentFilters.dateRange.start) : null;
            const endDate = AppState.currentFilters.dateRange.end ? new Date(AppState.currentFilters.dateRange.end) : null;
            
            if (startDate && eventDate < startDate) return false;
            if (endDate && eventDate > endDate) return false;
            
            return true;
        });
    }
    
    // Apply event type filter
    if (AppState.currentFilters.eventTypes.length > 0) {
        filtered = filtered.filter(event => 
            AppState.currentFilters.eventTypes.includes(event.event_type)
        );
    }
    
    // Apply category filter
    if (AppState.currentFilters.categories.length > 0) {
        filtered = filtered.filter(event => 
            event.categories.some(category => 
                AppState.currentFilters.categories.includes(category)
            )
        );
    }
    
    // Apply organizer filter
    if (AppState.currentFilters.organizer) {
        filtered = filtered.filter(event => 
            event.organizer.type === AppState.currentFilters.organizer
        );
    }
    
    // Apply location filter
    if (AppState.currentFilters.location) {
        filtered = filtered.filter(event => 
            event.location.building.toLowerCase().includes(
                AppState.currentFilters.location.toLowerCase()
            )
        );
    }
    
    // Apply cost range filter
    if (AppState.currentFilters.costRange.min !== null || AppState.currentFilters.costRange.max !== null) {
        filtered = filtered.filter(event => {
            const minCost = AppState.currentFilters.costRange.min;
            const maxCost = AppState.currentFilters.costRange.max;
            
            if (minCost !== null && event.cost < minCost) return false;
            if (maxCost !== null && event.cost > maxCost) return false;
            
            return true;
        });
    }
    
    return filtered;
}

async function filterEventsViaAPI() {
    try {
        const filters = {
            start_date: AppState.currentFilters.dateRange.start,
            end_date: AppState.currentFilters.dateRange.end,
            event_type: AppState.currentFilters.eventTypes.length > 0 ? AppState.currentFilters.eventTypes[0] : null,
            categories: AppState.currentFilters.categories,
            organizers: [], // You can expand this to include organizer filtering
            locations: AppState.currentFilters.location ? [AppState.currentFilters.location] : []
        };
        
        const response = await fetch('http://localhost:3000/api/events/filter', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(filters)
        });
        
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
        organizer: '',
        location: '',
        costRange: { min: null, max: null }
    };
    
    // Clear form inputs
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('globalSearch').value = '';
    document.getElementById('organizerFilter').value = '';
    document.getElementById('locationFilter').value = '';
    document.getElementById('minCost').value = '';
    document.getElementById('maxCost').value = '';
    
    // Uncheck event type filters
    document.querySelectorAll('.event-type-filter').forEach(cb => {
        cb.checked = false;
    });
    
    // Clear category selection
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        Array.from(categoryFilter.options).forEach(option => {
            option.selected = false;
        });
    }
    
    // Reset filtered events
    AppState.filteredEvents = [...AppState.events];
    AppState.currentPage = 1;
    
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
    
    if (AppState.currentFilters.organizer) {
        activeFilters.push({ type: 'Organizer', value: AppState.currentFilters.organizer });
    }
    
    if (AppState.currentFilters.location) {
        activeFilters.push({ type: 'Location', value: AppState.currentFilters.location });
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
    // Sort controls
    const sortBySelect = document.getElementById('sortBy');
    if (sortBySelect) {
        sortBySelect.addEventListener('change', handleSortChange);
    }
    
    // View toggle controls
    const gridViewBtn = document.getElementById('gridView');
    const listViewBtn = document.getElementById('listView');
    
    if (gridViewBtn && listViewBtn) {
        gridViewBtn.addEventListener('click', () => setViewMode('grid'));
        listViewBtn.addEventListener('click', () => setViewMode('list'));
    }
    
    // Load more button
    const loadMoreBtn = document.getElementById('loadMore');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMoreEvents);
    }
}

function handleSortChange(e) {
    AppState.currentSort = e.target.value;
    renderEvents();
}

function setViewMode(mode) {
    AppState.currentView = mode;
    
    // Update button states
    const gridViewBtn = document.getElementById('gridView');
    const listViewBtn = document.getElementById('listView');
    
    if (mode === 'grid') {
        gridViewBtn.classList.add('bg-white', 'shadow-sm');
        listViewBtn.classList.remove('bg-white', 'shadow-sm');
    } else {
        listViewBtn.classList.add('bg-white', 'shadow-sm');
        gridViewBtn.classList.remove('bg-white', 'shadow-sm');
    }
    
    renderEvents();
}

function loadMoreEvents() {
    AppState.currentPage++;
    renderEvents(true);
}

function renderEvents(append = false) {
    const eventsGrid = document.getElementById('eventsGrid');
    const emptyState = document.getElementById('emptyState');
    const loadMoreBtn = document.getElementById('loadMore');
    
    if (!eventsGrid) return;
    
    // Sort events
    const sortedEvents = sortEvents(AppState.filteredEvents, AppState.currentSort);
    
    // Paginate events
    const startIndex = (AppState.currentPage - 1) * AppState.eventsPerPage;
    const endIndex = startIndex + AppState.eventsPerPage;
    const eventsToShow = sortedEvents.slice(0, endIndex);
    
    if (eventsToShow.length === 0) {
        eventsGrid.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
        if (loadMoreBtn) loadMoreBtn.classList.add('hidden');
        return;
    }
    
    if (emptyState) emptyState.classList.add('hidden');
    
    // Check if there are more events to load
    if (endIndex >= sortedEvents.length) {
        if (loadMoreBtn) loadMoreBtn.classList.add('hidden');
    } else {
        if (loadMoreBtn) loadMoreBtn.classList.remove('hidden');
    }
    
    // Render events
    const eventsHTML = eventsToShow.map(event => createEventCard(event)).join('');
    
    if (append) {
        eventsGrid.insertAdjacentHTML('beforeend', eventsHTML);
    } else {
        eventsGrid.innerHTML = eventsHTML;
    }
    
    // Add event listeners to new cards
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

function createEventCard(event) {
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
    
    return `
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden card-hover cursor-pointer" 
             data-event-id="${event.event_id}">
            <div class="h-48 bg-gradient-to-br from-teal-400 to-blue-500 relative">
                <div class="absolute top-4 left-4">
                    <span class="event-badge ${eventTypeColor} px-3 py-1 rounded-full text-sm font-medium">
                        ${event.event_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                </div>
                <div class="absolute top-4 right-4">
                    <button class="save-event-btn text-white hover:text-red-400 transition-colors" 
                            data-event-id="${event.event_id}">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="p-6">
                <div class="flex items-start justify-between mb-3">
                    <h3 class="text-lg font-semibold text-gray-800 line-clamp-2">${event.title}</h3>
                </div>
                
                <p class="text-gray-600 text-sm mb-4 line-clamp-2">${event.description}</p>
                
                <div class="space-y-2 mb-4">
                    <div class="flex items-center text-sm text-gray-500">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V6a2 2 0 012-2h4a2 2 0 012 2v1m-6 0h6m-6 0l-1 1v4a2 2 0 01-2 2H6a2 2 0 01-2-2V8l-1-1m1 0V7a2 2 0 012-2h4a2 2 0 012 2v1"></path>
                        </svg>
                        ${event.location.label}
                    </div>
                    <div class="flex items-center text-sm text-gray-500">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        ${formattedDate} • ${formattedTime}
                    </div>
                    <div class="flex items-center text-sm text-gray-500">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                        </svg>
                        ${event.organizer.name}
                    </div>
                </div>
                
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                        ${event.categories.slice(0, 2).map(category => 
                            `<span class="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">${category}</span>`
                        ).join('')}
                    </div>
                    <span class="text-sm font-semibold ${costClass}">${costDisplay}</span>
                </div>
            </div>
        </div>
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
    const event = AppState.events.find(e => e.event_id === eventId);
    if (!event) return;
    
    // For now, navigate to the event details page
    // In a real app, this would open a modal or navigate to a detailed view
    window.location.href = `event-details.html?id=${eventId}`;
}

function toggleSaveEvent(eventId) {
    // Simulate saving/unsaving event
    const btn = document.querySelector(`[data-event-id="${eventId}"] .save-event-btn svg`);
    if (!btn) return;
    
    const isSaved = btn.classList.contains('text-red-500');
    
    if (isSaved) {
        btn.classList.remove('text-red-500');
        btn.classList.add('text-white');
        showNotification('Event removed from saved', 'info');
    } else {
        btn.classList.remove('text-white');
        btn.classList.add('text-red-500');
        showNotification('Event saved!', 'success');
    }
}

function updateResultsCount() {
    const resultsCount = document.getElementById('resultsCount');
    if (!resultsCount) return;
    
    const total = AppState.filteredEvents.length;
    const showing = Math.min(total, AppState.currentPage * AppState.eventsPerPage);
    
    if (total === 0) {
        resultsCount.textContent = 'No events found';
    } else if (total === AppState.events.length) {
        resultsCount.textContent = `Showing all ${total} events`;
    } else {
        resultsCount.textContent = `Showing ${total} filtered events`;
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

// Initialize SQL viewer (call from initializeApp or DOMContentLoaded)
function initializeSQLViewer() {
    const showBtn = document.getElementById('showSQLBtn');
    const modal = document.getElementById('sqlModal');
    const closeBtn = document.getElementById('closeSqlBtn');
    const sqlContentEl = document.getElementById('sqlContent');
    const copyBtn = document.getElementById('copySqlBtn');
    const downloadBtn = document.getElementById('downloadSqlBtn');

    if (!showBtn || !modal || !sqlContentEl) return;

    async function openModal() {
        showLoadingState();
        const data = await window.apiClient.getUserPreferenceSQL(); // [`APIClient.getUserPreferenceSQL`](api-client.js)
        hideLoadingState();
        if (!data) {
            showNotification('Failed to load SQL file', 'error');
            return;
        }
        sqlContentEl.textContent = data.content || '';
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    function closeModal() {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }

    showBtn.addEventListener('click', openModal);
    closeBtn && closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    copyBtn && copyBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(sqlContentEl.textContent);
            showNotification('SQL copied to clipboard', 'success');
        } catch (err) {
            showNotification('Copy failed', 'error');
        }
    });

    downloadBtn && downloadBtn.addEventListener('click', () => {
        const blob = new Blob([sqlContentEl.textContent], { type: 'text/sql' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'user_PReference.sql';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    });
}

// call during app init (if you already have initializeApp, add this call there)
document.addEventListener('DOMContentLoaded', () => {
    if (typeof initializeSQLViewer === 'function') initializeSQLViewer();
});

// Export functions for global access
window.scrollToEvents = scrollToEvents;
window.showCreateEvent = showCreateEvent;
window.clearAllFilters = clearAllFilters;
window.showEventDetails = showEventDetails;

console.log('DKU Event Management System - JavaScript loaded successfully');
