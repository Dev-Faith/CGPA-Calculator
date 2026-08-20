const mockText = `
NAME - JOHN DOE (Surname first)
MATRIC NUMBER ECT25/COM/001 FACULTY
DEPARTMENT - COMPUTER SCIENCE LEVEL OF STUDY - ND SESSION
GPA = 3.26
Remark - PASS
Total Credit units = 19
Total Grade Points = 62.00
GRADE SUMMARY
S/N
COURSE CODE
COURSE TITLE
UNIT
SCORE
GRADE
1
CSE 251
Relational Data Base Management (RDBMS) I
4
44
E
4.00
2
CSE 241
Structured Query Language I
3
66
B
12.00
`;

const chunk = mockText;
const coursesTextMatch = chunk.match(/GRADE\s*SUMMARY([\s\S]*)/i);
console.log("coursesTextMatch found?", !!coursesTextMatch);
if (coursesTextMatch) {
    const lines = coursesTextMatch[1].split("\n").map((l) => l.trim()).filter((l) => l !== "");
    const grades = {};
    const scores = {};
    let currentCourseCode = null;
    let currentUnit = null;
    let currentScore = null;
    let currentTitle = null;

    for (let j = 0; j < lines.length; j++) {
        const line = lines[j].toUpperCase();
        
        if (/^[A-Z]{2,4}\s*\d{2,4}$/.test(line)) {
            currentCourseCode = line.replace(/\s+/g, ' ');
            currentUnit = null;
            currentScore = null;
            currentTitle = null;
            continue;
        }

        if (currentCourseCode) {
            if (/^\d{1,3}$/.test(line)) {
                const num = parseInt(line);
                if (currentUnit === null && num >= 1 && num <= 15) {
                    currentUnit = num;
                } 
                else if (currentScore === null && num >= 0 && num <= 100) {
                    currentScore = num;
                }
            }
            else if (/^(A|AB|B|BC|C|CD|D|E|F|ABS|INC|-)$/.test(line)) {
                grades[currentCourseCode] = line;
                if (currentScore !== null) {
                    scores[currentCourseCode] = currentScore;
                }
                currentCourseCode = null; 
            }
            else if (currentTitle === null && line !== "") {
                currentTitle = lines[j];
            }
        }
    }
    console.log("Grades:", grades);
    console.log("Scores:", scores);
}
