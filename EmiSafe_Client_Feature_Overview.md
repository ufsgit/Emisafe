# EmiSafe — Certification Management & Verification Portal
**Client Feature Overview Document**

---

## 1. Introduction & Purpose
**EmiSafe** is a complete digital platform designed to manage candidate records, issue and approve safety certificates, track certificate expiry dates, and allow employers or clients to verify any certificate online in seconds.

The system is divided into two parts:
1. **Public Verification Portal** — Open to clients, employers, and inspectors to check if a certificate is genuine and currently valid.
2. **Staff Management Portal** — A secure portal for internal staff (**Administrators**, **Certification Managers**, and **Examiners**) to manage candidates, scopes, certificates, approvals, and reports.

---

## 2. Public Certificate Verification Portal
Anyone holding a certificate—or an employer checking a worker's credentials—can verify it immediately from the public home page without needing an account.

* **Search by Certificate Number or Emirates ID**: Visitors can enter either the **Certificate Number** or the candidate's **Emirates ID** to look up a record.
* **QR Code Instant Verification**: Every printed certificate includes a QR code. Scanning the QR code with a phone camera opens the verification page and displays the result automatically.
* **Clear Color-Coded Status**:
  * **Green (Valid / Pass)**: Confirms the candidate passed and the certificate is currently within its validity period, showing the exact number of days remaining.
  * **Red (Expired / Fail / Withdrawn / Withheld)**: Immediately alerts the viewer if the certificate has expired or if its status is Fail, Withdrawn, or Withheld.
* **Complete Verification Details**: Displays the Candidate Name, Candidate Photo, Emirates ID, Company Name, Certification Scope, Accreditation Status (**EIAC** or **Non-EIAC**), Issue Date, Expiry Date, and Certification Status.

---

## 3. Staff Roles & Permissions
To ensure quality control and security, the portal uses three distinct staff roles:

| Role | Key Responsibilities & Access |
| :--- | :--- |
| **Administrator** | Full access to manage **Users** (create, edit, activate, or deactivate any staff member including Managers), upload the **Official Certificate Format**, view **Login History**, and manage Candidates, Scopes, Certificates, and Reports. *(Administrators do not approve certificates.)* |
| **Certification Manager** | Exclusive authority to **Approve** newly issued certificates. Can view the **Pending Approval** queue on both the Dashboard and the Certificates page, and can manage Candidates, Scopes, Certificates, and Reports. |
| **Examiner** | Enters candidate records, uploads candidate documents, and issues new certificates (which are automatically placed in the **Pending Approval** queue for the Certification Manager). |

**Safe Account Deactivation (No Data Loss)**: Administrators can deactivate any user account (including a Certification Manager or Examiner) at any time. Deactivated users are immediately blocked from signing in, while all historical records they created remain safely preserved.

---

## 4. Dashboard & At-a-Glance Insights
When staff sign in, the **Dashboard** provides an immediate overview of operations:

* **Key Summary Cards**:
  * **Total Candidates** (showing active vs. inactive candidates)
  * **Total Certificates** (showing Passed vs. Failed / Withheld counts)
  * **Active (Valid) Certificates** (including how many are expiring within the next 30 days)
  * **Expired Certificates** (with percentage breakdown)
* **Visual Charts**:
  * **Certificates Issued (3-Year Trend)**: Tracks certificate volume quarter by quarter.
  * **Pass / Fail Ratio**: Visual breakdown of Pass vs. Fail/Withheld certificates.
  * **Validity Status**: Compares currently Valid vs. Expired certificates.
  * **By Scope Ranking**: Ranked progress bars showing the most frequently issued certification scopes.
* **Pending Approval Queue (Certification Manager Only)**: Lists certificates waiting for manager sign-off with a one-click **Approve** action.
* **Expiring Soon (30 Days) Alert Table**: Lists certificates expiring within the next 30 days so staff can notify clients for renewal.

---

## 5. Candidate Management
The **Candidates** section stores a complete profile for every individual trained or assessed by EmiSafe.

* **Mandatory & Optional Profile Fields**:
  * **Required**: Full Name, Emirates ID (unique to each candidate), and Candidate Photo.
  * **Optional**: Company Name, Designation / Job Title, Email, Phone Number, Nationality, Date of Birth, Gender, and Address.
* **Document Folder (Multi-File Upload)**:
  * Staff can upload and categorize supporting documents for each candidate (**Passport**, **Emirates ID**, **Photo**, or **Other**).
  * All uploaded documents can be viewed or managed directly from the candidate's profile page.
* **Current & Previous Company History**:
  * Candidates often move from one employer to another over time.
  * When a candidate is issued a new certificate under a new company, the system automatically keeps their earlier certificates grouped under their **Previous Company** while displaying their latest employer as their **Current Company**.
* **Activate / Deactivate Candidates**: Candidates can be marked Active or Inactive without losing their past certification history.

---

## 6. Certification Scopes Management
The **Certification Scopes** section controls the list of training and inspection courses offered.

* **Accreditation Classification**: Each scope is classified as either **EIAC** or **Non-EIAC**.
* **Predefined & Custom Scopes**:
  * When adding an **EIAC** scope, staff can choose from the approved list or select **Other** to enter a new scope name.
  * When adding a **Non-EIAC** scope, staff can type the custom scope name directly.
* **Active / Inactive Control**: Scopes that are no longer offered can be deactivated so they cannot be selected for new certificates, while existing certificates under that scope remain valid.

---

## 7. Certificate Issuance, Approval & Printing
The **Certificates** section handles the full lifecycle of a certificate from creation to printing.

### A. Issuing a Certificate (`Issue Certificate` Window)
1. **Emirates ID Lookup**: Enter the candidate's Emirates ID and click **Search**. The system automatically fills in the **Candidate Name**, **Candidate Photo**, and **Company Name**. *(A warning is shown if the candidate does not have a photo on file yet.)*
2. **Company Name**: Confirm or update the company name for this specific certificate.
3. **Certification Scope**: Select an active scope from the list, or choose **Other** to type a custom scope manually.
4. **Accreditation Status**: Automatically selects **EIAC** or **Non-EIAC** based on the chosen scope (and can be adjusted if needed).
5. **Certification Status**: Select **Pass**, **Fail**, **Withdrawn**, or **Withheld**.
6. **Certificate Number**: Enter the official certificate number (e.g., `WOR-26/000125/13/11-01-C1`).
7. **Issue Date & Expiry Date**: Select the issue and expiry dates (the system ensures the expiry date is after the issue date).

### B. Manager Approval Workflow
* Every newly issued certificate starts with a **Pending** approval status.
* Only a **Certification Manager** sees the **Pending Approval** tab and the **Approve** button to officially approve the certificate.

### C. Certificate Formats & Printing
* **Two Built-In Printable Layouts**: Every certificate can be opened and printed in **Standard Format (Full Page PDF)** or **Compact Format**, complete with candidate photo, company, accreditation status, signature block, and verification QR code.
* **Custom Client Certificate Format Upload (Admin Only)**: Administrators have an **Upload Raw Certificate Format** button on the Certificates page to upload the client's official certificate template file at any time, or switch back to the default demo format.

---

## 8. Reports & Data Export
The **Reports** section provides management summaries that can be viewed on screen or downloaded as a **CSV / Excel** spreadsheet with one click:

1. **Candidate-Wise Report**: Shows each candidate's details alongside their Total Issued, Valid, Expired, and Failed/Withheld certificate counts.
2. **Certification Scope-Wise Report**: Shows each certification scope alongside its accreditation status and total Valid, Expired, and Failed/Withheld counts.

---

## 9. Login History & Security (Administrator Only)
* **Login Timestamps & Device Tracking**: Every time a staff member signs in, the system records the date and time, user name, email, role, IP address, and browser/device used.
* **Restricted Visibility**: The **Login History** tab is strictly visible only to **Administrators** for security auditing.

