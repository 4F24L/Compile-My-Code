function extractInputPrompts(sourceCode) {
    const prompts = [];
    const regex = /printf\("([^"]+)"\);[^;]*scanf/g;

    let match;
    while ((match = regex.exec(sourceCode)) !== null) {
        prompts.push(match[1]);
    }

    return prompts;
}

module.exports = extractInputPrompts;
