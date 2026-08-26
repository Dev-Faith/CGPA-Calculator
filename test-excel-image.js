const ExcelJS = require('exceljs');

async function test() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Broadsheet");

  // Read a dummy image from disk as a base64 or just mock it.
  const fs = require('fs');
  const buffer = fs.readFileSync('public/ecotems-logo.png');

  const imageId = workbook.addImage({
    buffer: buffer,
    extension: 'png',
  });

  worksheet.addImage(imageId, {
    tl: { col: 0, row: 0 },
    ext: { width: 80, height: 80 }
  });

  await workbook.xlsx.writeFile('test.xlsx');
  console.log("Done");
}

test();
