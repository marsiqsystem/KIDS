// =============================================
// Google Apps Script — CONTACT INQUIRIES Sheet
// =============================================
// SETUP:
// 1. Upload "Contact_Inquiries.xlsx" to Google Drive
// 2. Open it with Google Sheets
// 3. Go to Extensions → Apps Script
// 4. Delete any existing code and paste ALL the code below
// 5. Click Deploy → New Deployment
//    - Select type: Web app
//    - Execute as: Me (your email)
//    - Who has access: Anyone
// 6. Click Deploy → Authorize when prompted
// 7. Copy the Web App URL
// 8. Paste it in your .env.local as SHEET_CONTACT_URL
// =============================================

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);

  sheet.appendRow([
    new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    data.name || "",
    data.email || "",
    data.inquiryType || "",
    data.message || ""
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ status: "success" }))
    .setMimeType(ContentService.MimeType.JSON);
}
