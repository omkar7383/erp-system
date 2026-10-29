
function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[char];
  });
}

function offerLetterTemplate({
  employeeName,
  designation,
  department,
  joiningDate,
  companyName,
  issueDate,
}) {
  const safe = {
    employeeName: escapeHtml(employeeName),
    designation: escapeHtml(designation),
    department: escapeHtml(department),
    joiningDate: escapeHtml(joiningDate),
    companyName: escapeHtml(companyName),
    issueDate: escapeHtml(issueDate),
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Offer Letter</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      color: #1e293b;
      font-size: 12px;
      line-height: 1.8;
    }
    .header {
      border-bottom: 3px solid #7c3aed;
      padding-bottom: 16px;
      margin-bottom: 30px;
    }
    .company {
      color: #6d28d9;
      font-size: 22px;
      font-weight: bold;
    }
    .title {
      text-align: center;
      font-size: 20px;
      margin: 28px 0;
      letter-spacing: 1px;
    }
    .details {
      margin: 24px 0;
      padding: 16px;
      background: #f5f3ff;
      border-left: 4px solid #7c3aed;
    }
    .signature {
      margin-top: 55px;
    }
    .footer {
      margin-top: 55px;
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
      color: #64748b;
      font-size: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company">${safe.companyName}</div>
    <div>Human Resources Department</div>
  </div>

  <h1 class="title">OFFER LETTER</h1>

  <p><strong>Date:</strong> ${safe.issueDate}</p>

  <p>To,<br>
  <strong>${safe.employeeName}</strong></p>

  <p>Dear ${safe.employeeName},</p>

  <p>
    We are pleased to offer you the position described below
    at ${safe.companyName}, subject to the terms and conditions
    approved by the company.
  </p>

  <div class="details">
    <p><strong>Designation:</strong> ${safe.designation}</p>
    <p><strong>Department:</strong> ${safe.department}</p>
    <p><strong>Joining Date:</strong> ${safe.joiningDate}</p>
  </div>

  <p>
    Please review the final employment terms and contact the
    Human Resources Department if you have any questions.
  </p>

  <p>We look forward to welcoming you to our team.</p>

  <div class="signature">
    <p>Regards,</p>
    <p><strong>Authorized HR Representative</strong><br>
    ${safe.companyName}</p>
  </div>

  <div class="footer">
    Generated from the HR Documents Management System.
    This offer requires authorized review and approval before issuance.
  </div>
</body>
</html>`;
}

module.exports = offerLetterTemplate;
