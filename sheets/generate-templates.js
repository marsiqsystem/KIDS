const ExcelJS = require("exceljs");
const path = require("path");

async function generate() {
  const sheetsDir = path.join(__dirname);

  // ─── Contact Inquiries ───
  const contactWb = new ExcelJS.Workbook();
  const contactSheet = contactWb.addWorksheet("Contact Inquiries");
  
  contactSheet.columns = [
    { header: "Timestamp", key: "timestamp", width: 22 },
    { header: "Name", key: "name", width: 25 },
    { header: "Email", key: "email", width: 30 },
    { header: "Inquiry Type", key: "inquiryType", width: 22 },
    { header: "Message", key: "message", width: 50 },
  ];

  // Style header row
  contactSheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4A1515" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FF333333" } },
    };
  });

  contactSheet.autoFilter = "A1:E1";

  await contactWb.xlsx.writeFile(path.join(sheetsDir, "Contact_Inquiries.xlsx"));
  console.log("✅ Contact_Inquiries.xlsx generated");

  // ─── Life Membership Applications ───
  const memberWb = new ExcelJS.Workbook();
  const memberSheet = memberWb.addWorksheet("Life Membership Applications");

  memberSheet.columns = [
    { header: "Timestamp", key: "timestamp", width: 22 },
    { header: "Name", key: "name", width: 25 },
    { header: "Father's Name", key: "fathersName", width: 25 },
    { header: "Spouse Name", key: "spouseName", width: 25 },
    { header: "Children (M)", key: "childrenMale", width: 14 },
    { header: "Children (F)", key: "childrenFemale", width: 14 },
    { header: "Address", key: "address", width: 35 },
    { header: "City", key: "city", width: 18 },
    { header: "Pin Code", key: "pinCode", width: 12 },
    { header: "State", key: "state", width: 18 },
    { header: "Mobile", key: "mobile", width: 18 },
    { header: "WhatsApp", key: "whatsapp", width: 18 },
    { header: "Email", key: "email", width: 30 },
    { header: "Nationality", key: "nationality", width: 16 },
    { header: "DOB", key: "dob", width: 14 },
    { header: "Gender", key: "gender", width: 12 },
    { header: "Qualification", key: "qualification", width: 22 },
    { header: "Occupation", key: "occupation", width: 22 },
    { header: "Payment Mode", key: "paymentMode", width: 16 },
  ];

  memberSheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4A1515" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FF333333" } },
    };
  });

  memberSheet.autoFilter = "A1:S1";

  await memberWb.xlsx.writeFile(path.join(sheetsDir, "Life_Membership_Applications.xlsx"));
  console.log("✅ Life_Membership_Applications.xlsx generated");
}

generate().catch(console.error);
