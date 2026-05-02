# Codex Implementation Prompt: Onboarding & Settings

**Context:** We are building "SiteLedger", a real estate and construction management application. We need to implement an India-specific company onboarding flow and a comprehensive Settings page.

Please implement the following requirements. 

## 1. Company Registration / Onboarding Flow
Whenever a new developer/company registers, we need an onboarding wizard/form to capture their corporate identity. We already have their email. Ask for the following fields (Note: Make most of these **NOT MANDATORY**, as users can fill them later):

*   **Basic Info:** Legal Company Name, Trade Name (DBA), Corporate Address, Support Contact Number.
*   **India-Specific Tax & Legal Identifiers:**
    *   GSTIN (Goods and Services Tax ID)
    *   PAN (Permanent Account Number)
    *   TAN (Tax Deduction Account Number)
    *   CIN (Corporate Identification Number)
    *   RERA Registration Number (Real Estate Regulatory Authority)
    *   MSME / Udyam Registration No.
    *   EPF & ESIC Registration Numbers
    *   BOCW Registration (Labour Cess)
*   **Company Logo Upload (AWS S3):**
    *   Implement a file upload component that uploads the image to AWS S3.
    *   Store the returned S3 URL string in the database as the company's logo.
    *   Provide options to "Edit", "Replace", or "Delete/Remove" the logo during and after onboarding.
    *   *Note:* This logo will be used later for PDF receipt generation.

## 2. The Settings Page
Create a dedicated `Settings` page with a tabbed interface (or sidebar navigation) containing two primary sections:

### Section A: Edit Profile
*   Provide a form that loads all the data captured during the Onboarding Flow (Name, Address, Contact, India-specific Identifiers like GST, PAN, RERA, and the Logo).
*   Allow the user to update or delete any of these values.
*   Allow the user to manage their AWS-hosted logo (upload new, delete existing).

### Section B: Receipt Settings (With Live Preview)
*   This section allows the user to customize how their customer and vendor receipts will look.
*   **Configuration Form (Checkboxes):**
    *   Provide a list of checkboxes asking what elements should be printed on the final receipt.
    *   Examples of toggles: "Show Company Logo", "Show GSTIN", "Show PAN", "Show RERA Number", "Show Corporate Address", "Show Support Contact".
*   **Live Preview Pane:**
    *   Next to (or below) the checkboxes, render a visual "Live Preview" of a dummy receipt.
    *   As the user toggles the checkboxes on and off, the live preview should dynamically update to show or hide those specific India-specific identifiers (e.g., if "Show RERA" is unchecked, the RERA number disappears from the dummy receipt preview).
    *   *(Note: Do not implement the actual PDF generation logic yet, just a UI preview using React components/HTML).*

---

**CRITICAL NOTE FOR CODEX:** 
strictly croos verify all changes ne by one
