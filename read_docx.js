const mammoth = require("mammoth");

mammoth.extractRawText({path: "RESULT SLIP COM.docx"})
    .then(function(result){
        const text = result.value; // The raw text
        const messages = result.messages;
        console.log(text.substring(0, 5000));
    })
    .catch(function(error) {
        console.error(error);
    });
