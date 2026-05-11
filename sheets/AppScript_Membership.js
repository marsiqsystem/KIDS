// =============================================
// Google Apps Script — LIFE MEMBERSHIP Sheet
// =============================================
// SETUP:
// 1. Upload "Life_Membership_Applications.xlsx" to Google Drive
// 2. Open it with Google Sheets
// 3. Go to Extensions → Apps Script
// 4. Delete any existing code and paste ALL the code below
// 5. Click Deploy → New Deployment
//    - Select type: Web app
//    - Execute as: Me (your email)
//    - Who has access: Anyone
// 6. Click Deploy → Authorize when prompted
// 7. Copy the Web App URL
// 8. Paste it in your .env.local as SHEET_MEMBERSHIP_URL
// =============================================

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);

  sheet.appendRow([
    new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    data.name || "",
    data.fathersName || "",
    data.spouseName || "",
    data.childrenMale || "",
    data.childrenFemale || "",
    data.address || "",
    data.city || "",
    data.pinCode || "",
    data.state || "",
    data.mobile || "",
    data.whatsapp || "",
    data.email || "",
    data.nationality || "",
    data.dob || "",
    data.gender || "",
    data.qualification || "",
    data.occupation || "",
    data.paymentMode || ""
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ status: "success" }))
    .setMimeType(ContentService.MimeType.JSON);
}
