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

    // Check if it's the start of a question
    let isNewQuestion = false;
    const questionStartMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (questionStartMatch) {
        if (currentSection === 'matching') {
            if (line.includes('Relacione')) {
                isNewQuestion = true;
            }
        } else {
            isNewQuestion = true;
        }
    }

    if (isNewQuestion) {
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
            answer: '',
            rawMatchingLines: []
        };

        i++;
        // Read lines for question body until options or answer is found
        while (i < lines.length) {
            let nextLine = lines[i];
            if (!nextLine) {
                i++;
                continue;
            }

            // Check if nextLine starts a new question, theme, section, etc.
            let isInnerNewQ = false;
            const innerQMatch = nextLine.match(/^(\d+)\.\s+/);
            if (innerQMatch) {
                if (currentSection === 'matching') {
                    if (nextLine.includes('Relacione')) {
                        isInnerNewQ = true;
                    }
                } else {
                    isInnerNewQ = true;
                }
            }

            if (nextLine.startsWith('TEMA ') || 
                nextLine === 'PREGUNTAS DE V Y F' || 
                nextLine === 'Emparejamiento' || 
                nextLine === 'Selección Múltiple' || 
                nextLine.startsWith('Glosario') ||
                isInnerNewQ) {
                break;
            }

            // Answer line - MUST check this before collecting matching lines!
            if (nextLine.startsWith('Respuesta:')) {
                break;
            }

            // True / False options line
            if (nextLine.includes('(__) V') || nextLine.includes('(__) F')) {
                i++;
                continue;
            }

            // Multiple choice options
            if (nextLine.match(/^[a-d]\)\s+/)) {
                break;
            }

            // Matching column marker
            if (nextLine === 'Columna A Columna B') {
                i++;
                continue;
            }

            // Matching lines - if in matching section, we collect them
            if (currentSection === 'matching') {
                currentQuestion.rawMatchingLines.push(nextLine);
                i++;
                continue;
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

        // Collect lines for matching (if they appear after the question text block)
        if (currentSection === 'matching' && !line.startsWith('Respuesta:')) {
            let isAnotherQ = false;
            if (line.match(/^(\d+)\.\s+/)) {
                if (line.includes('Relacione')) {
                    isAnotherQ = true;
                }
            }
            if (!isAnotherQ) {
                if (line !== 'Columna A Columna B') {
                    currentQuestion.rawMatchingLines.push(line);
                }
                i++;
                continue;
            }
        }

        // Parse Answer
        if (line.startsWith('Respuesta:')) {
            let ans = line.replace('Respuesta:', '').trim();
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

// Helper to parse matching text block
function parseMatchingBlock(rawLines) {
    const blockText = rawLines.join(' ').replace(/\s+/g, ' ');
    
    // We look for A., B., C. and 1., 2., 3.
    const markers = [
        { key: 'A', regex: /\bA\.\s+/ },
        { key: 'B', regex: /\bB\.\s+/ },
        { key: 'C', regex: /\bC\.\s+/ },
        { key: '1', regex: /\b1\.\s+/ },
        { key: '2', regex: /\b2\.\.?\s+/ },
        { key: '3', regex: /\b3\.\.?\s+/ }
    ];
    
    const found = [];
    markers.forEach(m => {
        const match = blockText.match(m.regex);
        if (match) {
            found.push({ key: m.key, index: match.index, length: match[0].length });
        }
    });
    
    found.sort((a, b) => a.index - b.index);
    
    const columnA = [];
    const columnB = [];
    for (let idx = 0; idx < found.length; idx++) {
        const current = found[idx];
        const start = current.index + current.length;
        const end = (idx + 1 < found.length) ? found[idx+1].index : blockText.length;
        const text = blockText.substring(start, end).trim();
        
        if (['A', 'B', 'C'].includes(current.key)) {
            columnA.push({ key: current.key, text });
        } else if (['1', '2', '3'].includes(current.key)) {
            columnB.push({ key: current.key, text });
        }
    }
    return { columnA, columnB };
}

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
        const cleanAns = q.answer.replace(')', '').trim().toLowerCase();
        q.answer = cleanAns;
    } else if (q.type === 'matching') {
        const matchedData = parseMatchingBlock(q.rawMatchingLines);
        q.matchingColumnA = matchedData.columnA;
        q.matchingColumnB = matchedData.columnB;
        delete q.rawMatchingLines;
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
