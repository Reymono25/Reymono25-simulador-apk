const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'extracted_text.txt');
const content = fs.readFileSync(filePath, 'utf8');

// Split content by lines and clean up page markers
let lines = content.split('\n').map(line => line.trim());

// Filter out page markers like "-- 1 of 27 --"
lines = lines.filter(line => {
    if (line.match(/^--\s+\d+\s+of\s+\d+\s+--$/)) return false;
    return true;
});

let currentTheme = '';
let currentSection = '';
let questions = [];
let currentQuestion = null;

function saveCurrentQuestion() {
    if (currentQuestion) {
        questions.push(currentQuestion);
        currentQuestion = null;
    }
}

let i = 0;
while (i < lines.length) {
    let line = lines[i];
    if (!line) {
        i++;
        continue;
    }

    // Stop parsing at Glosario
    if (line.startsWith('Glosario')) {
        saveCurrentQuestion();
        break;
    }

    // Identify Theme
    if (line.startsWith('TEMA ')) {
        saveCurrentQuestion();
        currentTheme = line;
        i++;
        continue;
    }

    // Identify Section type
    if (line === 'PREGUNTAS DE V Y F') {
        saveCurrentQuestion();
        currentSection = 'true_false';
        i++;
        continue;
    } else if (line === 'Emparejamiento') {
        saveCurrentQuestion();
        currentSection = 'matching';
        i++;
        continue;
    } else if (line === 'Selección Múltiple') {
        saveCurrentQuestion();
        currentSection = 'multiple_choice';
        i++;
        continue;
    }

    // Check if it's the start of a question (e.g. "1. ", "12. ")
    const questionStartMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (questionStartMatch) {
        saveCurrentQuestion();

        const qNumber = parseInt(questionStartMatch[1]);
        const qTextStart = questionStartMatch[2];

        currentQuestion = {
            id: questions.length + 1,
            number: qNumber,
            theme: currentTheme,
            type: currentSection,
            text: qTextStart,
            options: [],
            matchingColumnA: [],
            matchingColumnB: [],
            answer: ''
        };

        i++;
        // Read lines for question body until options or answer is found
        while (i < lines.length) {
            let nextLine = lines[i];
            if (!nextLine) {
                i++;
                continue;
            }

            // Check if nextLine is the start of a new theme, section, or question
            if (nextLine.startsWith('TEMA ') || 
                nextLine === 'PREGUNTAS DE V Y F' || 
                nextLine === 'Emparejamiento' || 
                nextLine === 'Selección Múltiple' || 
                nextLine.startsWith('Glosario') ||
                nextLine.match(/^(\d+)\.\s+/)) {
                break;
            }

            // True / False options line
            if (nextLine.includes('(__) V') || nextLine.includes('(__) F')) {
                // Ignore this line, just options marker
                i++;
                continue;
            }

            // Multiple choice options
            if (nextLine.match(/^[a-d]\)\s+/)) {
                break; // Handled below
            }

            // Matching column marker
            if (nextLine === 'Columna A Columna B') {
                i++;
                continue;
            }

            // Matching lines
            if (nextLine.match(/^[A-C]\.\s+/)) {
                break; // Handled below
            }

            // Answer line
            if (nextLine.startsWith('Respuesta:')) {
                break; // Handled below
            }

            // Append to question text
            currentQuestion.text += ' ' + nextLine;
            i++;
        }
        continue;
    }

    if (currentQuestion) {
        // Parse options for Multiple Choice
        const optionMatch = line.match(/^([a-d])\)\s+(.*)/);
        if (optionMatch) {
            let optLetter = optionMatch[1];
            let optText = optionMatch[2];
            
            i++;
            // Check if option text continues on the next line
            while (i < lines.length) {
                let nextLine = lines[i];
                if (!nextLine) {
                    i++;
                    continue;
                }
                if (nextLine.match(/^[a-d]\)\s+/) || nextLine.startsWith('Respuesta:') || nextLine.match(/^(\d+)\.\s+/) || nextLine.startsWith('TEMA ') || nextLine === 'PREGUNTAS DE V Y F' || nextLine === 'Emparejamiento' || nextLine === 'Selección Múltiple') {
                    break;
                }
                optText += ' ' + nextLine;
                i++;
            }
            currentQuestion.options.push({ letter: optLetter, text: optText });
            continue;
        }

        // Parse columns for Matching (Emparejamiento)
        // Format e.g.: "A. AD DS 1. Servicio de directorio..."
        // A. <A-text> <digit>. <B-text>
        const matchingMatch = line.match(/^([A-C])\.\s+(.*?)\s+(\d+)\.\.?\s*(.*)/);
        if (matchingMatch) {
            let colAKey = matchingMatch[1];
            let colAText = matchingMatch[2];
            let colBKey = matchingMatch[3];
            let colBText = matchingMatch[4];

            i++;
            // Option details might continue on the next line
            while (i < lines.length) {
                let nextLine = lines[i];
                if (!nextLine) {
                    i++;
                    continue;
                }
                if (nextLine.match(/^[A-C]\.\s+/) || nextLine.startsWith('Respuesta:') || nextLine.match(/^(\d+)\.\s+/) || nextLine.startsWith('TEMA ') || nextLine === 'PREGUNTAS DE V Y F' || nextLine === 'Emparejamiento' || nextLine === 'Selección Múltiple') {
                    break;
                }
                colBText += ' ' + nextLine;
                i++;
            }

            currentQuestion.matchingColumnA.push({ key: colAKey, text: colAText });
            currentQuestion.matchingColumnB.push({ key: colBKey, text: colBText });
            continue;
        }

        // Parse Answer
        if (line.startsWith('Respuesta:')) {
            let ans = line.replace('Respuesta:', '').trim();
            // Clean up trailing dots
            if (ans.endsWith('.')) {
                ans = ans.slice(0, -1);
            }
            currentQuestion.answer = ans;
            i++;
            continue;
        }
    }

    i++;
}

saveCurrentQuestion();

// Format final questions cleanups
questions = questions.map(q => {
    q.text = q.text.replace(/\s+/g, ' ').trim();
    if (q.type === 'true_false') {
        q.options = ['Verdadero', 'Falso'];
    } else if (q.type === 'multiple_choice') {
        q.options = q.options.map(opt => ({
            letter: opt.letter,
            text: opt.text.replace(/\s+/g, ' ').trim()
        }));
        // Clean answer letter (e.g. "c)" -> "c")
        const cleanAns = q.answer.replace(')', '').trim().toLowerCase();
        q.answer = cleanAns;
    } else if (q.type === 'matching') {
        q.matchingColumnA = q.matchingColumnA.map(item => ({
            key: item.key,
            text: item.text.replace(/\s+/g, ' ').trim()
        }));
        q.matchingColumnB = q.matchingColumnB.map(item => ({
            key: item.key,
            text: item.text.replace(/\s+/g, ' ').trim()
        }));
    }
    return q;
});

// Save to questions.json
fs.writeFileSync(path.join(__dirname, 'questions.json'), JSON.stringify(questions, null, 2), 'utf8');
console.log(`Successfully parsed ${questions.length} questions.`);

// Log theme-wise breakdown
const breakdown = {};
questions.forEach(q => {
    const key = `${q.theme} -> ${q.type}`;
    breakdown[key] = (breakdown[key] || 0) + 1;
});
console.log('Breakdown:', breakdown);
