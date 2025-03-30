module.exports = (ctx) => {
    ctx.reply("🤖 *C Compiler Bot*\n\n"
        + "⚡ Instantly compiles and runs C programs.\n"
        + "🔍 Detects inputs and asks before execution.\n"
        + "🖥️ Powered by *Judge0 API*.\n",
    { parse_mode: "Markdown" });
};
