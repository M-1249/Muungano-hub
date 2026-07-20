/**
 * UNION HUB TANZANIA - ar.js
 * AR (Augmented Reality) 3D functionality
 * Inaonyesha matukio ya kihistoria kwa njia ya 3D models
 */

// AR Models Data
let arModels = [];

// Initialize AR.js
function initializeAR() {
    // Check if device supports WebGL
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
        console.warn('WebGL is not supported on this device');
        showARFallback();
        return;
    }

    // Load AR models from Firebase
    loadARModels();
}

// Load AR models from Firebase
async function loadARModels() {
    try {
        const snapshot = await db.collection('ar_models')
            .orderBy('year', 'asc')
            .get();
        
        arModels = [];
        snapshot.forEach(doc => {
            arModels.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        renderARGallery();
    } catch (error) {
        console.error('Hitilafu katika kupakua AR models:', error);
        showARFallback();
    }
}

// Render AR Gallery
function renderARGallery() {
    const arGallery = document.getElementById('arGallery');
    if (!arGallery) return;
    
    arGallery.innerHTML = '';
    
    if (arModels.length === 0) {
        arGallery.innerHTML = '<p style="text-align: center; color: #999;">Hakuna AR models bado</p>';
        return;
    }
    
    arModels.forEach((model, index) => {
        const modelCard = document.createElement('div');
        modelCard.className = 'ar-model-card';
        
        modelCard.innerHTML = `
            <div class="ar-card-image">
                <img src="${model.thumbnailUrl}" alt="${model.title}" loading="lazy">
                <div class="ar-badge">${model.year}</div>
            </div>
            <div class="ar-card-content">
                <h3>${model.title}</h3>
                <p>${model.description}</p>
                <div class="ar-card-actions">
                    <button class="btn btn-primary" onclick="viewAR3D('${model.id}')">
                        🔮 Tazama 3D
                    </button>
                    ${model.modelUrl ? `
                        <a href="${model.modelUrl}" class="btn btn-secondary" download>
                            ⬇️ Pakua Model
                        </a>
                    ` : ''}
                </div>
            </div>
        `;
        
        arGallery.appendChild(modelCard);
    });
}

// View 3D Model
function viewAR3D(modelId) {
    const model = arModels.find(m => m.id === modelId);
    if (!model) return;
    
    // Open 3D viewer modal
    const modal = document.getElementById('ar3DModal');
    if (modal) {
        modal.style.display = 'flex';
        load3DModel(model);
    }
}

// Load 3D Model using Three.js
async function load3DModel(model) {
    const container = document.getElementById('ar3DContainer');
    if (!container) return;
    
    try {
        // Initialize Three.js scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf0f0f0);
        
        const camera = new THREE.PerspectiveCamera(
            75,
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        );
        camera.position.z = 5;
        
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        container.innerHTML = '';
        container.appendChild(renderer.domElement);
        
        // Add lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);
        
        // Load model
        if (model.modelUrl) {
            const loader = new THREE.GLTFLoader();
            loader.load(model.modelUrl, (gltf) => {
                const object = gltf.scene;
                object.scale.set(2, 2, 2);
                scene.add(object);
                
                // Auto-rotate
                function animate() {
                    requestAnimationFrame(animate);
                    object.rotation.x += 0.005;
                    object.rotation.y += 0.01;
                    renderer.render(scene, camera);
                }
                animate();
            });
        } else {
            // Create default 3D shape
            createDefault3DShape(scene, renderer, camera);
        }
        
        // Handle window resize
        window.addEventListener('resize', () => {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        });
        
    } catch (error) {
        console.error('Hitilafu katika kupakia model ya 3D:', error);
        container.innerHTML = '<p style="color: red;">Hitilafu katika kupakia model</p>';
    }
}

// Create default 3D shape
function createDefault3DShape(scene, renderer, camera) {
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshPhongMaterial({ color: 0x2196F3 });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    
    function animate() {
        requestAnimationFrame(animate);
        cube.rotation.x += 0.005;
        cube.rotation.y += 0.01;
        renderer.render(scene, camera);
    }
    animate();
}

// Show AR Fallback (if WebGL not supported)
function showARFallback() {
    const arGallery = document.getElementById('arGallery');
    if (arGallery) {
        arGallery.innerHTML = `
            <div style="background: #fff3cd; padding: 20px; border-radius: 8px; text-align: center;">
                <p style="color: #856404; margin: 0;">
                    📱 Simu yako haisupport AR 3D kwa sasa. Tafadhali tumia simu na WebGL support.
                </p>
            </div>
        `;
    }
}

// Close 3D Modal
function closeAR3DModal() {
    const modal = document.getElementById('ar3DModal');
    if (modal) {
        modal.style.display = 'none';
        const container = document.getElementById('ar3DContainer');
        if (container) container.innerHTML = '';
    }
}

// Add AR Model (Admin function)
async function addARModel(modelData) {
    try {
        if (!modelData.year || !modelData.title || !modelData.description) {
            throw new Error('Tafadhali jaza sehemu zote muhimu');
        }
        
        const docRef = await db.collection('ar_models').add({
            year: parseInt(modelData.year),
            title: modelData.title,
            description: modelData.description,
            details: modelData.details || '',
            thumbnailUrl: modelData.thumbnailUrl || '',
            modelUrl: modelData.modelUrl || '',
            createdAt: new Date(),
            createdBy: auth.currentUser.uid
        });
        
        await loadARModels();
        
        return {
            success: true,
            message: 'AR model imeongezwa kwa mafanikio',
            id: docRef.id
        };
    } catch (error) {
        console.error('Hitilafu:', error);
        return {
            success: false,
            message: error.message
        };
    }
}

// Update AR Model (Admin function)
async function updateARModel(modelId, modelData) {
    try {
        await db.collection('ar_models').doc(modelId).update({
            year: parseInt(modelData.year),
            title: modelData.title,
            description: modelData.description,
            details: modelData.details || '',
            thumbnailUrl: modelData.thumbnailUrl || '',
            modelUrl: modelData.modelUrl || '',
            updatedAt: new Date(),
            updatedBy: auth.currentUser.uid
        });
        
        await loadARModels();
        
        return {
            success: true,
            message: 'AR model limebadilishwa kwa mafanikio'
        };
    } catch (error) {
        console.error('Hitilafu:', error);
        return {
            success: false,
            message: error.message
        };
    }
}

// Delete AR Model (Admin function)
async function deleteARModel(modelId) {
    try {
        await db.collection('ar_models').doc(modelId).delete();
        await loadARModels();
        
        return {
            success: true,
            message: 'AR model limeondolewa kwa mafanikio'
        };
    } catch (error) {
        console.error('Hitilafu:', error);
        return {
            success: false,
            message: error.message
        };
    }
}

// Upload AR Model file
async function uploadARModelFile(file) {
    try {
        if (!file) throw new Error('Hakuna faili iliyochaguliwa');
        
        const fileName = `ar_models/${Date.now()}_${file.name}`;
        const storageRef = firebase.storage().ref(fileName);
        
        const snapshot = await storageRef.put(file);
        const downloadUrl = await snapshot.ref.getDownloadURL();
        
        return {
            success: true,
            url: downloadUrl
        };
    } catch (error) {
        console.error('Hitilafu:', error);
        return {
            success: false,
            message: error.message
        };
    }
}

// Get AR Models for admin
async function getARModelsForAdmin() {
    try {
        const snapshot = await db.collection('ar_models')
            .orderBy('year', 'asc')
            .get();
        
        const models = [];
        snapshot.forEach(doc => {
            models.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return models;
    } catch (error) {
        console.error('Hitilafu:', error);
        return [];
    }
}

// Export AR Models data
async function exportARModelsData() {
    try {
        const models = await getARModelsForAdmin();
        const dataStr = JSON.stringify(models, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `ar_models_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Hitilafu:', error);
    }
}

// Initialize AR on page load
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('arGallery')) {
        initializeAR();
    }
});  

