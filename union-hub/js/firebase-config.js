/* ============================================================
   UNION HUB TANZANIA - firebase-config.js
   ============================================================ */

// 1. CONFIGURATION YA FIREBASE (Iliyothibitishwa)
const firebaseConfig = {
  apiKey: "AIzaSyBURKGa_MpkZ6EKrC1uQmthncgu303nxrY",
  authDomain: "muungano-hub.firebaseapp.com",
  projectId: "muungano-hub",
  storageBucket: "muungano-hub.firebasestorage.app",
  messagingSenderId: "91759664055",
  appId: "1:91759664055:web:ef0172717cf77ca6646632"
};

// 2. INITIALIZE FIREBASE APP
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// 3. EXPORT SERVICES KWA AJILI YA APPS ZOTE
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// 4. HELPER FUNCTIONS KWA AJILI YA KURASA ZAKO ZOTE

/**
 * Kuangalia kama mtumiaji ameingia (Authentication state listener)
 * @param {Function} callback - Inarudisha (user) akipatikana au null
 */
function onAuthStateChange(callback) {
  auth.onAuthStateChanged((user) => {
    if (callback) callback(user);
  });
}

/**
 * Kuangalia kama mtumiaji aliyeingia ni Admin
 * @returns {Promise<boolean>}
 */
async function checkIfAdmin() {
  const user = auth.currentUser;
  if (!user) return false;
  
  try {
    const userDoc = await db.collection('users').doc(user.uid).get();
    return userDoc.exists && userDoc.data().role === 'admin';
  } catch (error) {
    console.error("Kosa la kuangalia Admin status:", error);
    return false;
  }
}

/**
 * Ongeza idadi ya Page Views kwenye mfumo (Analytics)
 * @param {string} pageName - Jina la ukurasa (mfano: 'timemachine', 'ar', 'home')
 */
async function trackPageView(pageName) {
  try {
    const pageRef = db.collection('pageViews').doc(pageName);
    await pageRef.set({
      views: firebase.firestore.FieldValue.increment(1),
      lastVisited: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.warn("Analytics Error:", error);
  }
}

// Tekeleza tracking ya page view kiotomatiki ukurasa ukifunguka
document.addEventListener('DOMContentLoaded', () => {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  trackPageView(currentPath.replace('.html', ''));
});
