require("dotenv").config();
const { Telegraf } = require("telegraf");
const extractInputPrompts = require("./utils/inputParser");
const compileCCode = require("./utils/compiler");

const bot = new Telegraf(process.env.BOT_TOKEN);
const userSessions = new Map(); // Track user states for input requests

// Import commands
const startCommand = require("./commands/start");
const helpCommand = require("./commands/help");
const aboutCommand = require("./commands/about");
const developerCommand = require("./commands/developer");

// Register commands
bot.start((ctx) => startCommand(ctx));
bot.command("help", (ctx) => helpCommand(ctx));
bot.command("about", (ctx) => aboutCommand(ctx));
bot.command("developer", (ctx) => developerCommand(ctx));

// Handle incoming C code
bot.on("text", async (ctx) => {
    const userId = ctx.message.from.id;
    const sourceCode = ctx.message.text.trim();

    if (!sourceCode.startsWith("#include")) {
        return ctx.reply("⚠️ Invalid C code! Please check your syntax.");
    }

    const userState = userSessions.get(userId);

    if (userState && userState.awaitingInput) {
        const stdin = ctx.message.text;
        userSessions.delete(userId);

        ctx.reply("⏳ Compiling your code with the provided inputs...");
        const output = await compileCCode(userState.sourceCode, stdin);
        ctx.reply(output, { parse_mode: "Markdown" });
    } else {
        const inputPrompts = extractInputPrompts(sourceCode);

        if (inputPrompts.length > 0) {
            let promptMessage = "🔍 Detected Inputs:\n";
            inputPrompts.forEach((prompt, index) => {
                promptMessage += `➡️ ${index + 1}. ${prompt}\n`;
            });

            ctx.reply(`${promptMessage}\n📥 Please provide the required inputs (one per line).`);
            userSessions.set(userId, { awaitingInput: true, sourceCode, inputPrompts });
        } else {
            ctx.reply("⏳ No inputs detected. Compiling your code...");
            const output = await compileCCode(sourceCode);
            ctx.reply(output, { parse_mode: "Markdown" });
        }
    }
});

// Start bot
bot.launch().then(() => console.log("✅ Bot is running..."));

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));