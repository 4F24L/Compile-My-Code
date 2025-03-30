const axios = require("axios");
const JUDGE0_API = process.env.JUDGE0_API;
const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY;

async function compileCCode(sourceCode, stdin = "") {
    try {
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

        let result;
        for (let i = 0; i < 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 2000));

            result = await axios.get(`${JUDGE0_API}/${token}`, {
                headers: { "X-RapidAPI-Key": JUDGE0_API_KEY },
            });

            if (result.data.status && result.data.status.id >= 3) break;
        }

        if (result.data.status.id === 6) {
            return `⚠️ Compilation Error:\n\`\`\`\n${result.data.compile_output}\n\`\`\``;
        }

        if (result.data.status.id !== 3) {
            return `❌ Execution Failed: ${result.data.status.description}`;
        }

        return result.data.stdout ? `📜 Output:\n\`\`\`\n${result.data.stdout.trim()}\n\`\`\`` : "⚠️ No output received.";
    } catch (error) {
        console.error("❌ Compilation error:", error.response?.data || error.message);
        return "❌ Error occurred while compiling the code.";
    }
}

module.exports = compileCCode;
