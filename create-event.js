// create-event.js - FIXED VERSION
let allOrganizers = []; // Store all organizers globally

document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Load categories from database
        await loadCategories();

        // Load all organizers for type-ahead search
        await loadAllOrganizers();

        // Set up event listeners for dynamic fields
        setupDynamicFields();

        // Form submission handler
        const form = document.getElementById('createEventForm');
        if (form) {
            form.addEventListener('submit', handleFormSubmit);
        } else {
            console.error('Form not found!');
        }
    } catch (error) {
        console.error('Error initializing page:', error);
        alert('Error loading page: ' + error.message);
    }
});

async function loadAllOrganizers() {
    try {
        const response = await fetch('http://localhost:3000/api/all-organizers');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        allOrganizers = await response.json();
        console.log('All organizers loaded:', allOrganizers);
    } catch (error) {
        console.error('Failed to load all organizers:', error);
    }
}

async function loadCategories() {
    try {
        const response = await fetch('http://localhost:3000/api/categories');
        const categories = await response.json();
        
        const container = document.getElementById('categoriesList');
        if (!container) {
            console.error('categoriesList element not found!');
            return;
        }
        
        container.innerHTML = '';
        
        categories.forEach(category => {
            const div = document.createElement('div');
            div.className = 'category-option';
            div.innerHTML = `
                <input type="checkbox" id="category-${category.category_id}" 
                       value="${category.category_id}" class="category-checkbox">
                <label for="category-${category.category_id}">${category.category_name}</label>
            `;
            container.appendChild(div);
        });
    } catch (error) {
        console.error('Failed to load categories:', error);
        const container = document.getElementById('categoriesList');
        if (container) {
            container.innerHTML = '<p>Error loading categories. Please refresh the page.</p>';
        }
    }
}

function setupDynamicFields() {
    console.log('Setting up dynamic fields...');
    
    // Application required toggle - WITH NULL CHECK
    const appRequired = document.getElementById('applicationRequired');
    const appFields = document.getElementById('applicationFields');
    
    if (appRequired && appFields) {
        appRequired.addEventListener('change', function() {
            if (this.value === '1') {
                appFields.classList.remove('hidden');
                // Make required fields
                const appLink = appFields.querySelector('[name="application_link"]');
                const appDeadline = appFields.querySelector('[name="application_deadline"]');
                if (appLink) appLink.required = true;
                if (appDeadline) appDeadline.required = true;
            } else {
                appFields.classList.add('hidden');
                // Remove required attribute
                const appLink = appFields.querySelector('[name="application_link"]');
                const appDeadline = appFields.querySelector('[name="application_deadline"]');
                if (appLink) appLink.required = false;
                if (appDeadline) appDeadline.required = false;
            }
        });
    } else {
        console.warn('Application fields not found');
    }
    
    // Event type toggle (online link and location) - WITH NULL CHECK
    const eventType = document.getElementById('eventType');
    const onlineLinkField = document.getElementById('onlineLinkField');
    const buildingSelection = document.getElementById('buildingSelection');
    const labelSelection = document.getElementById('labelSelection');
    
    if (eventType && onlineLinkField && buildingSelection && labelSelection) {
        eventType.addEventListener('change', function() {
            console.log('Event type changed to:', this.value);
            
            if (this.value === 'online') {
                onlineLinkField.classList.remove('hidden');
                buildingSelection.classList.add('hidden');
                labelSelection.classList.add('hidden');
                
                const onlineLinkInput = onlineLinkField.querySelector('[name="online_link"]');
                if (onlineLinkInput) onlineLinkInput.required = true;
                
            } else if (this.value === 'on_campus') {
                onlineLinkField.classList.add('hidden');
                buildingSelection.classList.remove('hidden');
                labelSelection.classList.add('hidden'); // Hide until building selected
                
                const onlineLinkInput = onlineLinkField.querySelector('[name="online_link"]');
                if (onlineLinkInput) onlineLinkInput.required = false;
                
                // Load buildings for on_campus events
                loadBuildings();
                
                // Clear any previous selections
                const selectedBuilding = document.getElementById('selectedBuilding');
                const selectedLabel = document.getElementById('selectedLabel');
                if (selectedBuilding) selectedBuilding.value = '';
                if (selectedLabel) selectedLabel.value = '';
                
            } else { // off_campus
                onlineLinkField.classList.add('hidden');
                buildingSelection.classList.add('hidden');
                labelSelection.classList.add('hidden');
                
                const onlineLinkInput = onlineLinkField.querySelector('[name="online_link"]');
                if (onlineLinkInput) onlineLinkInput.required = false;
                
                // Clear selections
                const selectedBuilding = document.getElementById('selectedBuilding');
                const selectedLabel = document.getElementById('selectedLabel');
                if (selectedBuilding) selectedBuilding.value = '';
                if (selectedLabel) selectedLabel.value = '';
            }
        });
        
        // Initialize based on default value
        const defaultEventType = eventType.value;
        console.log('Default event type:', defaultEventType);
        
        if (defaultEventType === 'online') {
            onlineLinkField.classList.remove('hidden');
            buildingSelection.classList.add('hidden');
            labelSelection.classList.add('hidden');
        } else if (defaultEventType === 'on_campus') {
            onlineLinkField.classList.add('hidden');
            buildingSelection.classList.remove('hidden');
            labelSelection.classList.add('hidden');
            loadBuildings();
        } else { // off_campus
            onlineLinkField.classList.add('hidden');
            buildingSelection.classList.add('hidden');
            labelSelection.classList.add('hidden');
        }
    } else {
        console.warn('Event type fields not found');
    }
    
    // Collaborating organizers toggle - WITH NULL CHECK
    const addCollaborators = document.getElementById('addCollaborators');
    const collaboratorsContainer = document.getElementById('collaboratorsContainer');
    const addCollaboratorBtn = document.getElementById('addCollaboratorBtn');
    
    if (addCollaborators && collaboratorsContainer && addCollaboratorBtn) {
        addCollaborators.addEventListener('change', function() {
            if (this.value === 'yes') {
                collaboratorsContainer.classList.remove('hidden');
                addCollaboratorRow(); // Add first row
            } else {
                collaboratorsContainer.classList.add('hidden');
                const collaboratorRows = document.getElementById('collaboratorRows');
                if (collaboratorRows) collaboratorRows.innerHTML = '';
            }
        });
        
        // Add collaborator button
        addCollaboratorBtn.addEventListener('click', addCollaboratorRow);
    } else {
        console.warn('Collaborator fields not found');
    }
}

function addCollaboratorRow() {
    const container = document.getElementById('collaboratorRows');
    if (!container) {
        console.error('collaboratorRows container not found');
        return;
    }
    
    const rowId = Date.now(); // Unique ID
    
    const row = document.createElement('div');
    row.className = 'collaborator-row';
    row.id = `collaborator-${rowId}`;
    row.innerHTML = `
        <div class="relative w-full">
            <input type="text" class="collaborator-search-input w-full" placeholder="Search organizer by name or email" data-row-id="${rowId}">
            <div class="collaborator-suggestions absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto hidden mt-1"></div>
            <input type="hidden" class="collaborator-id-hidden" name="collaborating_organizers_id" data-row-id="${rowId}">
        </div>
        <button type="button" class="remove-collaborator" onclick="removeCollaboratorRow('${rowId}')">×</button>
    `;
    container.appendChild(row);

    // Set up event listeners for the newly added row
    const searchInput = row.querySelector('.collaborator-search-input');
    const suggestionsContainer = row.querySelector('.collaborator-suggestions');
    const hiddenIdInput = row.querySelector('.collaborator-id-hidden');

    let selectedOrganizerId = null; // To store the selected ID for this row

    const renderSuggestions = (filteredOrganizers) => {
        suggestionsContainer.innerHTML = '';
        if (filteredOrganizers.length === 0 && searchInput.value.length > 0) {
            suggestionsContainer.innerHTML = '<div class="p-2 text-gray-500">No organizers found</div>';
            suggestionsContainer.classList.remove('hidden');
            return;
        }

        filteredOrganizers.forEach(org => {
            const button = document.createElement('button');
            button.type = 'button';
            button.classList.add('block', 'w-full', 'text-left', 'px-3', 'py-2', 'text-sm', 'text-gray-700', 'hover:bg-blue-50', 'transition-colors');
            button.textContent = org.name; // Display name or email
            button.addEventListener('click', () => {
                searchInput.value = org.name; // Display selected name
                hiddenIdInput.value = org.organizer_id; // Store ID
                selectedOrganizerId = org.organizer_id;
                suggestionsContainer.classList.add('hidden');
            });
            suggestionsContainer.appendChild(button);
        });
        suggestionsContainer.classList.remove('hidden');
    };

    searchInput.addEventListener('input', () => {
        const searchValue = searchInput.value.trim().toLowerCase();
        if (searchValue.length > 0) {
            const filtered = allOrganizers.filter(org => 
                org.name.toLowerCase().includes(searchValue) ||
                (org.email && org.email.toLowerCase().includes(searchValue))
            );
            renderSuggestions(filtered);
        } else {
            suggestionsContainer.classList.add('hidden');
            hiddenIdInput.value = ''; // Clear hidden ID if search input is cleared
            selectedOrganizerId = null;
        }
    });

    searchInput.addEventListener('focus', () => {
        // Optionally show all or recent if search is empty on focus
        if (searchInput.value.trim().length > 0) {
            const searchValue = searchInput.value.trim().toLowerCase();
            const filtered = allOrganizers.filter(org => 
                org.name.toLowerCase().includes(searchValue) ||
                (org.email && org.email.toLowerCase().includes(searchValue))
            );
            renderSuggestions(filtered);
        } else if (allOrganizers.length > 0) {
            // If search is empty on focus, show all organizers
            renderSuggestions(allOrganizers);
        }
    });

    searchInput.addEventListener('blur', (e) => {
        setTimeout(() => {
            if (!e.relatedTarget || !suggestionsContainer.contains(e.relatedTarget)) {
                suggestionsContainer.classList.add('hidden');
            }
        }, 150);
        // If the user blurs and hasn't selected anything, and input is not empty,
        // try to find a match or clear if no exact match.
        if (searchInput.value.trim().length > 0 && selectedOrganizerId === null) {
            const exactMatch = allOrganizers.find(org => 
                org.name.toLowerCase() === searchInput.value.trim().toLowerCase() ||
                (org.email && org.email.toLowerCase() === searchInput.value.trim().toLowerCase())
            );
            if (exactMatch) {
                searchInput.value = exactMatch.name;
                hiddenIdInput.value = exactMatch.organizer_id;
                selectedOrganizerId = exactMatch.organizer_id;
            } else {
                searchInput.value = '';
                hiddenIdInput.value = '';
                alert('Please select a valid organizer from the suggestions.');
            }
        }
    });
}

function removeCollaboratorRow(rowId) {
    const row = document.getElementById(`collaborator-${rowId}`);
    if (row) row.remove();
}

function getCollaboratorsJson() {
    const inputs = document.querySelectorAll('.collaborator-id-hidden');
    const organizers = Array.from(inputs)
        .map(input => parseInt(input.value))
        .filter(id => !isNaN(id) && id > 0);
    return JSON.stringify(organizers);
}

function getCategoriesJson() {
    const checkboxes = document.querySelectorAll('.category-checkbox:checked');
    const categoryIds = Array.from(checkboxes).map(cb => parseInt(cb.value));
    return JSON.stringify(categoryIds);
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    // Update JSON hidden fields
    document.getElementById('collaboratingOrganizersJson').value = getCollaboratorsJson();
    document.getElementById('categoryIdsJson').value = getCategoriesJson();
    
    // Create FormData object
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    // Convert numeric fields - handle empty max_participants
    data.max_participants = data.max_participants === '' ? null : parseInt(data.max_participants);
    data.application_required = parseInt(data.application_required);
    data.organizer_id = parseInt(data.organizer_id);
    data.cost = data.cost === '' ? 0 : parseInt(data.cost);
    
    // Parse JSON fields
    try {
        data.collaborating_organizers = JSON.parse(data.collaborating_organizers || '[]');
        data.category_ids = JSON.parse(data.category_ids || '[]');
        
        // Validate application fields
        if (data.application_required === 1) {
            if (!data.application_link || !data.application_deadline) {
                alert('Application link and deadline are required when application is required.');
                return;
            }
        }
        
        // Validate online events
        if (data.event_type === 'online') {
            if (!data.online_link) {
                alert('Online link is required for online events.');
                return;
            }
        }
        
        // Log what we're sending
        console.log('Sending data to backend:', data);
        
        // Send to backend
        const response = await fetch('http://localhost:3000/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        
        if (result.success) {
            alert(`✅ Event created successfully! Event ID: ${result.newEventId}`);
            
            // Ask user what to do next
            const goHome = confirm('Event created! Click OK to go to home page, or Cancel to stay and create another event.');
            
            if (goHome) {
                window.location.href = 'index.html'; // Change to your actual home page
            } else {
                resetForm();
            }
        } else {
            alert('❌ Failed to create event: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ An error occurred while creating the event: ' + error.message);
    }
}

// Load buildings from database
async function loadBuildings() {
    try {
        console.log('Loading buildings...');
        const response = await fetch('http://localhost:3000/api/buildings');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const buildings = await response.json();
        console.log('Buildings received:', buildings);
        
        const container = document.getElementById('buildingsList');
        if (!container) {
            console.error('buildingsList element not found!');
            return;
        }
        
        container.innerHTML = '';
        
        if (!buildings || buildings.length === 0) {
            container.innerHTML = '<p>No buildings available in database</p>';
            return;
        }
        
        buildings.forEach(building => {
            const div = document.createElement('div');
            div.className = 'building-option';
            div.innerHTML = `
                <input type="radio" id="building-${building.building.replace(/\s+/g, '-')}" 
                       name="building_radio" value="${building.building}" 
                       class="building-radio">
                <label for="building-${building.building.replace(/\s+/g, '-')}">
                    <strong>${building.building}</strong><br>
                    <small>${building.label_count} room(s), 
                    Max capacity: ${building.max_capacity || 'N/A'}</small>
                </label>
            `;
            container.appendChild(div);
        });
        
        // Add event listeners to building radio buttons
        document.querySelectorAll('.building-radio').forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.checked) {
                    const building = this.value;
                    console.log('Building selected:', building);
                    
                    const selectedBuildingField = document.getElementById('selectedBuilding');
                    if (selectedBuildingField) selectedBuildingField.value = building;
                    
                    loadLabelsForBuilding(building);
                    
                    const labelSelection = document.getElementById('labelSelection');
                    if (labelSelection) labelSelection.classList.remove('hidden');
                }
            });
        });
        
    } catch (error) {
        console.error('Failed to load buildings:', error);
        const container = document.getElementById('buildingsList');
        if (container) {
            container.innerHTML = `<p>Error loading buildings: ${error.message}</p>`;
        }
    }
}

// Load labels for selected building
async function loadLabelsForBuilding(building) {
    try {
        console.log(`Loading labels for building: ${building}`);
        const response = await fetch(`http://localhost:3000/api/buildings/${encodeURIComponent(building)}/labels`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const labels = await response.json();
        console.log(`Labels for ${building}:`, labels);
        
        const container = document.getElementById('labelsList');
        if (!container) {
            console.error('labelsList element not found!');
            return;
        }
        
        container.innerHTML = '';
        
        if (!labels || labels.length === 0) {
            container.innerHTML = `<p>No rooms/labels found for ${building}</p>`;
            return;
        }
        
        labels.forEach(label => {
            const div = document.createElement('div');
            div.className = 'label-option';
            div.innerHTML = `
                <input type="radio" id="label-${label.location_id}" 
                       name="label_radio" value="${label.label}" 
                       data-location-id="${label.location_id}"
                       class="label-radio">
                <label for="label-${label.location_id}">
                    <strong>${label.label}</strong><br>
                    <small>Capacity: ${label.capacity || 'N/A'}</small>
                </label>
            `;
            container.appendChild(div);
        });
        
        // Add event listeners to label radio buttons
        document.querySelectorAll('.label-radio').forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.checked) {
                    const label = this.value;
                    const locationId = this.getAttribute('data-location-id');
                    console.log('Label selected:', label, 'Location ID:', locationId);
                    
                    const selectedLabelField = document.getElementById('selectedLabel');
                    if (selectedLabelField) {
                        selectedLabelField.value = label;
                        selectedLabelField.setAttribute('data-location-id', locationId);
                    }
                }
            });
        });
        
    } catch (error) {
        console.error('Failed to load labels:', error);
        const container = document.getElementById('labelsList');
        if (container) {
            container.innerHTML = `<p>Error loading rooms: ${error.message}</p>`;
        }
    }
}

// Reset form after successful submission
function resetForm() {
    const form = document.getElementById('createEventForm');
    if (!form) return;
    
    form.reset();
    
    // Reset dynamic fields visibility
    const elementsToHide = [
        'applicationFields',
        'onlineLinkField',
        'buildingSelection',
        'labelSelection',
        'collaboratorsContainer'
    ];
    
    elementsToHide.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.classList.add('hidden');
    });
    
    // Clear building/label selections
    const selectedBuilding = document.getElementById('selectedBuilding');
    const selectedLabel = document.getElementById('selectedLabel');
    if (selectedBuilding) selectedBuilding.value = '';
    if (selectedLabel) selectedLabel.value = '';
    
    // Clear collaborator rows
    const collaboratorRows = document.getElementById('collaboratorRows');
    if (collaboratorRows) collaboratorRows.innerHTML = '';
    
    // Reset select boxes to defaults
    const applicationRequired = document.getElementById('applicationRequired');
    const eventType = document.getElementById('eventType');
    const addCollaborators = document.getElementById('addCollaborators');
    
    const costField = document.querySelector('[name="cost"]');
    if (costField) costField.value = 0;

    if (applicationRequired) applicationRequired.value = '0';
    if (eventType) {
        eventType.value = 'on_campus';
        // Trigger change event to show building selection
        eventType.dispatchEvent(new Event('change'));
    }
    if (addCollaborators) addCollaborators.value = 'no';
    
    // Uncheck all categories
    document.querySelectorAll('.category-checkbox').forEach(cb => cb.checked = false);
    
    // Clear buildings and labels lists
    const buildingsList = document.getElementById('buildingsList');
    const labelsList = document.getElementById('labelsList');
    if (buildingsList) buildingsList.innerHTML = '<p>Loading buildings...</p>';
    if (labelsList) labelsList.innerHTML = '<p>Please select a building first</p>';
}