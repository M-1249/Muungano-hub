/* ============================
   UNION HUB TANZANIA - app.js
   ============================ */

/* ---------- PAGE VIEW TRACKING ---------- */
async function recordPageView(pageName) {
  if (typeof db === 'undefined') return;
  try {
    await db.collection('pageViews').doc(pageName).set({
      count: firebase.firestore.FieldValue.increment(1)
    }, { merge: true });
  } catch (err) { /* ignore */ }
}

/* ---------- BRANDING (Logo & Theme) ---------- */
async function applyBranding() {
  if (typeof db === 'undefined') return;
  try {
    /* --- Logo --- */
    const brandDoc = await db.collection('siteSettings').doc('branding').get();
    if (brandDoc.exists && brandDoc.data().logoUrl) {
      const logo = document.querySelector('.navbar .logo');
      if (logo) {
        logo.innerHTML = `<img src="${brandDoc.data().logoUrl}" style="height:36px;vertical-align:middle;border-radius:4px">`;
      }
    }

    /* --- Hero Background Image --- */
    const heroImgDoc = await db.collection('siteImages').doc('hero_bg').get();
    const hero = document.querySelector('.hero');

    if (hero) {
      if (heroImgDoc.exists && heroImgDoc.data().url) {
        /* Weka picha kama background */
        hero.style.backgroundImage = `url('${heroImgDoc.data().url}')`;
        hero.style.backgroundSize = 'cover';
        hero.style.backgroundPosition = 'center';
        /* Overlay inabaki kutoka CSS ::before — maandishi yanaonekana */
      } else {
        /* Hakuna picha — tumia gradient ya kawaida */
        hero.style.backgroundImage = 'none';
      }
    }

    /* --- Hero Overlay Colors (rangi juu ya picha) --- */
    const themeDoc = await db.collection('siteSettings').doc('theme').get();
    if (themeDoc.exists && hero) {
      const t = themeDoc.data();
      if (t.heroColor1) {
        /* Badilisha overlay ya ::before kwa kutumia CSS variable */
        const c1 = hexToRgb(t.heroColor1);
        const c2 = hexToRgb(t.heroColor2 || t.heroColor1);
        const c3 = hexToRgb(t.heroColor3 || t.heroColor1);

        /* Injecting override via style tag */
        let styleTag = document.getElementById('heroOverrideStyle');
        if (!styleTag) {
          styleTag = document.createElement('style');
          styleTag.id = 'heroOverrideStyle';
          document.head.appendChild(styleTag);
        }
        styleTag.textContent = `.hero::before {
          background: linear-gradient(135deg,
            rgba(${c1},0.75) 0%,
            rgba(${c2},0.62) 60%,
            rgba(${c3},0.55) 100%) !important;
        }`;

        /* Kama hakuna picha, badilisha background color badala yake */
        if (!heroImgDoc.exists || !heroImgDoc.data().url) {
          hero.style.background = `linear-gradient(135deg, ${t.heroColor1} 0%, ${t.heroColor2 || t.heroColor1} 60%, ${t.heroColor3 || t.heroColor1} 100%)`;
        }
      }
    }

  } catch (err) { /* ignore */ }
}

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(h => h + h).join('');
  const r = parseInt(hex.substring(0,2), 16);
  const g = parseInt(hex.substring(2,4), 16);
  const b = parseInt(hex.substring(4,6), 16);
  return `${r},${g},${b}`;
}
document.addEventListener('DOMContentLoaded', applyBranding);

/* ---------- DYNAMIC NAV ITEMS (added by Admin) ---------- */
async function loadCustomNavItems() {
  const navLinks = document.getElementById('navLinks');
  if (!navLinks || typeof db === 'undefined') return;
  try {
    const snap = await db.collection('navItems').get();
    if (snap.empty) return;
    const items = snap.docs.map(d => d.data()).sort((a,b) => (a.order||0)-(b.order||0));
    const cta = navLinks.querySelector('.nav-cta');
    const langBtn = navLinks.querySelector('.lang-btn');
    const refNode = cta || langBtn || null;
    items.forEach(d => {
      if (navLinks.querySelector('a[href="' + d.url + '"]')) return;
      const a = document.createElement('a');
      a.href = d.url;
      a.textContent = d.label;
      navLinks.insertBefore(a, refNode);
    });
  } catch (err) { /* ignore */ }
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

/* ---------- REAL-TIME LISTENER HELPER ---------- */
function watchCollection(collectionName, callback, sortFn) {
  if (typeof db === 'undefined') return;
  return db.collection(collectionName).onSnapshot(snap => {
    const docs = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
    callback(sortFn ? docs.sort(sortFn) : docs);
  }, err => console.warn('onSnapshot error:', collectionName, err.message));
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
    await db.collection('users').doc(cred.user.uid).update({ lastLogin: new Date().toISOString() }).catch(() => {});
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

function downloadCertificateWithPhoto(name, score, total, format) {
  const input = document.getElementById('certPhotoInput');
  const file = input && input.files[0];
  if (!file) {
    generateCertificate(name, score, total, null, format || 'png');
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    generateCertificate(name, score, total, e.target.result, format || 'png');
  };
  reader.readAsDataURL(file);
}

/* ---------- CERTIFICATE GENERATOR ---------- */
function generateCertificate(name, score, total, photoDataUrl, format) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 850;
  const ctx = canvas.getContext('2d');

  function drawCertificateBody() {
    const grad = ctx.createLinearGradient(0, 0, 1200, 850);
    grad.addColorStop(0, '#f6f3ea');
    grad.addColorStop(1, '#fdfbf5');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1200, 850);

    ctx.lineWidth = 14; ctx.strokeStyle = '#1b7a3d'; ctx.strokeRect(30, 30, 1140, 790);
    ctx.lineWidth = 6;  ctx.strokeStyle = '#f2c14e'; ctx.strokeRect(50, 50, 1100, 750);
    ctx.lineWidth = 2;  ctx.strokeStyle = '#1c6fa5'; ctx.strokeRect(64, 64, 1072, 722);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#0d1310'; ctx.font = 'bold 26px Georgia';
    ctx.fillText('JAMHURI YA MUUNGANO WA TANZANIA', 600, 130);
    ctx.fillStyle = '#1b7a3d'; ctx.font = 'bold 50px Georgia';
    ctx.fillText('CHETI CHA PONGEZI', 600, 200);
    ctx.fillStyle = '#444'; ctx.font = '22px Georgia';
    ctx.fillText('Certificate of Appreciation', 600, 235);
    ctx.fillStyle = '#333'; ctx.font = '20px Georgia';
    ctx.fillText('Kinatolewa na UNION HUB TANZANIA kwa', 600, 360);
    ctx.fillStyle = '#1c6fa5'; ctx.font = 'bold italic 44px Georgia';
    ctx.fillText(name, 600, 430);
    ctx.fillStyle = '#333'; ctx.font = '20px Georgia';
    ctx.fillText('Kwa kufaulu Quiz ya Historia na Faida za Muungano wa Tanzania', 600, 485);
    ctx.font = 'bold 26px Georgia'; ctx.fillStyle = '#0d1310';
    ctx.fillText(`Alama: ${score} kati ya ${total}`, 600, 525);
    const dateStr = new Date().toLocaleDateString('sw-TZ', { year:'numeric', month:'long', day:'numeric' });
    ctx.font = '18px Georgia'; ctx.fillStyle = '#555';
    ctx.fillText('Tarehe: ' + dateStr, 600, 580);
    ctx.font = 'italic 17px Georgia'; ctx.fillStyle = '#888';
    ctx.fillText('"Muungano Wetu, Nguvu Yetu"', 600, 700);
    ctx.font = 'bold 19px Georgia'; ctx.fillStyle = '#1b7a3d';
    ctx.fillText('UNION HUB TANZANIA', 600, 740);
    ctx.font = '14px Georgia'; ctx.fillStyle = '#999';
    ctx.fillText('Imetengenezwa na Mkungu Alias | Dodoma, Tanzania', 600, 800);

    triggerDownload();
  }

  function triggerDownload() {
    if (format === 'pdf') {
      try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1200, 850] });
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 1200, 850);
        pdf.save(`Cheti-Muungano-${name.replace(/\s+/g, '_')}.pdf`);
      } catch (err) {
        // Fallback to PNG if jsPDF not loaded
        const link = document.createElement('a');
        link.download = `Cheti-Muungano-${name.replace(/\s+/g, '_')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    } else {
      const link = document.createElement('a');
      link.download = `Cheti-Muungano-${name.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  }

  if (photoDataUrl) {
    const img = new Image();
    img.onload = function() {
      drawCertificateBody();
      const cx = 950, cy = 250, r = 75;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
      ctx.restore();
      ctx.lineWidth = 4; ctx.strokeStyle = '#1b7a3d';
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      triggerDownload();
    };
    img.src = photoDataUrl;
  } else {
    drawCertificateBody();
  }
}

/* ---------- QUIZ DATA (50 maswali) ---------- */
const QUIZ_QUESTIONS = [
  { q:"Muungano wa Tanganyika na Zanzibar ulifanyika tarehe gani?", options:["26 Aprili 1964","9 Disemba 1961","12 Januari 1964","10 Disemba 1963"], answer:0 },
  { q:"Rais wa kwanza wa Tanganyika alikuwa nani?", options:["Abeid Amani Karume","Julius Kambarage Nyerere","Ali Hassan Mwinyi","Jakaya Kikwete"], answer:1 },
  { q:"Rais wa kwanza wa Zanzibar (wakati wa Muungano) alikuwa nani?", options:["Abeid Amani Karume","Julius Nyerere","Amani Karume","Aboud Jumbe"], answer:0 },
  { q:"Jina la nchi lililotokana na Muungano ni?", options:["Jumuiya ya Afrika Mashariki","Jamhuri ya Muungano wa Tanzania","Tanganyika Kuu","Zanzibar Mpya"], answer:1 },
  { q:"Bendera ya Tanzania ina rangi ngapi kuu?", options:["Mbili","Tatu","Nne","Tano"], answer:2 },
  { q:"Mojawapo ya faida za Muungano ni?", options:["Migawanyiko ya kikabila","Amani na Ushirikiano","Vita vya wenyewe kwa wenyewe","Kuongezeka kwa mipaka"], answer:1 },
  { q:"Tanganyika ilipata uhuru wake tarehe gani?", options:["9 Disemba 1961","26 Aprili 1964","12 Januari 1964","1 Mei 1964"], answer:0 },
  { q:"Zanzibar ilipata mapinduzi yake tarehe gani?", options:["26 Aprili 1964","12 Januari 1964","9 Disemba 1961","5 Julai 1964"], answer:1 },
  { q:"Lugha rasmi inayotumika kuunganisha Watanzania ni?", options:["Kiingereza","Kifaransa","Kiswahili","Kiarabu"], answer:2 },
  { q:"Sekta gani hufaidika kwa kuwa na soko moja la Muungano?", options:["Biashara","Vita","Migogoro ya ardhi","Ukoloni"], answer:0 },
  { q:"Mji mkuu wa Tanzania (Serikali) ni upi?", options:["Dar es Salaam","Zanzibar","Dodoma","Arusha"], answer:2 },
  { q:"Mlima mrefu zaidi Afrika (ulio Tanzania) unaitwa nani?", options:["Mlima Kenya","Mlima Kilimanjaro","Mlima Meru","Mlima Rwenzori"], answer:1 },
  { q:"Ziwa kubwa zaidi Afrika Mashariki linalopakana na Tanzania ni?", options:["Ziwa Tanganyika","Ziwa Turkana","Ziwa Victoria","Ziwa Malawi"], answer:2 },
  { q:"Chama cha kwanza cha siasa Tanzania Bara kilikuwa kipi?", options:["CCM","ASP","TANU","CUF"], answer:2 },
  { q:"ASP (Afro-Shirazi Party) iliongoza mapinduzi ya Zanzibar mwaka gani?", options:["1961","1964","1963","1967"], answer:1 },
  { q:"Julius Nyerere alifahamika pia kwa jina gani la heshima?", options:["Mkombozi","Mwalimu","Baba wa Taifa","Zote mbili B na C"], answer:3 },
  { q:"Mkataba wa Muungano (Articles of Union) ulisainiwa lini?", options:["26 Aprili 1964","22 Aprili 1964","12 Januari 1964","1 Mei 1964"], answer:1 },
  { q:"Sera ya Ujamaa na Kujitegemea ilipigwa kelele na nani?", options:["Karume","Nyerere","Mwinyi","Mkapa"], answer:1 },
  { q:"Tamko la Arusha lilitolewa mwaka gani?", options:["1964","1967","1961","1977"], answer:1 },
  { q:"CCM iliundwa mwaka gani kwa kuunganisha TANU na ASP?", options:["1977","1964","1980","1990"], answer:0 },
  { q:"Zanzibar ipo katika bahari gani?", options:["Bahari ya Shamu","Bahari Hindi","Bahari ya Arabuni","Bahari Atlantiki"], answer:1 },
  { q:"Tanzania inapakana na nchi ngapi?", options:["Sita","Saba","Nane","Tisa"], answer:2 },
  { q:"Bandari kuu ya Tanzania iko wapi?", options:["Zanzibar","Tanga","Dar es Salaam","Mtwara"], answer:2 },
  { q:"Sarafu ya Tanzania inaitwa nini?", options:["Shilingi","Dola","Paundi","Faranga"], answer:0 },
  { q:"Rais wa kwanza kuchaguliwa kidemokrasia baada ya mfumo wa vyama vingi Tanzania ni?", options:["Ali Hassan Mwinyi","Benjamin Mkapa","Jakaya Kikwete","John Magufuli"], answer:1 },
  { q:"Mnamo mwaka gani Tanzania ilianzisha mfumo wa vyama vingi vya siasa?", options:["1990","1992","1995","2000"], answer:1 },
  { q:"Hifadhi ya wanyama kubwa zaidi duniani iko Tanzania, inaitwa?", options:["Serengeti","Ngorongoro","Tarangire","Selous"], answer:0 },
  { q:"Magofu ya zamani ya Kilwa Kisiwani yanaonyesha mfano wa?", options:["Ustaarabu wa kale wa pwani","Vita vya kale","Ujenzi wa kisasa","Mabaki ya wanyama"], answer:0 },
  { q:"Zanzibar inajulikana zaidi duniani kwa uzalishaji wa nini?", options:["Kahawa","Karafuu","Pamba","Sisal"], answer:1 },
  { q:"Ambavyo Tanzania inashiriki katika uchumi wa kimataifa zaidi ni?", options:["Utalii","Madini","Kilimo","Viwanda"], answer:0 },
  { q:"Kiongozi wa kwanza wa CCM alikuwa nani?", options:["Karume","Nyerere","Mwinyi","Jumbe"], answer:1 },
  { q:"Bonde la Ufa (Great Rift Valley) linapita kwenye sehemu gani ya Tanzania?", options:["Mashariki","Magharibi","Kaskazini","Kusini"], answer:1 },
  { q:"Nchi gani haikushiriki katika kuanzisha Jumuiya ya Afrika Mashariki (1967)?", options:["Kenya","Uganda","Tanzania","Burundi"], answer:3 },
  { q:"Muundo wa serikali ya Tanzania una ngazi ngapi kuu?", options:["Moja","Mbili","Tatu","Nne"], answer:1 },
  { q:"Zanzibar ina hali gani maalum ndani ya Muungano wa Tanzania?", options:["Mkoa tu","Serikali ya Mapinduzi (SMZ) huru ndani ya Muungano","Nchi huru kabisa","Mkoa wa kimataifa"], answer:1 },
  { q:"Mwandishi mashuhuri wa Tanzania aliyejulikana kwa vitabu vya Kiswahili ni nani?", options:["Shaaban Robert","Ngugi wa Thiong'o","Chinua Achebe","Wole Soyinka"], answer:0 },
  { q:"Tanzania iliungana na nchi gani kuunda Jumuiya ya Afrika Mashariki mapya mwaka 2000?", options:["Kenya na Uganda","Kenya, Uganda na Rwanda","Kenya, Uganda, Rwanda na Burundi","Nchi zote hapo juu"], answer:3 },
  { q:"Rasilimali gani mpya iliyogunduliwa Tanzania na kuinua uchumi mwaka wa 2010s?", options:["Mafuta","Gesi asilia","Dhahabu","Madini ya almasi"], answer:1 },
  { q:"Chanzo kikuu cha umeme Tanzania ni?", options:["Nishati ya jua","Mto Rufiji (Maji)","Makaa ya mawe","Gesi asilia"], answer:3 },
  { q:"Kisiwa gani kikubwa zaidi Tanzania?", options:["Mafia","Pemba","Zanzibar (Unguja)","Latham"], answer:2 },
  { q:"Mto mrefu zaidi Tanzania unaitwa nini?", options:["Mto Rufiji","Mto Ruvuma","Mto Ruaha","Mto Kagera"], answer:0 },
  { q:"Chuo Kikuu cha kwanza Tanzania (Dar es Salaam) kilianzishwa mwaka gani?", options:["1961","1964","1970","1956"], answer:1 },
  { q:"Tanzania ilianza rasmi kutumia jina 'Tanzania' mwaka gani?", options:["1964","1965","1967","1961"], answer:0 },
  { q:"Idadi ya mikoa ya Tanzania Bara (2024) ni?", options:["26","25","28","30"], answer:0 },
  { q:"Mikoa ya Zanzibar inajumuisha nini?", options:["Unguja Kaskazini, Unguja Kusini, Mjini Magharibi, Kaskazini Pemba, Kusini Pemba","Dar, Pwani, Zanzibar","Unguja na Pemba tu (mikoa 2)","Mikoa 10"], answer:0 },
  { q:"Makao makuu ya Zanzibar yanaitwa?", options:["Mji wa Zanzibar (Stone Town)","Wete","Chake Chake","Mkokotoni"], answer:0 },
  { q:"Wimbo wa Taifa wa Tanzania unaanza na maneno gani?", options:["'Mungu ibariki Afrika'","'Ee Mungu nguvu yetu'","'Tanzania Tanzania'","'Amkeni ndugu zetu'"], answer:0 },
  { q:"Kanuni ya 'Haki, Uhuru na Maendeleo' ni kauli mbiu ya nini?", options:["TANU","Jamhuri ya Tanzania","Chuo Kikuu cha DSM","CCM"], answer:1 },
  { q:"Mwalimu Nyerere alistaafu urais mwaka gani?", options:["1985","1990","1980","1977"], answer:0 },
  { q:"Mkutano wa kwanza wa viongozi wa Muungano ulifanyika wapi?", options:["Dar es Salaam","Zanzibar","Dodoma","Arusha"], answer:1 },
];

let quizState = { index: 0, score: 0, answered: false };
let ACTIVE_QUESTIONS = QUIZ_QUESTIONS;

async function loadQuiz() {
  quizState = { index: 0, score: 0, answered: false };

  /* HATUA 1: Onyesha maswali ya default MARA MOJA bila kusubiri */
  ACTIVE_QUESTIONS = [...QUIZ_QUESTIONS];
  renderQuestion();

  /* HATUA 2: Jaribu Firestore kwa background (bila kuzuia quiz) */
  if (typeof db !== 'undefined') {
    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 4000)
      );
      const snap = await Promise.race([
        db.collection('questions').get(),
        timeout
      ]);

      if (!snap.empty) {
        const fromDB = snap.docs.map(doc => {
          const d = doc.data();
          return {
            q: d.q,
            options: Array.isArray(d.options) ? d.options : [],
            answer: Number(d.answer) || 0
          };
        }).filter(q => q.q && q.options.length === 4);

        if (fromDB.length > 0) {
          const dbKeys = new Set(fromDB.map(q => q.q.trim().toLowerCase()));
          const extras = QUIZ_QUESTIONS.filter(q =>
            !dbKeys.has(q.q.trim().toLowerCase())
          );
          ACTIVE_QUESTIONS = [...fromDB, ...extras];

          /* Reanza quiz na maswali yote kama bado hatujaanza kujibu */
          if (quizState.index === 0 && !quizState.answered) {
            renderQuestion();
          }
        }
      }
    } catch (err) {
      /* Endelea na maswali ya default — hakuna shida */
      console.log('Using default questions:', err.message);
    }
  }
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
  savePartialProgress();
}

async function savePartialProgress() {
  const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
  if (!user || !user.uid) return;
  try {
    await db.collection('users').doc(user.uid).update({
      lastQuizAttempt: {
        score: quizState.score,
        answered: quizState.index + 1,
        total: ACTIVE_QUESTIONS.length,
        completed: false,
        date: new Date().toISOString()
      }
    });
  } catch (err) { /* ignore */ }
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
  db.collection('siteSettings').doc('quizSettings').get().then(doc => {
    const threshold = (doc.exists && doc.data().certThreshold !== undefined) ? doc.data().certThreshold : 60;
    const passed = (quizState.score / total) * 100 >= threshold;
    renderResultBody(total, user, passed);
  }).catch(() => {
    const passed = quizState.score >= Math.ceil(total * 0.6);
    renderResultBody(total, user, passed);
  });
}

function renderResultBody(total, user, passed) {
  const container = document.getElementById('quizContainer');
  const certSection = passed
    ? (user
        ? `<div style="margin-top:14px;border-top:1px solid #eee;padding-top:16px">
             <p style="font-size:0.85rem;color:#555;margin-bottom:8px">Hongera! Unaweza kupakua cheti chako:</p>
             <div class="field">
               <label style="font-size:0.82rem">Pakia picha yako (hiari)</label>
               <input type="file" id="certPhotoInput" accept="image/*" style="width:100%;margin-top:4px">
             </div>
             <div style="display:flex;gap:10px;margin-top:10px;flex-wrap:wrap">
               <button class="btn btn-primary" style="flex:1" onclick="downloadCertificateWithPhoto('${(user.name || '').replace(/'/g, "\\'")}', ${quizState.score}, ${total}, 'png')">🖼️ Pakua kama Picha</button>
               <button class="btn btn-secondary" style="flex:1;color:var(--blue);border-color:var(--blue)" onclick="downloadCertificateWithPhoto('${(user.name || '').replace(/'/g, "\\'")}', ${quizState.score}, ${total}, 'pdf')">📄 Pakua kama PDF</button>
             </div>
           </div>`
        : `<p style="color:#888;font-size:0.85rem;margin-top:10px">Ingia (Login) kwenye akaunti yako ili upakue cheti chenye jina lako.</p>`)
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

/* ---------- DYNAMIC FOOTER ---------- */
async function loadFooter() {
  const grid = document.getElementById('footerGrid');
  if (!grid) return;
  let social = { facebook: '#', instagram: '#', twitter: '#', youtube: '#' };
  try {
    const doc = await db.collection('siteSettings').doc('social').get();
    if (doc.exists) social = { ...social, ...doc.data() };
  } catch (err) {}
  grid.innerHTML = `
    <div>
      <h4>Union Hub TZ</h4>
      <a href="history.html">Historia</a>
      <a href="benefits.html">Faida</a>
      <a href="makala.html">Makala</a>
      <a href="quiz.html">Quiz</a>
    </div>
    <div>
      <h4>Akaunti</h4>
      <a href="login.html">Login</a>
      <a href="register.html">Jisajili</a>
      <a href="dashboard.html">Dashboard</a>
    </div>
    <div>
      <h4>Kampuni</h4>
      <a href="about.html">Kuhusu Sisi</a>
      <a href="privacy.html">Sera ya Faragha</a>
    </div>
    <div>
      <h4>Mitandao ya Kijamii</h4>
      ${social.facebook !== '#' ? `<a href="${social.facebook}" target="_blank">📘 Facebook</a>` : ''}
      ${social.instagram !== '#' ? `<a href="${social.instagram}" target="_blank">📸 Instagram</a>` : ''}
      ${social.twitter !== '#' ? `<a href="${social.twitter}" target="_blank">🐦 Twitter/X</a>` : ''}
      ${social.youtube !== '#' ? `<a href="${social.youtube}" target="_blank">▶️ YouTube</a>` : ''}
    </div>
  `;
}
document.addEventListener('DOMContentLoaded', loadFooter);

/* ---------- SHARE WIDGET ---------- */
function initShareWidget() {
  if (document.getElementById('shareWidget')) return;
  const url = encodeURIComponent(window.location.href);
  const title = encodeURIComponent(document.title);
  const widget = document.createElement('div');
  widget.id = 'shareWidget';
  widget.innerHTML = `
    <button id="shareToggleBtn" title="Shiriki" style="position:fixed;bottom:90px;right:22px;width:46px;height:46px;border-radius:50%;background:var(--blue);color:#fff;font-size:1.2rem;border:none;cursor:pointer;z-index:997;box-shadow:0 4px 14px rgba(0,0,0,0.25)">🔗</button>
    <div id="sharePanel" style="display:none;position:fixed;bottom:145px;right:22px;background:#fff;border-radius:var(--radius);box-shadow:0 4px 20px rgba(0,0,0,0.2);padding:12px;z-index:996;min-width:180px">
      <p style="font-size:0.8rem;font-weight:600;color:#444;margin-bottom:10px">Shiriki tovuti hii:</p>
      <a href="https://wa.me/?text=${title}%20${url}" target="_blank" style="display:flex;align-items:center;gap:8px;padding:8px;border-radius:6px;text-decoration:none;color:#222;font-size:0.88rem;margin-bottom:4px;background:#f0f0f0">📱 WhatsApp</a>
      <a href="https://www.facebook.com/sharer/sharer.php?u=${url}" target="_blank" style="display:flex;align-items:center;gap:8px;padding:8px;border-radius:6px;text-decoration:none;color:#222;font-size:0.88rem;margin-bottom:4px;background:#f0f0f0">📘 Facebook</a>
      <a href="https://twitter.com/intent/tweet?url=${url}&text=${title}" target="_blank" style="display:flex;align-items:center;gap:8px;padding:8px;border-radius:6px;text-decoration:none;color:#222;font-size:0.88rem;margin-bottom:4px;background:#f0f0f0">🐦 Twitter/X</a>
      <button onclick="navigator.clipboard.writeText(window.location.href).then(()=>showToast('Link imenakiliwa!'))" style="display:flex;align-items:center;gap:8px;padding:8px;border-radius:6px;border:none;cursor:pointer;font-size:0.88rem;background:#f0f0f0;width:100%">📋 Nakili Link</button>
    </div>
  `;
  document.body.appendChild(widget);
  document.getElementById('shareToggleBtn').addEventListener('click', () => {
    const panel = document.getElementById('sharePanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  });
}
document.addEventListener('DOMContentLoaded', initShareWidget);

/* ---------- NOTIFICATIONS BELL ---------- */
function initNotificationBell() {
  if (typeof db === 'undefined' || document.getElementById('notifBell')) return;
  const bell = document.createElement('div');
  bell.id = 'notifBell';
  bell.style.cssText = 'position:fixed;top:12px;right:70px;z-index:200;cursor:pointer';
  bell.innerHTML = `
    <button style="background:none;border:none;color:#fff;font-size:1.3rem;cursor:pointer;position:relative" onclick="toggleNotifPanel()">
      🔔<span id="notifBadge" style="display:none;position:absolute;top:-4px;right:-6px;background:#c0392b;color:#fff;font-size:0.6rem;border-radius:50%;width:16px;height:16px;text-align:center;line-height:16px;font-weight:bold">0</span>
    </button>
    <div id="notifPanel" style="display:none;position:fixed;top:58px;right:10px;width:min(300px,88vw);max-height:60vh;overflow-y:auto;background:#fff;border-radius:var(--radius);box-shadow:0 8px 30px rgba(0,0,0,0.25);z-index:999">
      <div style="background:var(--black);color:var(--yellow);padding:12px 14px;font-weight:700;font-size:0.9rem;display:flex;justify-content:space-between">
        <span>🔔 Arifa</span>
        <button onclick="markAllRead()" style="background:none;border:none;color:#ccc;font-size:0.75rem;cursor:pointer">Soma zote</button>
      </div>
      <div id="notifPanelList" style="padding:8px"></div>
    </div>
  `;
  document.body.appendChild(bell);

  /* Real-time listener for notifications */
  db.collection('notifications').onSnapshot(snap => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a,b) => (b.createdAt||'').localeCompare(a.createdAt||''));
    const unread = items.filter(n => !n.read).length;
    const badge = document.getElementById('notifBadge');
    if (unread > 0) {
      badge.textContent = unread > 9 ? '9+' : unread;
      badge.style.display = 'block';
    } else { badge.style.display = 'none'; }

    const list = document.getElementById('notifPanelList');
    if (!items.length) {
      list.innerHTML = '<p style="color:#888;text-align:center;padding:16px;font-size:0.85rem">Hakuna arifa.</p>';
      return;
    }
    list.innerHTML = items.slice(0,15).map(n => `
      <div onclick="markRead('${n.id}')${n.link ? `;window.location.href='${n.link}'` : ''}" style="padding:10px;border-radius:8px;margin-bottom:4px;cursor:pointer;background:${n.read ? '#f9f9f9' : '#EBF8F0'}">
        <strong style="font-size:0.88rem;color:var(--black)">${n.title}</strong>
        <p style="margin:2px 0 0;font-size:0.8rem;color:#555">${n.body}</p>
      </div>
    `).join('');
  });
}

function toggleNotifPanel() {
  const panel = document.getElementById('notifPanel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

async function markRead(id) {
  await db.collection('notifications').doc(id).update({ read: true }).catch(() => {});
}

async function markAllRead() {
  const snap = await db.collection('notifications').where('read','==',false).get().catch(() => null);
  if (!snap) return;
  const batch = db.batch();
  snap.forEach(doc => batch.update(doc.ref, { read: true }));
  await batch.commit();
  document.getElementById('notifPanel').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  auth.onAuthStateChanged(user => { if (user) initNotificationBell(); });
});



