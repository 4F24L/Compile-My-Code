require("dotenv").config();
const { Telegraf } = require("telegraf");
const axios = require("axios");

const bot = new Telegraf(process.env.BOT_TOKEN);
const JUDGE0_API = process.env.JUDGE0_API;
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY;

const userSessions = new Map(); // Track user states for input requests

// Extract input prompts from C code
function extractInputPrompts(sourceCode) {
    const prompts = [];
    const regex = /printf\("([^"]+)"\);[^;]*scanf/g; // Match printf before scanf

    let match;
    while ((match = regex.exec(sourceCode)) !== null) {
        prompts.push(match[1]); // Extract prompt text
    }

    return prompts;
}

// Function to compile C code with user inputs
async function compileCCode(sourceCode, stdin = "") {
    try {
        // Step 1: Submit Code to Judge0
        const submissionResponse = await axios.post(JUDGE0_API, {
            source_code: sourceCode,
            language_id: 50, // C Language ID
            stdin: stdin,
            base64_encoded: false,
            wait: false,
        }, {
            headers: {
                "X-RapidAPI-Key": JUDGE0_API_KEY,
                "Content-Type": "application/json",
            },
        });

        if (!submissionResponse.data.token) {
            return "❌ Error: Failed to submit code for execution.";
        }

        const token = submissionResponse.data.token;
        console.log("✅ Submission Token:", token);

        // Step 2: Poll for Result (Max 10 attempts)
        let result;
        for (let i = 0; i < 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 sec

            result = await axios.get(`${JUDGE0_API}/${token}`, {
                headers: { "X-RapidAPI-Key": JUDGE0_API_KEY },
            });

            if (result.data.status && result.data.status.id >= 3) break; // Status 3 = Completed
        }

        if (result.data.status.id === 6) { // Compilation Error
            return `⚠️ Compilation Error:\n\`\`\`\n${result.data.compile_output}\n\`\`\``;
        }

        if (result.data.status.id !== 3) { // Other errors
            return `❌ Execution Failed: ${result.data.status.description}`;
        }

        return result.data.stdout ? `📜 Output:\n\`\`\`\n${result.data.stdout.trim()}\n\`\`\`` : "⚠️ No output received.";
    } catch (error) {
        console.error("❌ Compilation error:", error.response?.data || error.message);
        return "❌ Error occurred while compiling the code.";
    }
}

// Start command
bot.start((ctx) => {
    ctx.reply("👋 Welcome to the C Compiler Bot! 🚀\nSend me a C program, and I'll analyze it, ask for inputs if needed, and compile it.");
});

// Handle incoming C code
bot.on("text", async (ctx) => {
    const userId = ctx.message.from.id;
    const userState = userSessions.get(userId);

    if (userState && userState.awaitingInput) {
        // User is providing inputs
        const stdin = ctx.message.text;
        userSessions.delete(userId); // Clear session after receiving input

        ctx.reply("⏳ Compiling your code with the provided inputs...");

        const output = await compileCCode(userState.sourceCode, stdin);
        ctx.reply(output, { parse_mode: "Markdown" });
    } else {
        // New C program received
        const sourceCode = ctx.message.text;
        const inputPrompts = extractInputPrompts(sourceCode);

        if (inputPrompts.length > 0) {
            let promptMessage = "🔍 Detected Inputs:\n";
            inputPrompts.forEach((prompt, index) => {
                promptMessage += `➡️ ${index + 1}. ${prompt}\n`;
            });

            ctx.reply(`${promptMessage}\n📥 Please provide the required inputs (one per line).`);
            userSessions.set(userId, { awaitingInput: true, sourceCode: sourceCode, inputPrompts: inputPrompts });
        } else {
            ctx.reply("⏳ No inputs detected. Compiling your code...");

            const output = await compileCCode(sourceCode);
            ctx.reply(output, { parse_mode: "Markdown" });
        }
    }
});

// Start the bot
bot.launch().then(() => console.log("✅ Bot is running..."));

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
