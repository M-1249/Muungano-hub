/* ============================
   UNION HUB TANZANIA - i18n.js
   ============================ */

const I18N = {
  sw: {
    nav_home:"Home", nav_history:"Historia", nav_benefits:"Faida",
    nav_quiz:"Quiz", nav_downloads:"Downloads", nav_login:"Login", nav_logout:"Logout",
    hero_title:"Muungano Wetu, Nguvu Yetu",
    hero_sub:"Jukwaa la kielimu kuhusu historia, faida, na umuhimu wa Muungano wa Tanganyika na Zanzibar.",
    btn_read_history:"Soma Historia", btn_try_quiz:"Jaribu Quiz",
    btn_read_more:"Soma Zaidi", btn_view_all:"Tazama Faida Zote",
    btn_start_quiz:"Anza Quiz", btn_continue:"Endelea",
    btn_try_again:"Jaribu Tena", btn_back_home:"Rudi Nyumbani",
    eyebrow_history:"Historia", eyebrow_benefits:"Faida",
    eyebrow_video:"Video", eyebrow_test:"Jipime",
    section_history_title:"Historia ya Muungano",
    section_history_text:"Tarehe 26 Aprili 1964, Tanganyika na Zanzibar ziliungana kuunda Jamhuri ya Muungano wa Tanzania.",
    section_benefits_title:"Faida za Muungano",
    section_video_title:"Video ya Elimu",
    section_quiz_title:"Jaribu Maarifa Yako",
    section_quiz_text:"Maswali kuhusu historia na faida za Muungano wa Tanzania.",
    footer_rights:"Haki zote zimehifadhiwa.",
    login_title:"Karibu Tena", login_sub:"Ingia kwenye akaunti yako kuendelea na masomo.",
    register_title:"Jiunge Nasi", register_sub:"Fungua akaunti kufuatilia maendeleo yako.",
    field_email:"Barua Pepe", field_password:"Password", field_name:"Jina Kamili",
    btn_signin:"Ingia", btn_signup:"Jisajili",
    no_account:"Hauna akaunti?", have_account:"Una akaunti tayari?",
    chat_title:"Msaidizi wa Union Hub",
    chat_placeholder:"Andika swali lako...",
    chat_greeting:"Habari! Mimi ni msaidizi wa Union Hub. Niulize chochote kuhusu Muungano wa Tanzania.",
    lang_switch:"EN"
  },
  en: {
    nav_home:"Home", nav_history:"History", nav_benefits:"Benefits",
    nav_quiz:"Quiz", nav_downloads:"Downloads", nav_login:"Login", nav_logout:"Logout",
    hero_title:"Our Union, Our Strength",
    hero_sub:"An educational platform about the history, benefits, and importance of the Tanganyika-Zanzibar Union.",
    btn_read_history:"Read History", btn_try_quiz:"Try the Quiz",
    btn_read_more:"Read More", btn_view_all:"View All Benefits",
    btn_start_quiz:"Start Quiz", btn_continue:"Continue",
    btn_try_again:"Try Again", btn_back_home:"Back Home",
    eyebrow_history:"History", eyebrow_benefits:"Benefits",
    eyebrow_video:"Educational Video", eyebrow_test:"Test Yourself",
    section_history_title:"History of the Union",
    section_history_text:"On 26 April 1964, Tanganyika and Zanzibar united to form the United Republic of Tanzania.",
    section_benefits_title:"Benefits of the Union",
    section_video_title:"Educational Video",
    section_quiz_title:"Test Your Knowledge",
    section_quiz_text:"Questions about the history and benefits of the Tanzania Union.",
    footer_rights:"All rights reserved.",
    login_title:"Welcome Back", login_sub:"Sign in to your account to continue learning.",
    register_title:"Join Us", register_sub:"Create an account to track your quiz progress.",
    field_email:"Email", field_password:"Password", field_name:"Full Name",
    btn_signin:"Sign In", btn_signup:"Sign Up",
    no_account:"Don't have an account?", have_account:"Already have an account?",
    chat_title:"Union Hub Assistant",
    chat_placeholder:"Type your question...",
    chat_greeting:"Hello! I'm the Union Hub assistant. Ask me anything about the Tanzania Union.",
    lang_switch:"SW"
  }
};

function getLang() { return localStorage.getItem('uh_lang') || 'sw'; }

function setLang(lang) {
  localStorage.setItem('uh_lang', lang);
  applyLang();
}

function toggleLang() { setLang(getLang() === 'sw' ? 'en' : 'sw'); }

function t(key) {
  const lang = getLang();
  return (I18N[lang] && I18N[lang][key]) || (I18N.sw[key] || key);
}

function applyLang() {
  const lang = getLang();
  document.documentElement.lang = lang;

  /* Text content */
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = I18N[lang][key];
    if (val) el.textContent = val;
  });

  /* Placeholder */
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const val = I18N[lang][key];
    if (val) el.placeholder = val;
  });

  /* Lang toggle button */
  const btn = document.getElementById('langToggleBtn');
  if (btn) btn.textContent = lang === 'sw' ? 'EN' : 'SW';

  /* Chatbot greeting re-render if open */
  const chatTitle = document.querySelector('.chat-header span[data-i18n="chat_title"]');
  if (chatTitle) chatTitle.textContent = t('chat_title');
  const chatInput = document.getElementById('chatInput');
  if (chatInput) chatInput.placeholder = t('chat_placeholder');
}

/* Apply on load and whenever DOM changes */
document.addEventListener('DOMContentLoaded', applyLang);

