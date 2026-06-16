const fs = require('fs');
const { PDFParse } = require('pdf-parse');

let dataBuffer = fs.readFileSync('../4 ADMINISTRADOR DE SISTEMAS Y SERVICIOS.pdf');
const parser = new PDFParse({ data: dataBuffer });

parser.getText().then(function(data) {
    fs.writeFileSync('extracted_text.txt', data.text);
    console.log("PDF parsed successfully. Total characters:", data.text.length);
}).catch(err => {
    console.error("Error parsing pdf:", err);
});
