import React, { useState, useRef, useEffect } from "react";

const SYSTEM_PROMPT = `Você é uma IA poderosa e inteligente integrada diretamente neste site. Você pode:
- Responder perguntas sobre qualquer assunto
- Analisar textos, documentos e dados fornecidos
- Ajudar com código, escrita, análise e muito mais
- Lembrar de toda a conversa atual para dar respostas contextualizadas
- Buscar informações na web quando necessário (use web_search tool)
Responda sempre em português do Brasil de forma clara, completa e útil.
Você tem acesso à internet para buscar informações atualizadas.`;

const TypingDots = () => (
    <div style={{ display: "flex", gap: 5, padding: "12px 16px", alignItems: "center" }}>
        {[0, 1, 2].map((i) => (
            <div key={i} style={{
                width: 8, height: 8, borderRadius: "50%",
                background: "#00f5a0",
                animation: "bounce 1.2s infinite",
                animationDelay: `${i * 0.2}s`,
            }} />
        ))}
    </div>
);

const MessageBubble = ({ msg }) => {
    const isUser = msg.role === "user";
    return (
        <div style={{
            display: "flex",
            justifyContent: isUser ? "flex-end" : "flex-start",
            marginBottom: 16,
            animation: "fadeSlide 0.3s ease",
        }}>
            {!isUser && (
                <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: "linear-gradient(135deg, #00f5a0, #00d9f5)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, marginRight: 10, flexShrink: 0, marginTop: 4,
                    boxShadow: "0 0 15px rgba(0,245,160,0.4)",
                }}>🤖</div>
            )}
            <div style={{
                maxWidth: "85%",
                background: isUser
                    ? "linear-gradient(135deg, #1a1a2e, #16213e)"
                    : "linear-gradient(135deg, #0d1117, #161b22)",
                border: isUser
                    ? "1px solid rgba(0,245,160,0.3)"
                    : "1px solid rgba(0,217,245,0.2)",
                borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                padding: "12px 18px",
                color: "#e6edf3",
                fontSize: 14,
                lineHeight: 1.7,
                boxShadow: isUser
                    ? "0 4px 20px rgba(0,245,160,0.1)"
                    : "0 4px 20px rgba(0,0,0,0.3)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
            }}>
                {msg.content}
                <div style={{
                    fontSize: 10, color: "rgba(255,255,255,0.3)",
                    marginTop: 6, textAlign: "right",
                }}>
                    {new Date(msg.time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </div>
            </div>
            {isUser && (
                <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: "linear-gradient(135deg, #667eea, #764ba2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, marginLeft: 10, flexShrink: 0, marginTop: 4,
                }}>👤</div>
            )}
        </div>
    );
};

export default function IAChat() {
    const [messages, setMessages] = useState([
        {
            role: "assistant",
            content: "Olá! 👋 Sou sua IA integrada ao site. Estou 100% funcional e posso responder qualquer pergunta, analisar textos, ajudar com código, buscar informações na internet e muito mais. Como posso te ajudar hoje?",
            time: Date.now(),
        },
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [webSearch, setWebSearch] = useState(true);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, loading]);

    const sendMessage = async () => {
        const text = input.trim();
        if (!text || loading) return;

        const userMsg = { role: "user", content: text, time: Date.now() };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput("");
        setLoading(true);
        setError(null);

        try {
            const history = newMessages.map((m) => ({
                role: m.role,
                content: m.content,
            }));

            const body = {
                model: "claude-3-7-sonnet-20250219", // Updated model version
                max_tokens: 2000,
                system: SYSTEM_PROMPT,
                messages: history,
            };

            if (webSearch) {
                // Configuração das novas ferramentas
                body.tools = [
                    {
                        name: "web_search_google",
                        description: "Pesquisa no Google e retorna links, snippets e conteúdo focado. Use sempre para ter informações de hoje (fatos, tecnologia atual, notícias).",
                        input_schema: {
                            type: "object",
                            properties: {
                                query: { type: "string" }
                            },
                            required: ["query"]
                        }
                    }
                ];
                // Add Google search instruction dynamically
                body.system = SYSTEM_PROMPT + "\\n\\nSe precisar buscar, use a tool web_search_google e pesquise na internet de 2024 e 2025.";
            }

            // O seu frontend não deve armazenar a API KEY do Anthropic, isso vai causar erro no client-side
            // Essa API Key NUNCA pode ser exposta no client-side React em produção (CORS vai bloquear)
            // Aqui seria ideal chamar o seu /api/chat.js (se criarmos uma rota Anthropic para ele) ou manter a de teste

            // TEMPORARY: Utilizando um Proxy publico, se quiser Anthropic puro será via Vercel Backend
            const res = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": process.env.ANTHROPIC_API_KEY || "COLOQUE_A_CHAVE_AQUI", // Erro CORS garantido no Browser
                    "anthropic-version": "2023-06-01",
                    "anthropic-cors-bypass": "true"
                },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (data.error) throw new Error(data.error.message);

            const text_blocks = (data.content || [])
                .filter((b) => b.type === "text")
                .map((b) => b.text)
                .join("\n");

            const aiMsg = {
                role: "assistant",
                content: text_blocks || "Não consegui gerar uma resposta. Tente novamente.",
                time: Date.now(),
            };

            setMessages((prev) => [...prev, aiMsg]);
        } catch (e) {
            setError("Erro ao conectar com a IA: " + e.message + ". (Nota: APIs Anthropic precisam rodar via servidor Backend para não dar erro CORS).");
        } finally {
            setLoading(false);
            if (inputRef.current) inputRef.current.focus();
        }
    };

    const handleKey = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const clearChat = () => {
        setMessages([{
            role: "assistant",
            content: "Conversa reiniciada! Como posso te ajudar? 🚀",
            time: Date.now(),
        }]);
        setError(null);
    };

    return (
        <div style={{
            height: "100%",
            background: "linear-gradient(135deg, #0a0a0f 0%, #0d1117 50%, #090d13 100%)",
            display: "flex",
            flexDirection: "column",
            fontFamily: "'Fira Code', 'Courier New', monospace",
        }}>
            <style>{`
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-8px)} }
        @keyframes fadeSlide { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes glow { 0%,100%{box-shadow:0 0 20px rgba(0,245,160,0.3)} 50%{box-shadow:0 0 40px rgba(0,245,160,0.6)} }
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(0,245,160,0.3);border-radius:2px}
        textarea{resize:none;outline:none}
      `}</style>

            {/* Header */}
            <div style={{
                background: "linear-gradient(135deg, rgba(0,245,160,0.05), rgba(0,217,245,0.05))",
                borderBottom: "1px solid rgba(0,245,160,0.2)",
                padding: "16px 20px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                backdropFilter: "blur(10px)",
                flexShrink: 0
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: "50%",
                        background: "linear-gradient(135deg, #00f5a0, #00d9f5)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 20, animation: "glow 3s ease infinite",
                    }}>🧠</div>
                    <div>
                        <div style={{
                            fontFamily: "system-ui, -apple-system, sans-serif",
                            fontSize: 14, fontWeight: 900,
                            background: "linear-gradient(90deg, #00f5a0, #00d9f5)",
                            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                            letterSpacing: 2,
                        }}>IA DO SITE</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                            <div style={{
                                width: 6, height: 6, borderRadius: "50%", background: "#00f5a0",
                                animation: "pulse 2s infinite",
                            }} />
                            <span style={{ fontSize: 10, color: "rgba(0,245,160,0.8)", letterSpacing: 1 }}>
                                ONLINE • {messages.length - 1} msgs
                            </span>
                        </div>
                    </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button
                        onClick={() => setWebSearch(!webSearch)}
                        style={{
                            background: webSearch ? "rgba(0,245,160,0.15)" : "rgba(255,255,255,0.05)",
                            border: `1px solid ${webSearch ? "rgba(0,245,160,0.5)" : "rgba(255,255,255,0.1)"}`,
                            borderRadius: 20, padding: "4px 10px",
                            color: webSearch ? "#00f5a0" : "rgba(255,255,255,0.4)",
                            fontSize: 10, cursor: "pointer", letterSpacing: 1,
                            transition: "all 0.2s",
                        }}
                    >
                        🌐 {webSearch ? "ON" : "OFF"}
                    </button>
                    <button
                        onClick={clearChat}
                        style={{
                            background: "rgba(255,80,80,0.1)",
                            border: "1px solid rgba(255,80,80,0.3)",
                            borderRadius: 20, padding: "4px 10px",
                            color: "rgba(255,120,120,0.8)",
                            fontSize: 10, cursor: "pointer", letterSpacing: 1,
                            transition: "all 0.2s",
                        }}
                    >
                        🗑 LIMPAR
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            <div style={{
                flex: 1,
                background: "rgba(13,17,23,0.95)",
                overflowY: "auto",
                padding: "20px 16px",
            }}>
                {messages.map((msg, i) => (
                    <MessageBubble key={i} msg={msg} />
                ))}
                {loading && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: "50%",
                            background: "linear-gradient(135deg, #00f5a0, #00d9f5)",
                            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                        }}>🤖</div>
                        <div style={{
                            background: "linear-gradient(135deg, #0d1117, #161b22)",
                            border: "1px solid rgba(0,217,245,0.2)",
                            borderRadius: "18px 18px 18px 4px",
                        }}>
                            <TypingDots />
                        </div>
                    </div>
                )}
                {error && (
                    <div style={{
                        background: "rgba(255,80,80,0.1)",
                        border: "1px solid rgba(255,80,80,0.3)",
                        borderRadius: 12, padding: "12px 18px",
                        color: "#ff8080", fontSize: 13, marginBottom: 16,
                    }}>
                        ⚠️ {error}
                    </div>
                )}
                <div ref={bottomRef} style={{ height: 1 }} />
            </div>

            {/* Input Area */}
            <div style={{
                background: "rgba(13,17,23,0.98)",
                borderTop: "1px solid rgba(0,245,160,0.1)",
                padding: "12px 16px",
                display: "flex", gap: 8, alignItems: "flex-end",
                flexShrink: 0
            }}>
                <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Pergunta... (Enter p/ enviar)"
                    rows={1}
                    style={{
                        flex: 1,
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(0,245,160,0.2)",
                        borderRadius: 12,
                        padding: "10px 14px",
                        color: "#e6edf3",
                        fontSize: 13,
                        fontFamily: "system-ui, -apple-system, sans-serif",
                        lineHeight: 1.4,
                        maxHeight: 100,
                        overflowY: "auto",
                        transition: "border-color 0.2s",
                    }}
                    onFocus={(e) => e.target.style.borderColor = "rgba(0,245,160,0.5)"}
                    onBlur={(e) => e.target.style.borderColor = "rgba(0,245,160,0.2)"}
                />
                <button
                    onClick={sendMessage}
                    disabled={loading || !input.trim()}
                    style={{
                        width: 40, height: 40,
                        borderRadius: 12,
                        background: loading || !input.trim()
                            ? "rgba(255,255,255,0.05)"
                            : "linear-gradient(135deg, #00f5a0, #00d9f5)",
                        border: "none",
                        cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16,
                        transition: "all 0.2s",
                        boxShadow: loading || !input.trim() ? "none" : "0 0 15px rgba(0,245,160,0.3)",
                        flexShrink: 0,
                    }}
                >
                    {loading ? "⏳" : "🚀"}
                </button>
            </div>
        </div >
    );
}
