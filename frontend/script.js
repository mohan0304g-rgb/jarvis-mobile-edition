// ===== 1. API KEY (Safe: browser లో మాత్రమే) =====
let API_KEY = localStorage.getItem('jarvis_key');
if(!API_KEY){
  API_KEY = prompt('Enter your Gemini API Key:');
  if(API_KEY) localStorage.setItem('jarvis_key', API_KEY);
}

// ===== 2. SMART MODELS (ఒకటి fail అయితే next auto try) =====
const MODELS = ["gemini-1.5-flash", "gemini-flash-latest"];
const chat = document.getElementById('chat');
const input = document.getElementById('msg');
const micBtn = document.getElementById('mic-btn');

// ===== 3. GEMINI BRAIN (With Google Search & Teluglish Response) =====
async function callGemini(p){ 
  let lastErr;
  
  // System Instruction: Teluglish & fast response prompt
  const systemInstruction = "Respond in natural, concise Teluglish (Telugu words using English alphabet) or mixed English-Telugu. Keep answers direct and quick. Prompt: " + p;

  for(const m of MODELS){
    try{
      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + m + ":generateContent?key=" + API_KEY, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          contents: [{parts: [{text: systemInstruction}]}],
          // Google Search సాధనం ద్వారా రియల్ టైమ్ సమాచారం & కరెంట్ అఫైర్స్ పొందడం
          tools: [{ googleSearch: {} }]
        })
      });
      const data = await res.json();
      if(data.error){
        lastErr = new Error(data.error.message);
        if(/high demand|temporar|quota|rate|unavailable|no longer available|deprecated/i.test(data.error.message)) continue;
        throw lastErr;
      }
      return data.candidates[0].content.parts[0].text;
    } catch(e){ 
      lastErr = e; 
    }
  }
  throw lastErr;
}

async function askGemini(p){
  add('YOU: ' + p, 'user');
  add('J.A.R.V.I.S: Thinking...', 'ai');
  try{
    const reply = await callGemini(p);
    chat.lastChild.innerText = 'J.A.R.V.I.S: ' + reply;
    speak(reply); // సమాధానం వచ్చాక స్పీకర్‌లో చదివి వినిపిస్తుంది
  } catch(e){
    chat.lastChild.innerText = 'J.A.R.V.I.S: ERROR - ' + e.message;
  }
}

// ===== 4. SPEECH RECOGNITION (వినడం) =====
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null;

if (SR) {
  rec = new SR(); 
  rec.lang = 'en-US'; // Telugu మాట్లాడితే 'te-IN' కూడా వాడుకోవచ్చు

  rec.onresult = (e) => {
    const t = e.results[0][0].transcript;
    askGemini(t);
  };

  micBtn.onclick = () => {
    try {
      rec.start();
      micBtn.innerText = 'LISTENING...';
    } catch(err) {
      console.log("Already listening...");
    }
  };

  rec.onend = () => {
    micBtn.innerText = '🎙️';
  };
} else {
  console.log("Speech Recognition not supported in this browser.");
}

// ===== 5. TEXT-TO-SPEECH (మాట్లాడటం) =====
let voices = [];
function loadVoices(){ voices = speechSynthesis.getVoices(); }
loadVoices();
speechSynthesis.onvoiceschanged = loadVoices;

function speak(t){
  const u = new SpeechSynthesisUtterance(t); 
  u.rate = 1.05; 
  u.pitch = 0.85;
  const v = voices.find(v => v.lang.startsWith('en'));
  if(v) u.voice = v;

  // JARVIS సమాధానం చెప్పడం పూర్తయిన వెంటనే మళ్లీ మైక్ ఆటోమేటిక్‌గా ఆన్ అవుతుంది
  u.onend = () => {
    if (rec) {
      try {
        rec.start();
        micBtn.innerText = 'LISTENING...';
      } catch(e) {
        // అల్రెడీ రన్నింగ్‌లో ఉంటే ప్రశాంతంగా వదిలేస్తుంది
      }
    }
  };

  speechSynthesis.speak(u);
}

// ===== 6. TEXT SEND BUTTON =====
document.getElementById('send').onclick = () => {
  const t = input.value.trim(); 
  if(!t) return;
  input.value = ''; 
  askGemini(t);
};

function add(t, w){
  const d = document.createElement('div');
  d.className = 'msg ' + w;
  d.innerText = t;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}
