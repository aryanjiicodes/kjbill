# Kamakhya Jewellers — Complete Jewellery Billing & Shop Management Software

Proprietor: **DHANANJAY VERMA**  
Address: **A-123, Ganpati Market, New Ashok Nagar, Delhi – 110096, India**  
Mobile: **9818144011**

---

## Only Software Needed to Install (One-Time Setup)

To run this application on your local counter computer or laptop (Windows, Mac, or Linux), you only need **one free program**:

### 1. Install Node.js (Only Once)
1. Go to [https://nodejs.org](https://nodejs.org) in your web browser.
2. Download the **LTS (Long Term Support)** version for Windows (usually named `v20.x` or `v22.x` Windows Installer `.msi`).
3. Run the installer and click **Next $\rightarrow$ Next $\rightarrow$ Finish** (keep default options).
4. That's it! Node.js is installed.

---

## How to Run the Software on Your Shop Computer

### Method A: One-Click Desktop Shortcut (Easiest for Your Father)
1. In the project folder, locate the file named **`start-kamakhya-jewellers.bat`**.
2. Right-click on it $\rightarrow$ select **Send to $\rightarrow$ Desktop (create shortcut)**.
3. Every morning in the showroom, your father can simply **double-click the icon on the desktop**.
4. It will automatically start the system and open **Google Chrome** to `http://localhost:3000` ready for billing!

---

### Method B: Manual Steps (First Time Setup)

1. **Open Command Prompt (CMD) in the folder**:
   - Open the folder where this project is saved.
   - Click the address bar at the top of the folder, type `cmd` and press **Enter**.

2. **Install dependencies (only the very first time)**:
   ```bash
   npm install
   ```

3. **Start the application**:
   ```bash
   npm run dev
   ```

4. **Open in Browser**:
   Open Google Chrome and visit:
   ```
   http://localhost:3000
   ```

---

## Key Features Ready for Daily Counter Use
- **New GST Bill**: Fast customer search, weight inputs, stone rate calculations, making charges, and instant A4 printing.
- **Download PDF**: Save invoices directly as PDF to your computer with 1 click.
- **Scan-to-Pay QR**: Customers can scan the dynamic UPI QR code on the bill to pay the exact amount.
- **Advance Deposits**: Freeze daily gold rates permanently for customer bookings.
- **Monthly Installments**: Swarna Bachat / Bishi payment passbooks and printed receipts.
- **Counter Switch PIN**:
  - Owner PIN (Dhananjay Verma): `1234`
  - Staff PIN: `0000`
  (PINs can be changed anytime in the **Settings** tab).
- **Data Backup**: Download a complete offline backup `.json` file anytime from the **Settings** tab.
