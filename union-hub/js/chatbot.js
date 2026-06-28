/* ============================
   UNION HUB TANZANIA - chatbot.js
   Chatbot ya FAQ, lugha mbili (sw/en)
   ============================ */

const CHAT_KB = [
  {
    keys: ["muungano ni nini", "what is the union", "union ni nini", "what is union hub"],
    sw: "Muungano ni kuunganika kwa Tanganyika na Zanzibar tarehe 26 Aprili 1964 kuunda Jamhuri ya Muungano wa Tanzania.",
    en: "The Union refers to the merger of Tanganyika and Zanzibar on 26 April 1964, forming the United Republic of Tanzania."
  },
  {
    keys: ["tarehe", "lini muungano", "when did the union", "date of union", "26 aprili"],
    sw: "Muungano ulifanyika tarehe 26 Aprili 1964.",
    en: "The Union took place on 26 April 1964."
  },
  {
    keys: ["nani aliongoza", "viongozi", "who led", "leaders", "nyerere", "karume"],
    sw: "Muungano uliongozwa na Mwalimu Julius Kambarage Nyerere (Rais wa Tanganyika) na Sheikh Abeid Amani Karume (Rais wa Zanzibar).",
    en: "The Union was led by Mwalimu Julius Kambarage Nyerere (President of Tanganyika) and Sheikh Abeid Amani Karume (President of Zanzibar)."
  },
  {
    keys: ["faida", "benefits", "kwa nini muungano", "why union"],
    sw: "Faida za Muungano ni pamoja na amani, elimu, biashara, afya, utalii, na ushirikiano wa kimataifa. Tazama ukurasa wa 'Faida' kwa maelezo zaidi.",
    en: "Benefits of the Union include peace, education, trade, health, tourism, and international cooperation. See the 'Benefits' page for more."
  },
  {
    keys: ["quiz", "jaribio", "test", "maswali"],
    sw: "Unaweza kufanya Quiz yenye maswali 10 kwenye ukurasa wa 'Quiz'. Bonyeza 'Anza Quiz' kwenye menyu.",
    en: "You can take a 10-question quiz on the 'Quiz' page. Click 'Start Quiz' in the menu."
  },
  {
    keys: ["jinsi ya kujisajili", "register", "sign up", "create account", "akaunti"],
    sw: "Bonyeza 'Login' juu, kisha chagua 'Jisajili hapa' kwenye ukurasa wa login kuunda akaunti mpya.",
    en: "Click 'Login' at the top, then choose 'Sign up here' on the login page to create a new account."
  },
  {
    keys: ["pakua", "download", "pdf", "nyaraka"],
    sw: "Nyaraka na PDF zinapatikana kwenye Dashboard yako baada ya kuingia (login).",
    en: "Documents and PDFs are available on your Dashboard once you log in."
  },
  {
    keys: ["habari", "hello", "hi", "mambo", "vipi"],
    sw: "Habari! Karibu Union Hub Tanzania. Niulize chochote kuhusu Muungano.",
    en: "Hello! Welcome to Union Hub Tanzania. Ask me anything about the Union."
  },
  {
    keys: ["asante", "thank you", "thanks"],
    sw: "Karibu sana! Kama una swali lingine, niambie.",
    en: "You're welcome! Let me know if you have another question."
  }
];

let ACTIVE_CHAT_KB = CHAT_KB;

async function loadChatKB() {
  try {
    const snap = await db.collection('chatbotFAQ').get();
    if (!snap.empty) {
      const dynamic = snap.docs.map(doc => {
        const d = doc.data();
        return {
          keys: (d.keywords || '').split(',').map(k => k.trim().toLowerCase()).filter(Boolean),
          sw: d.answerSw || d.answerEn || '',
          en: d.answerEn || d.answerSw || ''
        };
      });
      ACTIVE_CHAT_KB = dynamic.concat(CHAT_KB);
    }
  } catch (err) {
    ACTIVE_CHAT_KB = CHAT_KB;
  }
}

function chatReply(message) {
  const lang = getLang();
  const msg = message.toLowerCase();
  for (const item of ACTIVE_CHAT_KB) {
    if (item.keys.some(k => msg.includes(k))) {
      return item[lang] || item.sw;
    }
  }
  return lang === 'en'
    ? "I'm not sure about that yet. Try asking about the Union's history, benefits, the quiz, or how to sign up."
    : "Sina jibu la hilo kwa sasa. Jaribu kuniuliza kuhusu historia ya Muungano, faida, quiz, au jinsi ya kujisajili.";
}

function initChatbot() {
  if (document.getElementById('chatWidget')) return;
  if (typeof db !== 'undefined') loadChatKB();

  const widget = document.createElement('div');
  widget.id = 'chatWidget';
  widget.innerHTML = `
    <button id="chatToggleBtn" class="chat-fab" aria-label="Chatbot">💬</button>
    <div id="chatPanel" class="chat-panel">
      <div class="chat-header">
        <span data-i18n="chat_title">${t('chat_title')}</span>
        <button id="chatCloseBtn" class="chat-close">&times;</button>
      </div>
      <div class="chat-body" id="chatBody"></div>
      <form id="chatForm" class="chat-form">
        <input type="text" id="chatInput" data-i18n-placeholder="chat_placeholder" placeholder="${t('chat_placeholder')}" autocomplete="off">
        <button type="submit" class="chat-send">➤</button>
      </form>
    </div>
  `;
  document.body.appendChild(widget);

  const panel = document.getElementById('chatPanel');
  document.getElementById('chatToggleBtn').addEventListener('click', () => {
    panel.classList.toggle('open');
    if (panel.classList.contains('open') && !panel.dataset.greeted) {
      addChatMessage(t('chat_greeting'), 'bot');
      panel.dataset.greeted = "1";
    }
  });
  document.getElementById('chatCloseBtn').addEventListener('click', () => panel.classList.remove('open'));

  document.getElementById('chatForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;
    addChatMessage(text, 'user');
    input.value = '';
    setTimeout(() => addChatMessage(chatReply(text), 'bot'), 350);
  });
}

function addChatMessage(text, sender) {
  const body = document.getElementById('chatBody');
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble ' + sender;
  bubble.textContent = text;
  body.appendChild(bubble);
  body.scrollTop = body.scrollHeight;
}

document.addEventListener('DOMContentLoaded', initChatbot);
