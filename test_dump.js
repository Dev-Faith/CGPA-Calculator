const fs = require('fs');

const text = fs.readFileSync('scratch_docx_dump.txt', 'utf8');

const chunks = text.split("NAME -").map((c) => c.trim()).filter((c) => c.length > 0);

if (!chunks[0].includes("MATRIC NUMBER")) {
  chunks.shift();
}

console.log("Found chunks:", chunks.length);

chunks.forEach((chunk, index) => {
    const matricMatch =
      chunk.match(/MATRIC NUMBER\s*(ECT.*?)\s*FACULTY/im) ||
      chunk.match(/MATRIC NUMBER\s*(.*?)\s*(?:FACULTY|DEPARTMENT)/im);
    
    let matricNo = matricMatch ? matricMatch[1].trim() : "Unknown Matric";
    console.log("Chunk", index, "RAW Matric:", matricNo);
    matricNo = matricNo.replace(/\s+/g, '').toUpperCase();
    console.log("Chunk", index, "Normalized Matric:", matricNo);

    // Test first course block
    const lines = chunk.split("\n").map((l) => l.trim()).filter((l) => l !== "");
    const grades = {};
    const scores = {};
    
    let currentCourseCode = null;
    let courseNumbers = [];
    let courseGrades = [];
    let currentTitle = null;

    const finalizeCourse = () => {
      if (!currentCourseCode) return;
      
      let unit = null;
      let score = null;
      
      for (const num of courseNumbers) {
         if (unit === null && num >= 1 && num <= 15) unit = num;
         else if (score === null && num >= 0 && num <= 100) score = num;
      }

      const validGrades = courseGrades.filter(g => g !== "-");
      const finalGrade = validGrades.length > 0 ? validGrades[0] : (courseGrades.length > 0 ? "-" : null);

      if (finalGrade !== null) {
         grades[currentCourseCode] = finalGrade;
      }
      if (score !== null) {
         scores[currentCourseCode] = score;
      }
    };

    for (let j = 0; j < lines.length; j++) {
      const line = lines[j].toUpperCase();
      if (/^[A-Z]{2,4}\s*\d{2,4}$/.test(line)) {
        finalizeCourse();
        currentCourseCode = line.replace(/\s+/g, ' ');
        courseNumbers = [];
        courseGrades = [];
        currentTitle = null;
        continue;
      }

      if (currentCourseCode) {
        if (/^\d{1,3}(?:\.\d+)?$/.test(line)) {
           courseNumbers.push(parseFloat(line));
        }
        else if (/^(A|AB|B|BC|C|CD|D|E|F|ABS|INC|-)$/.test(line)) {
           courseGrades.push(line);
        }
        else if (currentTitle === null && line !== "") {
           currentTitle = lines[j];
        }
      }
    }
    finalizeCourse();

    console.log("Grades:", grades);
    console.log("Scores:", scores);
});
