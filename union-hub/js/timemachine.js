/**
 * UNION HUB TANZANIA - timeline.js
 * Timeline ya 'Pro' inayodhibitiwa na Admin Panel
 * Inaonyesha matukio ya kihistoria na picha za animantion
 */

// Timeline Events Data Structure
let timelineEvents = [];

// Load timeline events from Firebase
async function loadTimelineEvents() {
    try {
        const snapshot = await db.collection('timeline_events')
            .orderBy('year', 'asc')
            .get();
        
        timelineEvents = [];
        snapshot.forEach(doc => {
            timelineEvents.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        renderTimeline();
    } catch (error) {
        console.error('Hitilafu katika kupakua matukio ya timeline:', error);
    }
}

// Render Timeline on History Page
function renderTimeline() {
    const timelineContainer = document.getElementById('timelineContainer');
    if (!timelineContainer) return;
    
    timelineContainer.innerHTML = '';
    
    timelineEvents.forEach((event, index) => {
        const timelineItem = document.createElement('div');
        timelineItem.className = 'timeline-item';
        timelineItem.setAttribute('data-year', event.year);
        
        const isLeft = index % 2 === 0;
        timelineItem.classList.add(isLeft ? 'timeline-left' : 'timeline-right');
        
        timelineItem.innerHTML = `
            <div class="timeline-content">
                <div class="timeline-year">${event.year}</div>
                <div class="timeline-title">${event.title}</div>
                <p class="timeline-description">${event.description}</p>
                
                ${event.imageUrl ? `
                    <div class="timeline-image">
                        <img src="${event.imageUrl}" alt="${event.title}" 
                             loading="lazy" onload="animateTimelineImage(this)">
                    </div>
                ` : ''}
                
                ${event.details ? `
                    <div class="timeline-details">
                        <p><strong>Maelezo:</strong></p>
                        <p>${event.details}</p>
                    </div>
                ` : ''}
            </div>
            <div class="timeline-dot"></div>
        `;
        
        timelineContainer.appendChild(timelineItem);
    });
    
    // Initialize intersection observer for animations
    observeTimelineItems();
}

// Animate timeline items on scroll
function observeTimelineItems() {
    const options = {
        threshold: 0.3,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('timeline-visible');
                observer.unobserve(entry.target);
            }
        });
    }, options);
    
    document.querySelectorAll('.timeline-item').forEach(item => {
        observer.observe(item);
    });
}

// Animate timeline image when loaded
function animateTimelineImage(img) {
    img.style.animation = 'fadeInScale 0.8s ease-out forwards';
}

// Add event to timeline (Admin function)
async function addTimelineEvent(eventData) {
    try {
        // Validate data
        if (!eventData.year || !eventData.title || !eventData.description) {
            throw new Error('Tafadhali jaza sehemu zote muhimu');
        }
        
        // Add to Firebase
        const docRef = await db.collection('timeline_events').add({
            year: parseInt(eventData.year),
            title: eventData.title,
            description: eventData.description,
            details: eventData.details || '',
            imageUrl: eventData.imageUrl || '',
            createdAt: new Date(),
            createdBy: auth.currentUser.uid
        });
        
        // Reload timeline
        await loadTimelineEvents();
        
        return {
            success: true,
            message: 'Tukio limeongezwa kwa mafanikio',
            id: docRef.id
        };
    } catch (error) {
        console.error('Hitilafu katika kuongeza tukio:', error);
        return {
            success: false,
            message: error.message
        };
    }
}

// Update timeline event (Admin function)
async function updateTimelineEvent(eventId, eventData) {
    try {
        await db.collection('timeline_events').doc(eventId).update({
            year: parseInt(eventData.year),
            title: eventData.title,
            description: eventData.description,
            details: eventData.details || '',
            imageUrl: eventData.imageUrl || '',
            updatedAt: new Date(),
            updatedBy: auth.currentUser.uid
        });
        
        await loadTimelineEvents();
        
        return {
            success: true,
            message: 'Tukio limebadilishwa kwa mafanikio'
        };
    } catch (error) {
        console.error('Hitilafu katika kubadilisha tukio:', error);
        return {
            success: false,
            message: error.message
        };
    }
}

// Delete timeline event (Admin function)
async function deleteTimelineEvent(eventId) {
    try {
        await db.collection('timeline_events').doc(eventId).delete();
        await loadTimelineEvents();
        
        return {
            success: true,
            message: 'Tukio limeondolewa kwa mafanikio'
        };
    } catch (error) {
        console.error('Hitilafu katika kuondoa tukio:', error);
        return {
            success: false,
            message: error.message
        };
    }
}

// Upload image to Firebase Storage
async function uploadTimelineImage(file) {
    try {
        if (!file) throw new Error('Hakuna faili iliyochaguliwa');
        
        const fileName = `timeline/${Date.now()}_${file.name}`;
        const storageRef = firebase.storage().ref(fileName);
        
        const snapshot = await storageRef.put(file);
        const downloadUrl = await snapshot.ref.getDownloadURL();
        
        return {
            success: true,
            url: downloadUrl
        };
    } catch (error) {
        console.error('Hitilafu katika kupakia picha:', error);
        return {
            success: false,
            message: error.message
        };
    }
}

// Get timeline events for admin panel
async function getTimelineEventsForAdmin() {
    try {
        const snapshot = await db.collection('timeline_events')
            .orderBy('year', 'asc')
            .get();
        
        const events = [];
        snapshot.forEach(doc => {
            events.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return events;
    } catch (error) {
        console.error('Hitilafu:', error);
        return [];
    }
}

// Export timeline data as JSON
async function exportTimelineData() {
    try {
        const events = await getTimelineEventsForAdmin();
        const dataStr = JSON.stringify(events, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `timeline_events_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Hitilafu katika kuandika data:', error);
    }
}

// Import timeline data from JSON
async function importTimelineData(file) {
    try {
        const text = await file.text();
        const events = JSON.parse(text);
        
        let importedCount = 0;
        for (const event of events) {
            await db.collection('timeline_events').add({
                year: parseInt(event.year),
                title: event.title,
                description: event.description,
                details: event.details || '',
                imageUrl: event.imageUrl || '',
                createdAt: new Date(),
                createdBy: auth.currentUser.uid
            });
            importedCount++;
        }
        
        await loadTimelineEvents();
        
        return {
            success: true,
            message: `${importedCount} matukio yameingia kwa mafanikio`
        };
    } catch (error) {
        console.error('Hitilafu katika kuingiza data:', error);
        return {
            success: false,
            message: error.message
        };
    }
}

// Initialize timeline when page loads
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('timelineContainer')) {
        loadTimelineEvents();
    }
});

