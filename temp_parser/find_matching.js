const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, 'extracted_text.txt'), 'utf8');
const lines = content.split('\n').map(line => line.trim()).filter(line => !line.match(/^--\s+\d+\s+of\s+\d+\s+--$/));

let inMatching = false;
let currentTheme = '';

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('TEMA ')) {
        currentTheme = line;
    }
    if (line === 'Emparejamiento') {
        inMatching = true;
        console.log(`\n=== MATCHING SECTION IN ${currentTheme} ===`);
    } else if (line === 'PREGUNTAS DE V Y F' || line === 'Selección Múltiple' || line.startsWith('Glosario')) {
        inMatching = false;
    }

    if (inMatching) {
        console.log(`${i}: ${line}`);
    }
}
