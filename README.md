# Simple Billing Application (BillingPro)

A full-stack billing and invoice management application built using **React, Spring Boot, and a persistent H2 Database**.

---

## 1. Project Overview & Features

- **Customer Information Management:** Capture customer names with strict validation.
- **Product Catalog:** Live database-seeded products loaded dynamically from the backend REST API.
- **Dynamic Invoice Line Items:** Add products, adjust quantities using +/- buttons, and delete line items with real-time subtotal calculation.
- **Business Discount Rule:** Automatic 10% discount applied strictly when the order subtotal is greater than ₹1,000. Subtotals of ₹1,000 or below receive 0% discount.
- **Persistent Database Storage:** Uses file-based H2 storage (`./data/billingdb`) so invoices and products are preserved across server restarts.
- **Invoice History & Search:** Search previous invoices by customer name or invoice number (`INV-YYYYMMDD-XXXX`).
- **Statistical Summary:** Dashboard cards showing total invoices, total revenue, total discounts given, and average invoice value.
- **Print & Download Invoices:** Print-ready invoices using `window.print()` and CSS `@media print`, along with downloadable text receipts.
- **Validation & Error Handling:** Validation on both frontend and backend with standardized HTTP 400 error responses.

---

## 2. Technology Stack

### Backend

- **Framework:** Spring Boot 3.3.5
- **Language:** Java 17
- **Database:** H2 Database (file-based persistent mode)
- **Data Access:** Spring Data JPA / Hibernate ORM
- **Validation:** Jakarta Bean Validation
- **Testing:** JUnit 5, Spring Boot Test, AssertJ
- **Build Tool:** Apache Maven (Maven Wrapper included)

### Frontend

- **Framework:** React 18 with Vite 5
- **HTTP Client:** Axios
- **Styling:** Vanilla CSS3 (custom responsive layout and print-optimized styles)
- **Runtime:** Node.js 18+ and npm

---

## 3. Project Folder Structure

```text
simple-billing-application/
├── .gitignore
├── README.md
│
├── .vscode/
│   └── extensions.json
│
├── backend/
│   ├── .gitignore
│   ├── mvnw.cmd
│   ├── pom.xml
│   ├── run-backend.bat
│   │
│   ├── data/
│   │   └── billingdb.mv.db
│   │
│   └── src/
│       ├── main/
│       │   ├── java/com/example/billing/
│       │   │   ├── ApiExceptionHandler.java
│       │   │   ├── BillDtos.java
│       │   │   ├── BillingApplication.java
│       │   │   ├── BillingController.java
│       │   │   ├── BillService.java
│       │   │   ├── DataSeeder.java
│       │   │   ├── Invoice.java
│       │   │   ├── InvoiceItem.java
│       │   │   ├── InvoiceRepository.java
│       │   │   ├── Product.java
│       │   │   └── ProductRepository.java
│       │   │
│       │   └── resources/
│       │       └── application.properties
│       │
│       └── test/
│           ├── java/com/example/billing/
│           │   └── BillServiceTest.java
│           │
│           └── resources/
│               └── application.properties
│
└── frontend/
    ├── .gitignore
    ├── index.html
    ├── package.json
    ├── package-lock.json
    ├── vite.config.js
    │
    └── src/
        ├── App.jsx
        ├── main.jsx
        └── styles.css
```

*Note: The folder tree represents the intended project structure. The H2 database file is generated when the application runs.*

---

## 4. Opening in Visual Studio Code

1. Launch Visual Studio Code.
2. Click **File → Open Folder**.
3. Select the project folder:

   `C:\Users\Dell\Downloads\simple-billing-application`

4. VS Code will load both the backend and frontend folders.

---

## 5. Database Architecture & Persistence

Invoice and product data are stored using a **persistent file-based H2 database**.

- **Database file location:** `backend/data/billingdb.mv.db`
- **JDBC Connection URL:** `jdbc:h2:file:./data/billingdb;AUTO_SERVER=TRUE`
- **Driver:** `org.h2.Driver`
- **Username:** `sa`
- **Password:** Blank

### How Data Survives Restarts

Unlike an in-memory H2 database (`jdbc:h2:mem:...`), the file-based configuration stores database data on disk.

When the Spring Boot application restarts:

1. `DataSeeder.java` checks whether the product table is empty using `productRepo.count() == 0`. If products already exist, duplicate seed records are not inserted.
2. Saved invoices and their line items remain stored in the database and can be viewed in the Invoice History section.
3. The `AUTO_SERVER=TRUE` setting enables H2 automatic mixed mode, allowing multiple processes to access the same database file under supported conditions.
4. The H2 Web Console is enabled through the Spring Boot application configuration.

**H2 Web Console:**  
`http://localhost:8080/h2-console`

---

## 6. How to Run the Application

### A. Run Backend (Spring Boot)

Open a terminal in VS Code or PowerShell.

Navigate to the backend folder:

```powershell
cd backend
```

Start the Spring Boot application:

```powershell
.\mvnw.cmd spring-boot:run
```

Alternatively, run the `backend\run-backend.bat` file if it is configured for backend startup.

- **Backend URL:** `http://localhost:8080`
- **H2 Web Console:** `http://localhost:8080/h2-console`

### B. Run Frontend (React + Vite)

Open a second terminal in VS Code or PowerShell.

Navigate to the frontend folder:

```powershell
cd frontend
```

Install dependencies:

```powershell
npm install
```

Start the frontend:

```powershell
npm run dev
```

Open the application in your browser:

`http://localhost:5173`

---

## 7. REST API Documentation

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/products` | Retrieve the catalog of available products |
| POST | `/api/bills/validate` | Validate and calculate a proposed bill without saving |
| POST | `/api/invoices` | Calculate, assign an invoice number, and save the invoice |
| GET | `/api/invoices` | List all saved invoices; supports `?search=keyword` |
| GET | `/api/invoices/{id}` | Retrieve full details of an invoice by ID |

---

## 8. Verification & Tests

### Run Backend Unit and Integration Tests

Open a terminal:

```powershell
cd backend
.\mvnw.cmd test
```

### Run Frontend Production Build

Open another terminal:

```powershell
cd frontend
npm run build
```

Successful execution of these commands verifies the backend test suite and frontend production build, respectively.

---

**Project Name:** Simple Billing Application (BillingPro)  
**Frontend:** React 18 + Vite  
**Backend:** Java 17 + Spring Boot 3.3.5  
**Database:** H2 Persistent Database