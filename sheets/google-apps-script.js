// Google Apps Script — Contact Inquiries Sheet
// =============================================
// 1. Open your Google Sheet (Contact Inquiries)
// 2. Go to Extensions → Apps Script
// 3. Delete any existing code and paste ONLY the code below
// 4. Click Deploy → New Deployment
//    - Type: Web app
//    - Execute as: Me
//    - Who has access: Anyone
// 5. Click Deploy, authorize when prompted
// 6. Copy the Web App URL and paste it into your .env.local as SHEET_CONTACT_URL
//
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

// =============================================
// Google Apps Script — Life Membership Applications Sheet
// =============================================
// 1. Open your Google Sheet (Life Membership Applications)
// 2. Go to Extensions → Apps Script
// 3. Delete any existing code and paste ONLY the code below
// 4. Click Deploy → New Deployment
//    - Type: Web app
//    - Execute as: Me
//    - Who has access: Anyone
// 5. Click Deploy, authorize when prompted
// 6. Copy the Web App URL and paste it into your .env.local as SHEET_MEMBERSHIP_URL
//
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
