require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

// -----------------------------
// Basic configuration
// -----------------------------

const ADMIN_PASSWORD = "admin123";

const DATA_FOLDER = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_FOLDER, "tickets.json");

// Create data folder if it doesn't exist
if (!fs.existsSync(DATA_FOLDER)) {
    fs.mkdirSync(DATA_FOLDER);
}

// Create tickets.json if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]");
}

// -----------------------------
// Middleware
// -----------------------------

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// -----------------------------
// Helper functions
// -----------------------------

function readTickets() {
    try {
        const data = fs.readFileSync(DATA_FILE, "utf8");

        if (!data.trim()) {
            return [];
        }

        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading tickets:", error);
        return [];
    }
}

function saveTickets(tickets) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(tickets, null, 2));
}

function generateTicketId(tickets) {
    const number = tickets.length + 1;

    return `CMP-${String(number).padStart(4, "0")}`;
}

// -----------------------------
// Complaint Analysis
// -----------------------------

function analyzeComplaint(text) {

   const complaint = text.toLowerCase();

let category = "General";

const paymentKeywords = [
    "payment", "paid", "pay", "transaction",
    "deducted", "debit", "refund", "money",
    "charged", "upi", "card", "bank", "cash"
];

const deliveryKeywords = [
    "delivery", "delivered", "order", "shipment",
    "shipping", "courier", "parcel", "late",
    "delayed", "tracking"
];

const technicalKeywords = [
    "login", "log in", "password", "app",
    "website", "error", "bug", "crash",
    "not working", "doesn't work", "cannot",
    "can't", "unable", "server", "internet",
    "network"
];

const productKeywords = [
    "product", "item", "damaged", "defective",
    "broken", "wrong product", "wrong item",
    "quality", "missing part", "duplicate"
];

const serviceKeywords = [
    "service", "support", "staff", "employee",
    "representative", "customer care",
    "customer service", "behavior", "response",
    "complaint"
];

if (paymentKeywords.some(word => complaint.includes(word))) {
    category = "Payment";
} else if (deliveryKeywords.some(word => complaint.includes(word))) {
    category = "Delivery";
} else if (technicalKeywords.some(word => complaint.includes(word))) {
    category = "Technical";
} else if (productKeywords.some(word => complaint.includes(word))) {
    category = "Product";
} else if (serviceKeywords.some(word => complaint.includes(word))) {
    category = "Service";
}


let sentiment = "Neutral";

const negativeWords = [
    "failed", "failure", "problem", "issue",
    "bad", "worst", "angry", "frustrated",
    "disappointed", "broken", "damaged",
    "late", "delayed", "unable", "cannot",
    "can't", "wrong", "poor", "terrible",
    "deducted"
];

const positiveWords = [
    "thank", "thanks", "good", "great",
    "excellent", "happy", "satisfied",
    "appreciate", "helpful"
];

const negativeCount =
    negativeWords.filter(word => complaint.includes(word)).length;

const positiveCount =
    positiveWords.filter(word => complaint.includes(word)).length;

if (negativeCount > positiveCount && negativeCount > 0) {
    sentiment = "Negative";
} else if (positiveCount > negativeCount && positiveCount > 0) {
    sentiment = "Positive";
}


let urgency = "Low";

const highUrgencyWords = [
    "urgent", "immediately", "emergency",
    "critical", "danger", "dangerous",
    "safety", "fraud", "hacked",
    "stolen", "blocked", "serious"
];

const mediumUrgencyWords = [
    "failed", "problem", "issue", "unable",
    "cannot", "can't", "delayed", "late",
    "deducted", "not working"
];

if (highUrgencyWords.some(word => complaint.includes(word))) {
    urgency = "High";
} else if (mediumUrgencyWords.some(word => complaint.includes(word))) {
    urgency = "Medium";
}


let priority = "Low";

if (urgency === "High") {
    priority = "High";
} else if (urgency === "Medium") {
    priority = "Medium";
}


let summary =
    "Customer has submitted a general complaint.";

if (category === "Payment") {
    summary = "Customer is reporting a payment-related issue.";
} else if (category === "Delivery") {
    summary = "Customer is reporting a delivery-related issue.";
} else if (category === "Technical") {
    summary = "Customer is reporting a technical issue.";
} else if (category === "Product") {
    summary = "Customer is reporting a product-related issue.";
} else if (category === "Service") {
    summary = "Customer is reporting a service-related issue.";
}


let action = "Send to General support.";

if (category === "Payment") {
    action = "Send to Payment support.";
} else if (category === "Delivery") {
    action = "Send to Delivery support.";
} else if (category === "Technical") {
    action = "Send to Technical support.";
} else if (category === "Product") {
    action = "Send to Product support.";
} else if (category === "Service") {
    action = "Send to Service support.";
}

    return {
        category,
        sentiment,
        urgency,
        priority,
        summary,
        action
    };
}



// -----------------------------
// Submit a new complaint
// -----------------------------

app.post("/api/complaints", (req, res) => {
    const { complaint } = req.body;

    if (!complaint || !complaint.trim()) {
        return res.status(400).json({
            message: "Complaint cannot be empty."
        });
    }

    const tickets = readTickets();

    const analysis = analyzeComplaint(complaint);

    const ticket = {
        id: generateTicketId(tickets),
        complaint: complaint.trim(),
        category: analysis.category,
        sentiment: analysis.sentiment,
        urgency: analysis.urgency,
        priority: analysis.priority,
        summary: analysis.summary,
        action: analysis.action,
        status: "Open",
        createdAt: new Date().toISOString()
    };

    tickets.push(ticket);

    saveTickets(tickets);

    res.json({
        message: "Complaint submitted successfully.",
        ticket
    });
    });

// -----------------------------
// Track a ticket
// -----------------------------

app.get("/api/tickets/:id", (req, res) => {
    const ticketId = req.params.id.toUpperCase();

    const tickets = readTickets();

    const ticket = tickets.find(ticket => ticket.id === ticketId);

    if (!ticket) {
        return res.status(404).json({
            message: "Ticket not found."
        });
    }

    res.json(ticket);
});

// -----------------------------
// Admin login
// -----------------------------

app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;

    if (password === ADMIN_PASSWORD) {
        return res.json({
            success: true,
            message: "Admin login successful."
        });
    }

    res.status(401).json({
        success: false,
        message: "Incorrect admin password."
    });
});

// -----------------------------
// Get all tickets for admin
// -----------------------------

app.get("/api/admin/tickets", (req, res) => {
    const password = req.headers["x-admin-password"];

    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({
            message: "Unauthorized."
        });
    }

    const tickets = readTickets();

    const priorityOrder = {
        High: 1,
        Medium: 2,
        Low: 3
    };

    tickets.sort((a, b) => {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    res.json(tickets);
});

// -----------------------------
// Update ticket status
// -----------------------------

app.put("/api/admin/tickets/:id/status", (req, res) => {
    const password = req.headers["x-admin-password"];

    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({
            message: "Unauthorized."
        });
    }

    const { status } = req.body;

    const allowedStatuses = [
        "Open",
        "In Progress",
        "Resolved"
    ];

    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
            message: "Invalid status."
        });
    }

    const tickets = readTickets();

    const ticket = tickets.find(
        ticket => ticket.id === req.params.id.toUpperCase()
    );

    if (!ticket) {
        return res.status(404).json({
            message: "Ticket not found."
        });
    }

    ticket.status = status;

    saveTickets(tickets);

    res.json({
        message: "Ticket status updated.",
        ticket
    });
});

// -----------------------------
// Start server
// -----------------------------

app.listen(PORT, () => {
    console.log(`AI Complaint Analyzer is running at http://localhost:${PORT}`);
});

app.post("/api/signup", (req, res) => {
    const user = req.body;

    console.log("New user signup:", user);

    res.json({
        success: true,
        message: "Account created successfully"
    });
});

app.post("/api/login", (req, res) => {
    const { email, phone, password } = req.body;

    console.log("Login attempt:", email);

    res.json({
        success: true,
        message: "Login successful"
    });
});
let complaints = [];

app.post("/api/analyze",async (req, res) => {

  const {
    category,
    complaint,
    orderId,
    transactionId,
    customerId,
    serviceProvider,
    servicePhone,
    productId,
    latitude,
    longitude
} = req.body;

    const text = complaint.toLowerCase();
    const provider =
    (serviceProvider || "").toLowerCase();

const combinedText =
    text + " " +
    provider + " " +
    (orderId || "") + " " +
    (transactionId || "") + " " +
    (customerId || "") + " " +
    (productId || "");

    let company = "General Support";
    let destination = "General Support";
    let supportUrl = "#";
    let icon = "🎫";

    let sentiment = "Negative";
    let urgency = "Medium";
    let priority = "Medium";

    let summary = "Customer is reporting a complaint.";
    let action = "Send to the appropriate support team.";

    // AMAZON
    if (combinedText.includes("amazon")) {

        company = "Amazon";
        destination = "Amazon Support";
      supportUrl = "https://www.amazon.in/";
        icon = "🛒";

    }

    // FLIPKART
    else if (combinedText.includes("flipkart")) {

        company = "Flipkart";
        destination = "Flipkart Support";
        supportUrl = "https://www.flipkart.com/helpcentre";
        icon = "🛍️";

    }

    // HDFC BANK
    else if (combinedText.includes("hdfc")) {

        company = "HDFC Bank";
        destination = "HDFC Bank Support";
        supportUrl = "https://www.hdfcbank.com/personal/need-help";
        icon = "🏦";

    }

    // JIO
    else if (combinedText.includes("jio")) {

        company = "Jio";
        destination = "Jio Support";
        supportUrl = "https://www.jio.com/help/";
        icon = "📱";

    }

    // AIRTEL
    else if (combinedText.includes("airtel")) {

        company = "Airtel";
        destination = "Airtel Support";
        supportUrl = "https://www.airtel.in/help";
        icon = "📶";

    }

    // CIVIC / ROAD COMPLAINT
    else if (
        combinedText.includes("road") ||
        combinedText.includes("pothole") ||
        combinedText.includes("street") ||
        combinedText.includes("garbage")
    ) {

        company = "Civic Authority";
        destination = "Government / Civic Complaint Portal";
        supportUrl = "https://pgportal.gov.in/";
        icon = "🏛️";
        if (!latitude || !longitude) {
    return res.status(400).json({
        success: false,
        message: "Live location is required for civic complaints."
    });
}
        console.log("Civic complaint location:");
console.log("Latitude:", latitude);
console.log("Longitude:", longitude);

    }


    // CATEGORY ANALYSIS

    if (category === "Payment") {

        summary = "Customer is reporting a payment-related issue.";
        action = "Review the payment issue and contact the relevant payment support team.";

    }

    else if (category === "Delivery") {

        summary = "Customer is reporting a delivery-related issue.";
        action = "Contact the relevant delivery support team.";

    }

    else if (category === "Technical") {

        summary = "Customer is reporting a technical issue.";
        action = "Send the complaint to technical support.";

    }

    else if (category === "Account") {

        summary = "Customer is reporting an account-related issue.";
        action = "Send the complaint to account support.";

    }

    else if (category === "Product") {

        summary = "Customer is reporting a product-related issue.";
        action = "Send the complaint to product support.";

    }

    else if (category === "Service") {

        summary = "Customer is reporting a service-related issue.";
        action = "Send the complaint to service support.";

    }


    // HIGH URGENCY DETECTION

    if (
        text.includes("urgent") ||
        text.includes("immediately") ||
        text.includes("fraud") ||
        text.includes("blocked") ||
        text.includes("stolen")
    ) {

        urgency = "High";
        priority = "High";

    }


    // CREATE TICKET ID

    const ticketId =
        "TKT-" +
        Math.floor(1000 + Math.random() * 9000);
        const externalSubmission =
    await submitToExternalService({

        company: company,

        category: category,

        complaint: complaint,

        orderId: orderId,

        transactionId: transactionId,

        customerId: customerId,

        serviceProvider: serviceProvider,

        servicePhone: servicePhone,

        productId: productId

    });

     complaints.push({

    ticketId: ticketId,

    category: category,

    company: company,

        latitude: latitude || "",
    longitude: longitude || "",

    urgency: urgency,

    priority: priority,

    status: "Open",

    summary: summary,

    action: action,

    complaint: complaint,

    orderId: orderId || "",

    transactionId: transactionId || "",

    customerId: customerId || "",

    serviceProvider: serviceProvider || "",

    servicePhone: servicePhone || "",

    productId: productId || "",

externalTicketId:
    externalSubmission.externalTicketId,

submissionMessage:
    externalSubmission.message
    
});

    res.json({

    success: true,

    ticketId: ticketId,

    category: category,

   company: company,

complaint: complaint,

latitude: latitude || "",
longitude: longitude || "",

destination: destination,

        supportUrl: supportUrl,

        icon: icon,

        sentiment: sentiment,

        urgency: urgency,

        priority: priority,

        summary: summary,

        action: action,

orderId: orderId || "",
transactionId: transactionId || "",
customerId: customerId || "",
serviceProvider: serviceProvider || "",
servicePhone: servicePhone || "",
productId: productId || "",

externalTicketId:
    externalSubmission.externalTicketId,

submissionMessage:
    externalSubmission.message

});
});
app.get("/api/complaints", (req, res) => {

    res.json({
        success: true,
        complaints: complaints
    });

});


app.put("/api/complaints/:ticketId/status", (req, res) => {

    const ticketId = req.params.ticketId;
    const newStatus = req.body.status;

    const allowedStatuses = [
        "Open",
        "In Progress",
        "Resolved"
    ];

    if (!allowedStatuses.includes(newStatus)) {

        return res.status(400).json({
            success: false,
            message: "Invalid status."
        });

    }

    const complaint = complaints.find(
        item => item.ticketId === ticketId
    );

    if (!complaint) {

        return res.status(404).json({
            success: false,
            message: "Complaint not found."
        });

    }

    complaint.status = newStatus;

    res.json({
        success: true,
        message: "Complaint status updated.",
        complaint: complaint
    });

});

async function submitToExternalService(complaintData) {

   

    const {
        company,
        category,
        complaint,
        orderId,
        transactionId,
        customerId,
        serviceProvider,
        servicePhone,
        productId
    } = complaintData;

    console.log("External submission started.");
    console.log("Company:", company);
    console.log("Category:", category);
    console.log("Complaint:", complaint);



    // AMAZON
// AMAZON
if (company === "Amazon") {

    console.log("=================================");
    console.log("AMAZON API REQUEST");
    console.log("=================================");

    const amazonPayload = {
        complaint: complaint,
        category: category,
        orderId: orderId || null,
        transactionId: transactionId || null,
        customerId: customerId || null,
        serviceProvider: serviceProvider || null,
        servicePhone: servicePhone || null,
        productId: productId || null
    };

    console.log("Data sent to Amazon:");
    console.log(JSON.stringify(amazonPayload, null, 2));

    // DEMO MOCK AMAZON API RESPONSE
    const amazonResponse = {
        success: true,

        externalTicketId:
            "AMZ-" + Math.floor(100000 + Math.random() * 900000),

        message:
            "Complaint successfully submitted to Amazon integration."
    };

    console.log("Amazon Response:");
    console.log(amazonResponse);

    console.log("=================================");

    return amazonResponse;
}

    // FLIPKART
    if (company === "Flipkart") {

        return {
            success: true,
            externalTicketId:
                "FK-" +
                Math.floor(100000 + Math.random() * 900000),
            message:
                "Complaint submitted to Flipkart integration."
        };

    }


    // HDFC BANK
    if (company === "HDFC Bank") {

        return {
            success: true,
            externalTicketId:
                "HDFC-" +
                Math.floor(100000 + Math.random() * 900000),
            message:
                "Complaint submitted to HDFC integration."
        };

    }


    // JIO
    if (company === "Jio") {

        return {
            success: true,
            externalTicketId:
                "JIO-" +
                Math.floor(100000 + Math.random() * 900000),
            message:
                "Complaint submitted to Jio integration."
        };

    }


    // AIRTEL
    if (company === "Airtel") {

        return {
            success: true,
            externalTicketId:
                "AIR-" +
                Math.floor(100000 + Math.random() * 900000),
            message:
                "Complaint submitted to Airtel integration."
        };

    }


    // GENERAL
    return {
        success: true,
        externalTicketId:
            "EXT-" +
            Math.floor(100000 + Math.random() * 900000),
        message:
            "Complaint submitted to the relevant service integration."
    };

}

