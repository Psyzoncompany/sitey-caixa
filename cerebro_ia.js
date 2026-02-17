// c:\Users\AAAA\Desktop\sitey-caixa\cerebro_ia.js

const initAI = () => {
  if (window.__PSYZON_AI_LOGIC_READY__) return;
  window.__PSYZON_AI_LOGIC_READY__ = true;

  const MODEL_IDENTIFIER = {
    name: "Validação de entradas (avançada)",
    id: "validao-de-entradas-avancada"
  };

  const modelPriority = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
  const skuPattern = /^[0-9]{1,3}-[a-zA-Z]{3,10}-[0-9]{1,4}$/;

  let modelClient = null;
  let initializing = false;
  let isAiProcessing = false;

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

  const isStringInRange = (value, min = 0, max = Number.MAX_SAFE_INTEGER) => {
    if (typeof value !== "string") return false;
    const len = value.trim().length;
    return len >= min && len <= max;
  };

  const parseStructuredInvoiceInput = (text) => {
    const trimmed = (text || "").trim();
    if (!trimmed) return null;

    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fencedMatch?.[1]) {
      try {
        return JSON.parse(fencedMatch[1]);
      } catch {
        return null;
      }
    }

    if (trimmed.startsWith("{")) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return null;
      }
    }

    return null;
  };

  const validateInvoiceInput = (payload) => {
    const errors = [];

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return ["A entrada precisa ser um objeto JSON com 'customer' e opcionalmente 'purchases'."];
    }

    const customer = payload.customer;
    if (!customer || typeof customer !== "object" || Array.isArray(customer)) {
      errors.push("Campo obrigatório ausente: customer (objeto).");
    } else {
      if (!isStringInRange(customer.lastName, 2, 50)) {
        errors.push("customer.lastName deve ser texto com 2 a 50 caracteres.");
      }

      if (customer.firstName !== undefined && !isStringInRange(customer.firstName, 2, 50)) {
        errors.push("customer.firstName deve ser texto com 2 a 50 caracteres, quando informado.");
      }

      if (customer.isVip !== undefined && typeof customer.isVip !== "boolean") {
        errors.push("customer.isVip deve ser boolean (true/false).");
      }

      const address = customer.address;
      if (!address || typeof address !== "object" || Array.isArray(address)) {
        errors.push("Campo obrigatório ausente: customer.address (objeto).");
      } else {
        ["street", "city", "country"].forEach((field) => {
          if (!isStringInRange(address[field], 1, 200)) {
            errors.push(`customer.address.${field} deve ser texto não vazio.`);
          }
        });
      }
    }

    if (payload.purchases !== undefined) {
      if (!Array.isArray(payload.purchases)) {
        errors.push("purchases deve ser um array quando informado.");
      } else {
        payload.purchases.forEach((item, idx) => {
          const prefix = `purchases[${idx}]`;
          if (!item || typeof item !== "object" || Array.isArray(item)) {
            errors.push(`${prefix} deve ser objeto.`);
            return;
          }

          if (!isStringInRange(item.itemName, 1, 200)) errors.push(`${prefix}.itemName é obrigatório.`);
          if (!isStringInRange(item.sku, 7, 19) || !skuPattern.test(item.sku)) {
            errors.push(`${prefix}.sku inválido. Formato esperado: 123-ABC-456.`);
          }

          const allowed = ["ELECTRONICS", "APPAREL", "HOME", "MISC"];
          if (item.category !== undefined && !allowed.includes(item.category)) {
            errors.push(`${prefix}.category deve ser uma de: ${allowed.join(", ")}.`);
          }

          if (typeof item.cost !== "number" || item.cost < 0) {
            errors.push(`${prefix}.cost deve ser número >= 0.`);
          }

          if (typeof item.quantity !== "number" || item.quantity < 1 || item.quantity > 200) {
            errors.push(`${prefix}.quantity deve ser número entre 1 e 200.`);
          }
        });
      }
    }

    return errors;
  };

  const buildInvoicePrompt = (data) => {
    const customer = data.customer;
    const purchases = Array.isArray(data.purchases) ? data.purchases : [];

    const lines = [
      `Modelo: ${MODEL_IDENTIFIER.name} (${MODEL_IDENTIFIER.id})`,
      "Create an example customer invoice for a customer.",
      "",
      "The customer's address is",
      "",
      `${customer.firstName || ""} ${customer.lastName}`.trim(),
      customer.address.street,
      customer.address.city,
      customer.address.country,
      ""
    ];

    if (purchases.length) {
      lines.push("Include line items for the following purchases:");
      purchases.forEach((item) => {
        lines.push(`- ${item.quantity} x ${item.itemName} (${item.sku}) @ $${item.cost}, category ${item.category || "MISC"}`);
      });
      lines.push("");
    }

    if (customer.isVip) {
      lines.push("Give the customer a 5% discount.");
    }

    lines.push("Retorne em português brasileiro com formato de fatura organizado (resumo, itens e total).");
    return lines.join("\n");
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
          <div class="chat-msg ai">Conectado ao Firebase AI Logic. Também aceito JSON para gerar fatura com validação avançada.</div>
        </div>
        <div id="ai-chat-input-area">
          <input type="text" id="ai-input" class="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500" placeholder="Digite seu comando ou JSON...">
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
        const parsedPayload = parseStructuredInvoiceInput(text);
        let prompt;

        if (parsedPayload) {
          const validationErrors = validateInvoiceInput(parsedPayload);
          if (validationErrors.length) {
            loading.remove();
            addMessage(`Erro de validação (${MODEL_IDENTIFIER.id}): ${validationErrors.join(" | ")}`, "ai");
            return;
          }
          prompt = buildInvoicePrompt(parsedPayload);
        } else {
          prompt = [
            `Você é o assistente da empresa PSYZON. Modelo interno: ${MODEL_IDENTIFIER.id}.`,
            "Responda sempre em português brasileiro, de forma clara e prática.",
            `Página atual: ${window.location.pathname}`,
            `Pergunta do usuário: ${text}`
          ].join("\n");
        }

        const model = await buildModel();
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
