// create-event.js
document.addEventListener('DOMContentLoaded', async function() {
    // Load categories from database
    await loadCategories();
    
    // Set up event listeners for dynamic fields
    setupDynamicFields();
    
    // Form submission handler
    document.getElementById('createEventForm').addEventListener('submit', handleFormSubmit);
});

async function loadCategories() {
    try {
        const response = await fetch('http://localhost:3000/api/categories');
        const categories = await response.json();
        
        const container = document.getElementById('categoriesList');
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
        document.getElementById('categoriesList').innerHTML = 
            '<p>Error loading categories. Please refresh the page.</p>';
    }
}

function setupDynamicFields() {
    // Application required toggle
    const appRequired = document.getElementById('applicationRequired');
    const appFields = document.getElementById('applicationFields');
    
    appRequired.addEventListener('change', function() {
        if (this.value === '1') {
            appFields.classList.remove('hidden');
            // Make required fields
            appFields.querySelector('[name="application_link"]').required = true;
            appFields.querySelector('[name="application_deadline"]').required = true;
        } else {
            appFields.classList.add('hidden');
            // Remove required attribute
            appFields.querySelector('[name="application_link"]').required = false;
            appFields.querySelector('[name="application_deadline"]').required = false;
        }
    });
    
    // Event type toggle (online link and location)
const eventType = document.getElementById('eventType');
const onlineLinkField = document.getElementById('onlineLinkField');
const locationFields = document.getElementById('locationFields');

eventType.addEventListener('change', function() {
    if (this.value === 'online') {
        onlineLinkField.classList.remove('hidden');
        locationFields.classList.add('hidden');
        onlineLinkField.querySelector('[name="online_link"]').required = true;
        locationFields.querySelector('[name="building"]').required = false;
        locationFields.querySelector('[name="label"]').required = false;
    } else if (this.value === 'on_campus') {
        onlineLinkField.classList.add('hidden');
        locationFields.classList.remove('hidden');
        onlineLinkField.querySelector('[name="online_link"]').required = false;
        locationFields.querySelector('[name="building"]').required = true;
        locationFields.querySelector('[name="label"]').required = true;
    } else { // off_campus
        onlineLinkField.classList.add('hidden');
        locationFields.classList.add('hidden');
        onlineLinkField.querySelector('[name="online_link"]').required = false;
        locationFields.querySelector('[name="building"]').required = false;
        locationFields.querySelector('[name="label"]').required = false;
    }
});

// Also initialize based on default value
const defaultEventType = eventType.value;
if (defaultEventType === 'online') {
    onlineLinkField.classList.remove('hidden');
    locationFields.classList.add('hidden');
} else if (defaultEventType === 'on_campus') {
    locationFields.classList.remove('hidden');
} else {
    onlineLinkField.classList.add('hidden');
    locationFields.classList.add('hidden');
}
    
    // Collaborating organizers toggle
    const addCollaborators = document.getElementById('addCollaborators');
    const collaboratorsContainer = document.getElementById('collaboratorsContainer');
    const addCollaboratorBtn = document.getElementById('addCollaboratorBtn');
    
    addCollaborators.addEventListener('change', function() {
        if (this.value === 'yes') {
            collaboratorsContainer.classList.remove('hidden');
            addCollaboratorRow(); // Add first row
        } else {
            collaboratorsContainer.classList.add('hidden');
            document.getElementById('collaboratorRows').innerHTML = '';
        }
    });
    
    // Add collaborator button
    addCollaboratorBtn.addEventListener('click', addCollaboratorRow);
}

function addCollaboratorRow() {
    const container = document.getElementById('collaboratorRows');
    const rowId = Date.now(); // Unique ID
    
    const row = document.createElement('div');
    row.className = 'collaborator-row';
    row.id = `collaborator-${rowId}`;
    row.innerHTML = `
        <input type="number" class="collaborator-id" placeholder="Organizer ID" required>
        <button type="button" class="remove-collaborator" onclick="removeCollaboratorRow('${rowId}')">×</button>
    `;
    container.appendChild(row);
}

function removeCollaboratorRow(rowId) {
    const row = document.getElementById(`collaborator-${rowId}`);
    if (row) row.remove();
}

function getCollaboratorsJson() {
    const inputs = document.querySelectorAll('.collaborator-id');
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
    
    // Convert numeric fields
    data.max_participants = parseInt(data.max_participants);
    data.application_required = parseInt(data.application_required);
    data.organizer_id = parseInt(data.organizer_id);
    
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
        
        // Send to backend
        const response = await fetch('http://localhost:3000/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        
        if (result.success) {
            alert(`Event created successfully! Event ID: ${result.newEventId}`);
            e.target.reset(); // Reset form
            // Reset dynamic fields
            document.getElementById('applicationFields').classList.add('hidden');
            document.getElementById('onlineLinkField').classList.add('hidden');
            document.getElementById('collaboratorsContainer').classList.add('hidden');
            document.getElementById('collaboratorRows').innerHTML = '';
            // Uncheck all categories
            document.querySelectorAll('.category-checkbox').forEach(cb => cb.checked = false);
        } else {
            alert('Failed to create event: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while creating the event: ' + error.message);
    }
}