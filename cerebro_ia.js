// c:\Users\AAAA\Desktop\sitey-caixa\cerebro_ia.js

const initAI = () => {
  if (window.__PSYZON_AI_LOGIC_READY__) return;
  window.__PSYZON_AI_LOGIC_READY__ = true;

  let modelClient = null;
  let initializing = false;
  let isAiProcessing = false;

  const modelPriority = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

  const ensureFirebaseConfig = () => {
    const cfg = window.firebasePublicConfig;
    if (!cfg || !cfg.apiKey || !cfg.projectId) {
      throw new Error("Firebase ainda não foi inicializado. Aguarde alguns segundos e tente novamente.");
    }
    return cfg;
  };

  const extractText = (result) => {
    if (!result) return "";

    if (typeof result.text === "string") return result.text;
    if (typeof result.text === "function") return result.text() || "";

    const response = result.response || result;
    if (response) {
      if (typeof response.text === "string") return response.text;
      if (typeof response.text === "function") return response.text() || "";

      const candidates = response.candidates || [];
      const first = candidates[0]?.content?.parts || [];
      const joined = first.map((p) => p?.text || "").join("\n").trim();
      if (joined) return joined;
    }

    return "";
  };

  const buildModel = async () => {
    if (modelClient) return modelClient;
    if (initializing) {
      while (initializing) await new Promise((r) => setTimeout(r, 100));
      if (modelClient) return modelClient;
    }

    initializing = true;
    try {
      const cfg = ensureFirebaseConfig();
      const [{ initializeApp, getApps }, aiModule] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/12.5.0/firebase-ai.js")
      ]);

      const app = getApps().find((a) => a.name === "psyzon-ai-logic") || initializeApp(cfg, "psyzon-ai-logic");

      let aiService = null;
      if (typeof aiModule.getAI === "function") {
        const backendFactory = aiModule.GoogleAIBackend
          ? () => new aiModule.GoogleAIBackend()
          : aiModule.googleAI
            ? () => aiModule.googleAI()
            : null;

        aiService = backendFactory ? aiModule.getAI(app, { backend: backendFactory() }) : aiModule.getAI(app);
      }

      if (!aiService || typeof aiModule.getGenerativeModel !== "function") {
        throw new Error("SDK Firebase AI Logic não disponível para Web nesta versão.");
      }

      const models = modelPriority
        .map((name) => {
          try {
            return aiModule.getGenerativeModel(aiService, { model: name });
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      if (!models.length) throw new Error("Não foi possível criar instância do modelo Gemini.");

      modelClient = {
        async ask(prompt) {
          let lastError = null;
          for (const model of models) {
            try {
              const response = await model.generateContent(prompt);
              const text = extractText(response)?.trim();
              if (text) return text;
            } catch (err) {
              lastError = err;
            }
          }
          throw lastError || new Error("A IA não retornou conteúdo.");
        }
      };

      return modelClient;
    } finally {
      initializing = false;
    }
  };

  const createChatInterface = () => {
    if (document.getElementById("ai-chat-widget")) return;

    const chatHTML = `
      <button id="ai-toggle-btn" title="Assistente PSYZON">✨</button>
      <div id="ai-chat-widget" class="hidden">
        <div id="ai-chat-header">
          <div class="flex items-center gap-2">
            <span class="text-xl">🤖</span>
            <h3 class="font-bold text-white">Assistente PSYZON (Firebase AI)</h3>
          </div>
          <button id="ai-close-btn" class="text-gray-400 hover:text-white">&times;</button>
        </div>
        <div id="ai-chat-messages">
          <div class="chat-msg ai">Pronto! Agora estou conectado via Firebase AI Logic. Me peça previsões, ideias e textos.</div>
        </div>
        <div id="ai-chat-input-area">
          <input type="text" id="ai-input" class="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500" placeholder="Digite seu comando...">
          <button id="ai-send-btn" class="bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg px-3 py-2">➤</button>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", chatHTML);

    const widget = document.getElementById("ai-chat-widget");
    const toggleBtn = document.getElementById("ai-toggle-btn");
    const closeBtn = document.getElementById("ai-close-btn");
    const sendBtn = document.getElementById("ai-send-btn");
    const input = document.getElementById("ai-input");
    const msgsArea = document.getElementById("ai-chat-messages");

    const addMessage = (text, sender = "ai") => {
      const div = document.createElement("div");
      div.className = `chat-msg ${sender}`;
      div.textContent = text;
      msgsArea.appendChild(div);
      msgsArea.scrollTop = msgsArea.scrollHeight;
      return div;
    };

    const toggleChat = () => {
      widget.classList.toggle("hidden");
      if (!widget.classList.contains("hidden")) input.focus();
    };

    const handleSend = async () => {
      const text = input.value.trim();
      if (!text || isAiProcessing) return;

      input.value = "";
      addMessage(text, "user");
      const loading = addMessage("Processando no Firebase AI Logic...", "ai");

      isAiProcessing = true;
      try {
        const model = await buildModel();
        const prompt = [
          "Você é o assistente da empresa PSYZON.",
          "Responda sempre em português brasileiro, de forma clara e prática.",
          `Página atual: ${window.location.pathname}`,
          `Pergunta do usuário: ${text}`
        ].join("\n");

        const answer = await model.ask(prompt);
        loading.remove();
        addMessage(answer || "Sem resposta textual no momento.", "ai");
      } catch (error) {
        loading.remove();
        addMessage(`Erro ao usar Firebase AI Logic: ${error.message}`, "ai");
      } finally {
        isAiProcessing = false;
      }
    };

    toggleBtn.onclick = toggleChat;
    closeBtn.onclick = toggleChat;
    sendBtn.onclick = handleSend;
    input.onkeydown = (e) => {
      if (e.key === "Enter") handleSend();
    };
  };

  createChatInterface();
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAI);
} else {
  initAI();
}
