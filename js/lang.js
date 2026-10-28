// js/lang.js
const translations = {
  en: {
    "FDR Trust & Assurance Engine": "FDR Trust & Assurance Engine",
    "Secure sign-in": "Secure sign-in",
    "Email": "Email",
    "Password": "Password",
    "Sign In": "Sign In",
    "Dashboard": "Dashboard",
    "Instruments": "Instruments",
    "Renewals": "Renewals",
    "Releases": "Releases",
    "Reports": "Reports",
    "Audit Trail": "Audit Trail",
    "Logout": "Logout",
    "Coverage Overview": "Coverage Overview"
  },
  hi: {
    "FDR Trust & Assurance Engine": "एफडीआर ट्रस्ट और आश्वासन इंजन",
    "Secure sign-in": "सुरक्षित साइन-इन",
    "Email": "ईमेल",
    "Password": "पासवर्ड",
    "Sign In": "साइन इन करें",
    "Dashboard": "डैशबोर्ड",
    "Instruments": "उपकरण (FDR)",
    "Renewals": "नवीनीकरण",
    "Releases": "रिलीज़ (वापसी)",
    "Reports": "रिपोर्ट्स",
    "Audit Trail": "ऑडिट ट्रेल",
    "Logout": "लॉग आउट",
    "Coverage Overview": "कवरेज अवलोकन"
  },
  ta: {
    "FDR Trust & Assurance Engine": "FDR அறக்கட்டளை & உறுதி இயந்திரம்",
    "Secure sign-in": "பாதுகாப்பான உள்நுழைவு",
    "Email": "மின்னஞ்சல்",
    "Password": "கடவுச்சொல்",
    "Sign In": "உள்நுழைக",
    "Dashboard": "டாஷ்போர்டு",
    "Instruments": "ஆவணங்கள்",
    "Renewals": "புதுப்பித்தல்கள்",
    "Releases": "விடுவிப்புகள்",
    "Reports": "அறிக்கைகள்",
    "Audit Trail": "தணிக்கை தடம்",
    "Logout": "வெளியேறு",
    "Coverage Overview": "கவரேஜ் கண்ணோட்டம்"
  },
  ml: {
    "FDR Trust & Assurance Engine": "FDR ട്രസ്റ്റ് & അസ്യൂറൻസ് എഞ്ചിൻ",
    "Secure sign-in": "സുരക്ഷിതമായി ലോഗിൻ ചെയ്യുക",
    "Email": "ഇമെയിൽ",
    "Password": "പാസ്‌വേഡ്",
    "Sign In": "സൈൻ ഇൻ",
    "Dashboard": "ഡാഷ്ബോർഡ്",
    "Instruments": "രേഖകൾ",
    "Renewals": "പുതുക്കലുകൾ",
    "Releases": "റിലീസുകൾ",
    "Reports": "റിപ്പോർട്ടുകൾ",
    "Audit Trail": "ഓഡിറ്റ് ട്രെയിൽ",
    "Logout": "ലോഗ് ഔട്ട്",
    "Coverage Overview": "കവറേജ് അവലോകനം"
  },
  te: {
    "FDR Trust & Assurance Engine": "FDR ట్రస్ట్ & అస్యూరెన్స్ ఇంజిన్",
    "Secure sign-in": "సురక్షిత సైన్-ఇన్",
    "Email": "ఇమెయిల్",
    "Password": "పాస్‌వర్డ్",
    "Sign In": "సైన్ ఇన్",
    "Dashboard": "డాష్‌బోర్డ్",
    "Instruments": "పత్రాలు",
    "Renewals": "పునరుద్ధరణలు",
    "Releases": "విడుదలలు",
    "Reports": "నివేదికలు",
    "Audit Trail": "ఆడిట్ ట్రైల్",
    "Logout": "లాగ్ అవుట్",
    "Coverage Overview": "కవరేజ్ అవలోకనం"
  }
};

function applyLanguage(lang) {
  localStorage.setItem('app_lang', lang);
  const elements = document.querySelectorAll('h1, h2, h3, p, label, button, a, th');
  
  elements.forEach(el => {
    // Only translate if the text matches our dictionary exactly
    const text = el.innerText.trim();
    if (translations[lang] && translations[lang][text]) {
      // If it's an input label, we need to find the span/text node
      if (el.tagName === 'LABEL' && el.querySelector('input')) {
        // Handle complex labels if needed
      } else {
        el.innerText = translations[lang][text];
      }
    }
  });
}

function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('app_theme', isDark ? 'dark' : 'light');
  document.getElementById('theme-btn').innerText = isDark ? '☀️' : '🌙';
}

// Add floating toolbar when page loads
document.addEventListener('DOMContentLoaded', () => {
  // Inject Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'floating-toolbar';
  toolbar.innerHTML = `
    <select id="lang-select" onchange="applyLanguage(this.value)">
      <option value="en">🇬🇧 English</option>
      <option value="hi">🇮🇳 हिंदी</option>
      <option value="ta">🇮🇳 தமிழ்</option>
      <option value="ml">🇮🇳 മലയാളം</option>
      <option value="te">🇮🇳 తెలుగు</option>
    </select>
    <button id="theme-btn" onclick="toggleTheme()">🌙</button>
  `;
  document.body.appendChild(toolbar);

  // Load saved preferences
  const savedLang = localStorage.getItem('app_lang') || 'en';
  document.getElementById('lang-select').value = savedLang;
  applyLanguage(savedLang);

  if (localStorage.getItem('app_theme') === 'dark') {
    document.body.classList.add('dark-mode');
    document.getElementById('theme-btn').innerText = '☀️';
  }
});