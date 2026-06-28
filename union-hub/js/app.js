/* ============================
   UNION HUB TANZANIA - app.js
   ============================ */

/* ---------- DYNAMIC NAV ITEMS (added by Admin) ---------- */
async function loadCustomNavItems() {
  const navLinks = document.getElementById('navLinks');
  if (!navLinks || typeof db === 'undefined') return;
  try {
    const snap = await db.collection('navItems').orderBy('order', 'asc').get();
    if (snap.empty) return;
    const cta = navLinks.querySelector('.nav-cta');
    const langBtn = navLinks.querySelector('.lang-btn');
    const refNode = cta || langBtn || null;
    snap.forEach(doc => {
      const d = doc.data();
      const a = document.createElement('a');
      a.href = d.url;
      a.textContent = d.label;
      navLinks.insertBefore(a, refNode);
    });
  } catch (err) { /* ignore if not configured */ }
}
document.addEventListener('DOMContentLoaded', loadCustomNavItems);

/* ---------- MOBILE NAV ---------- */
function toggleNav() {
  document.getElementById('navLinks').classList.toggle('open');
}

/* ---------- TOAST ---------- */
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

/* ---------- FIREBASE AUTH & DATABASE ---------- */
let uh_currentUserData = null;

function getCurrentUser() {
  return uh_currentUserData;
}

async function registerUser(name, email, password) {
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await db.collection('users').doc(cred.user.uid).set({
      name, email, scores: [], role: 'member', createdAt: new Date().toISOString()
    });
    uh_currentUserData = { uid: cred.user.uid, name, email, scores: [], role: 'member' };
    return { ok: true };
  } catch (err) {
    return { ok: false, message: translateFirebaseError(err) };
  }
}

async function loginUser(email, password) {
  try {
    const cred = await auth.signInWithEmailAndPassword(email, password);
    const doc = await db.collection('users').doc(cred.user.uid).get();
    uh_currentUserData = { uid: cred.user.uid, ...doc.data() };
    return { ok: true };
  } catch (err) {
    return { ok: false, message: translateFirebaseError(err) };
  }
}

function logout() {
  auth.signOut().then(() => window.location.href = 'index.html');
}

async function saveQuizScore(score, total) {
  if (!uh_currentUserData) return;
  const entry = { score, total, date: new Date().toLocaleDateString('sw-TZ') };
  const ref = db.collection('users').doc(uh_currentUserData.uid);
  await ref.update({
    scores: firebase.firestore.FieldValue.arrayUnion(entry)
  });
  uh_currentUserData.scores = uh_currentUserData.scores || [];
  uh_currentUserData.scores.push(entry);
}

function translateFirebaseError(err) {
  const lang = (typeof getLang === 'function') ? getLang() : 'sw';
  const code = err.code || '';
  const map = {
    sw: {
      'auth/email-already-in-use': 'Barua pepe hii imesajiliwa tayari.',
      'auth/invalid-email': 'Barua pepe si sahihi.',
      'auth/weak-password': 'Password ni dhaifu, tumia herufi 6 au zaidi.',
      'auth/user-not-found': 'Akaunti haipo. Jisajili kwanza.',
      'auth/wrong-password': 'Password sio sahihi.',
      'auth/invalid-credential': 'Barua pepe au password sio sahihi.'
    },
    en: {
      'auth/email-already-in-use': 'This email is already registered.',
      'auth/invalid-email': 'Invalid email address.',
      'auth/weak-password': 'Password is too weak, use 6+ characters.',
      'auth/user-not-found': 'Account not found. Please sign up first.',
      'auth/wrong-password': 'Incorrect password.',
      'auth/invalid-credential': 'Incorrect email or password.'
    }
  };
  return (map[lang] && map[lang][code]) || err.message;
}

/* Protect admin page - only role === 'admin' can enter */
function requireAdmin(callback) {
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    const doc = await db.collection('users').doc(user.uid).get();
    const data = doc.data();
    if (!data || data.role !== 'admin') {
      alert('Huna ruhusa ya kuona ukurasa huu (Admin pekee).');
      window.location.href = 'index.html';
      return;
    }
    uh_currentUserData = { uid: user.uid, ...data };
    if (callback) callback(uh_currentUserData);
  });
}
function requireLogin(callback) {
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    const doc = await db.collection('users').doc(user.uid).get();
    uh_currentUserData = { uid: user.uid, ...doc.data() };
    if (callback) callback(uh_currentUserData);
  });
}

function downloadCertificateWithPhoto(name, score, total) {
  const input = document.getElementById('certPhotoInput');
  const file = input && input.files[0];
  if (!file) {
    generateCertificate(name, score, total, null);
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    generateCertificate(name, score, total, e.target.result);
  };
  reader.readAsDataURL(file);
}

/* ---------- CERTIFICATE GENERATOR ---------- */
function generateCertificate(name, score, total, photoDataUrl) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 850;
  const ctx = canvas.getContext('2d');

  function drawCertificateBody() {
    // Background
    const grad = ctx.createLinearGradient(0, 0, 1200, 850);
    grad.addColorStop(0, '#f6f3ea');
    grad.addColorStop(1, '#fdfbf5');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1200, 850);

    // Outer border (Tanzania colors)
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#1b7a3d';
    ctx.strokeRect(30, 30, 1140, 790);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#f2c14e';
    ctx.strokeRect(50, 50, 1100, 750);
    ctx.strokeStyle = '#1c6fa5';
    ctx.lineWidth = 2;
    ctx.strokeRect(64, 64, 1072, 722);

    ctx.textAlign = 'center';

    // Header
    ctx.fillStyle = '#0d1310';
    ctx.font = 'bold 26px Georgia';
    ctx.fillText('JAMHURI YA MUUNGANO WA TANZANIA', 600, 130);

    ctx.fillStyle = '#1b7a3d';
    ctx.font = 'bold 50px Georgia';
    ctx.fillText('CHETI CHA PONGEZI', 600, 200);

    ctx.fillStyle = '#444';
    ctx.font = '22px Georgia';
    ctx.fillText('Certificate of Appreciation', 600, 235);

    ctx.fillStyle = '#333';
    ctx.font = '20px Georgia';
    ctx.fillText('Kinatolewa na UNION HUB TANZANIA kwa', 600, 360);

    // Name
    ctx.fillStyle = '#1c6fa5';
    ctx.font = 'bold italic 44px Georgia';
    ctx.fillText(name, 600, 430);

    // Body text
    ctx.fillStyle = '#333';
    ctx.font = '20px Georgia';
    ctx.fillText('Kwa kufaulu Quiz ya Historia na Faida za Muungano wa Tanzania', 600, 485);
    ctx.font = 'bold 26px Georgia';
    ctx.fillStyle = '#0d1310';
    ctx.fillText(`Alama: ${score} kati ya ${total}`, 600, 525);

    // Date
    const dateStr = new Date().toLocaleDateString('sw-TZ', { year: 'numeric', month: 'long', day: 'numeric' });
    ctx.font = '18px Georgia';
    ctx.fillStyle = '#555';
    ctx.fillText('Tarehe: ' + dateStr, 600, 580);

    // Footer
    ctx.font = 'italic 17px Georgia';
    ctx.fillStyle = '#888';
    ctx.fillText('"Muungano Wetu, Nguvu Yetu"', 600, 700);

    ctx.font = 'bold 19px Georgia';
    ctx.fillStyle = '#1b7a3d';
    ctx.fillText('UNION HUB TANZANIA', 600, 740);

    ctx.font = '14px Georgia';
    ctx.fillStyle = '#999';
    ctx.fillText('Imetengenezwa na Mkungu Alias | Dodoma, Tanzania', 600, 800);

    triggerDownload();
  }

  function triggerDownload() {
    const link = document.createElement('a');
    link.download = `Cheti-Muungano-${name.replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  if (photoDataUrl) {
    const img = new Image();
    img.onload = function() {
      drawCertificateBody();
      // Draw circular photo top-right area
      const cx = 950, cy = 250, r = 75;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
      ctx.restore();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#1b7a3d';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      triggerDownload();
    };
    img.src = photoDataUrl;
  } else {
    drawCertificateBody();
  }
}

/* ---------- QUIZ DATA ---------- */
const QUIZ_QUESTIONS = [
  {
    q: "Muungano wa Tanganyika na Zanzibar ulifanyika tarehe gani?",
    options: ["26 Aprili 1964", "9 Disemba 1961", "12 Januari 1964", "10 Disemba 1963"],
    answer: 0
  },
  {
    q: "Rais wa kwanza wa Tanganyika alikuwa nani?",
    options: ["Abeid Amani Karume", "Julius Kambarage Nyerere", "Ali Hassan Mwinyi", "Jakaya Kikwete"],
    answer: 1
  },
  {
    q: "Rais wa kwanza wa Zanzibar (wakati wa Muungano) alikuwa nani?",
    options: ["Abeid Amani Karume", "Julius Nyerere", "Amani Karume", "Aboud Jumbe"],
    answer: 0
  },
  {
    q: "Jina la nchi lililotokana na Muungano ni?",
    options: ["Jumuiya ya Afrika Mashariki", "Jamhuri ya Muungano wa Tanzania", "Tanganyika Kuu", "Zanzibar Mpya"],
    answer: 1
  },
  {
    q: "Bendera ya Tanzania ina rangi ngapi kuu?",
    options: ["Mbili", "Tatu", "Nne", "Tano"],
    answer: 2
  },
  {
    q: "Mojawapo ya faida za Muungano ni?",
    options: ["Migawanyiko ya kikabila", "Amani na Ushirikiano", "Vita vya wenyewe kwa wenyewe", "Kuongezeka kwa mipaka"],
    answer: 1
  },
  {
    q: "Tanganyika ilipata uhuru wake tarehe gani?",
    options: ["9 Disemba 1961", "26 Aprili 1964", "12 Januari 1964", "1 Mei 1964"],
    answer: 0
  },
  {
    q: "Zanzibar ilipata mapinduzi yake tarehe gani?",
    options: ["26 Aprili 1964", "12 Januari 1964", "9 Disemba 1961", "5 Julai 1964"],
    answer: 1
  },
  {
    q: "Lugha rasmi inayotumika kuunganisha Watanzania ni?",
    options: ["Kiingereza", "Kifaransa", "Kiswahili", "Kiarabu"],
    answer: 2
  },
  {
    q: "Sekta gani hufaidika kwa kuwa na soko moja la Muungano?",
    options: ["Biashara", "Vita", "Migogoro ya ardhi", "Ukoloni"],
    answer: 0
  }
];

let quizState = { index: 0, score: 0, answered: false };
let ACTIVE_QUESTIONS = QUIZ_QUESTIONS;

async function loadQuiz() {
  quizState = { index: 0, score: 0, answered: false };
  const container = document.getElementById('quizContainer');
  if (container) container.innerHTML = '<p style="text-align:center;color:#888">Inapakia maswali...</p>';

  try {
    const snap = await db.collection('questions').orderBy('order', 'asc').get();
    if (!snap.empty) {
      ACTIVE_QUESTIONS = snap.docs.map(doc => doc.data());
    } else {
      ACTIVE_QUESTIONS = QUIZ_QUESTIONS;
    }
  } catch (err) {
    ACTIVE_QUESTIONS = QUIZ_QUESTIONS;
  }

  renderQuestion();
}

function renderQuestion() {
  const container = document.getElementById('quizContainer');
  if (!container) return;

  if (quizState.index >= ACTIVE_QUESTIONS.length) {
    renderResult();
    return;
  }

  const q = ACTIVE_QUESTIONS[quizState.index];
  const progress = (quizState.index / ACTIVE_QUESTIONS.length) * 100;

  container.innerHTML = `
    <div class="quiz-progress"><div class="quiz-progress-bar" style="width:${progress}%"></div></div>
    <p class="section-eyebrow">Swali ${quizState.index + 1} kati ya ${ACTIVE_QUESTIONS.length}</p>
    <p class="quiz-question">${q.q}</p>
    <div class="quiz-options" id="quizOptions">
      ${q.options.map((opt, i) => `<button class="quiz-option" data-i="${i}" onclick="selectAnswer(${i})">${opt}</button>`).join('')}
    </div>
    <div class="quiz-nav">
      <span></span>
      <button class="btn btn-primary" id="nextBtn" style="display:none" onclick="nextQuestion()">Endelea</button>
    </div>
  `;
  quizState.answered = false;
}

function selectAnswer(i) {
  if (quizState.answered) return;
  quizState.answered = true;
  const q = ACTIVE_QUESTIONS[quizState.index];
  const buttons = document.querySelectorAll('#quizOptions .quiz-option');
  buttons.forEach((btn, idx) => {
    btn.disabled = true;
    if (idx === q.answer) btn.classList.add('correct');
    else if (idx === i && i !== q.answer) btn.classList.add('wrong');
  });
  if (i === q.answer) quizState.score++;
  document.getElementById('nextBtn').style.display = 'inline-block';
}

function nextQuestion() {
  quizState.index++;
  renderQuestion();
}

function renderResult() {
  const container = document.getElementById('quizContainer');
  const total = ACTIVE_QUESTIONS.length;
  const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
  if (user) {
    saveQuizScore(quizState.score, total);
  }
  const passed = quizState.score >= Math.ceil(total * 0.6);
  const certSection = passed
    ? (user
        ? `<div style="margin-top:10px;border-top:1px solid #eee;padding-top:16px">
             <p style="font-size:0.85rem;color:#555;margin-bottom:8px">Pakia picha yako (hiari) ili iwekwe kwenye cheti:</p>
             <input type="file" id="certPhotoInput" accept="image/*" style="margin-bottom:12px">
             <br>
             <button class="btn btn-primary" onclick="downloadCertificateWithPhoto('${(user.name || '').replace(/'/g, "\\'")}', ${quizState.score}, ${total})">🏅 Pakua Cheti Chako</button>
           </div>`
        : `<p style="color:#888;font-size:0.85rem;margin-top:8px">Ingia kwenye akaunti yako (Login) kabla ya kupakua cheti chenye jina lako.</p>`)
    : '';
  container.innerHTML = `
    <div class="quiz-result">
      <p class="section-eyebrow">Umekamilisha Quiz</p>
      <div class="score">${quizState.score} / ${total}</div>
      <p style="margin:14px 0;color:#555">
        ${quizState.score >= 8 ? 'Hongera! Unaifahamu vizuri historia ya Muungano.' :
          quizState.score >= 5 ? 'Vizuri! Lakini bado unaweza kujifunza zaidi.' :
          'Soma zaidi kuhusu historia ya Muungano kisha jaribu tena.'}
      </p>
      <div class="hero-buttons" style="margin-bottom:14px">
        <button class="btn btn-primary" onclick="loadQuiz()">Jaribu Tena</button>
        <a class="btn btn-secondary" href="index.html" style="color:#222;border-color:#222">Rudi Nyumbani</a>
      </div>
      ${certSection}
    </div>
  `;
}

/* ---------- INIT NAV ACTIVE STATE ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    if (link.getAttribute('href') === path) link.classList.add('active');
  });
});
