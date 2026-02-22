require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/chat", async (req, res) => {
    const { message } = req.body;

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: "llama3-8b-8192",
                messages: [
                    { role: "user", content: message }
                ]
            })
        });

        const data = await response.json();
        res.json(data);

    } catch (error) {
        res.status(500).json({ error: "Erro ao chamar Groq" });
    }
});

app.listen(3000, () => {
    console.log("Servidor rodando na porta 3000");
});