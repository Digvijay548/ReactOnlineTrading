const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');
const crypto=require('crypto');
const {Cashfree}=require('cashfree-pg');
const { Client, Account,Query } = require('node-appwrite');



dotenv.config(); // Load environment variables from .env file

const app = express();
const corsOptions = {
  origin: "*", // Allow all origins (Change this to your frontend URL for security)
  methods: "GET,POST,PUT,DELETE,OPTIONS",
  allowedHeaders: "Content-Type, Authorization",
  credentials: true
};
app.use(cors(corsOptions));

app.use(express.json()); // For parsing application/json

 // Cashfree credentials (set these as environment variables)

 Cashfree.XEnvironment=Cashfree.Environment.PRODUCTION;
 Cashfree.XClientId = process.env.CASHFREE_CLIENT_ID;
 Cashfree.XClientSecret = process.env.CASHFREE_CLIENT_SECRET;

// Initialize the Appwrite client for authentication
const client = new Client();
client.setEndpoint(process.env.APPWRITE_ENDPOINT) // Set Appwrite endpoint
      .setProject(process.env.APPWRITE_PROJECT_ID); // Set your Appwrite project ID
      //.setKey(process.env.APPWRITE_API_KEY); // Set your Appwrite API key

const account = new Account(client);
const database = new Databases(client);
// ✅ Appwrite database credentials
const DB_ID = process.env.APPWRITE_DATABASE_ID;  // Set your Appwrite database ID
const COLLECTION_ID = process.env.APPWRITE_COLLECTION_ID;  // Set your collection ID




// ✅ Create or Update Balance in Appwrite Database
app.post('/api/update-balance', async (req, res) => {
  const { email, amount } = req.body;

  if (!email || amount === undefined) {
    return res.status(400).json({ error: "Missing email or amount" });
  }

  try {
    console.log("🔍 Checking balance for email:", email);

    // ✅ Query to check if email exists
    const userRecords = await database.listDocuments(DB_ID, COLLECTION_ID, [
      Query.equal("email", [email])  // ✅ Using Query.equal() correctly
    ]);

    if (userRecords.documents.length > 0) {
      // ✅ If user exists, update the balance
      const userId = userRecords.documents[0].$id;
      const newBalance = userRecords.documents[0].balance + parseFloat(amount);

      await database.updateDocument(DB_ID, COLLECTION_ID, userId, {
        balance: newBalance,
        last_trade_time: new Date().toISOString()
      });

      console.log(`✅ Updated balance for ${email}: ₹${newBalance}`);
      return res.json({ message: "Balance updated successfully", balance: newBalance });
    } else {
      // ✅ If user does not exist, create a new entry
      const newUser = await database.createDocument(DB_ID, COLLECTION_ID, ID.unique(), {
        email,
        balance: parseFloat(amount),
        last_trade_time: new Date().toISOString()
      });

      console.log(`✅ New user added: ${email} with balance ₹${amount}`);
      return res.json({ message: "New balance added", balance: amount });
    }
  } catch (error) {
    console.error("❌ Error updating balance:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


app.get('/api/get-balance', async (req, res) => {
  const { email } = req.query; // Get email from query params

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    console.log("🔍 Fetching balance for email:", email);

    // ✅ Query Appwrite to check if email exists
    const userRecords = await database.listDocuments(DB_ID, COLLECTION_ID, [
      Query.equal("email", [email])
    ]);

    if (userRecords.documents.length > 0) {
      // ✅ Email found, return balance
      const user = userRecords.documents[0];
      console.log(`✅ Balance for ${email}: ₹${user.balance}`);
      return res.json({ balance: user.balance, last_trade_time: user.last_trade_time });
    } else {
      // ❌ Email not found
      return res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    console.error("❌ Error fetching balance:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Health check route to verify server is running
app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'Server is up and running! 21-02-2025 15-42' });
});


// Register route to create a new user with Appwrite
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
console.log(email)
console.log(password)
  try {
    // Register the user using Appwrite's createEmailAccount method
    const user = await account.create('unique()',email, password);

    // If registration is successful, return user data
    res.status(201).json({
      message: 'Registration successful',
      user: user, // User details
    });
  } catch (error) {
    // If registration fails, return an error
    console.error('Registration error:', error);
    res.status(400).json({ error: 'Failed to register user' });
  }
});

// Login route to authenticate the user with Appwrite
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  console.error('Login email:', email);
  console.error('Login password:', password);
  try {
    // Authenticate the user with Appwrite using email and password
    const session = await account.createEmailPasswordSession(email, password);
    console.error('Login error:', "error");
    // If successful, return session info (like the user data)
    res.status(200).json({
      message: 'Login successful',
      user: session.user, // Session contains the user info
      sessionId: session.$id // The session ID
    });
  } catch (error) {
    // If authentication fails, return an error
    console.error('Login error:', error);
    res.status(401).json({ error: 'Invalid credentials or error occurred during login' });
  }
});
function GeterateId()
{
  console.log(Cashfree.XClientId.toString())
  const UniqId=crypto.randomBytes(16).toString('hex');
  const hash= crypto.createHash('sha256');
  hash.update(UniqId);

  const orderid=hash.digest('hex');
  return orderid.substring(0,12);
}

// API route to handle payment creation using Cashfree
app.get('/api/create-payment', async (req, res) => {
  const { amount,email } = req.query; // Amount in paise (₹1 = 100 paise)
  // Prepare Cashfree order data
  var request = {
    "order_amount": amount,
    "order_currency": "INR",
    "order_id": await GeterateId(),
    "customer_details": {
      "customer_id": "node_sdk_test",
      "customer_name": "",
      "customer_email": email,
      "customer_phone": "9999999999"
    },
  };
  Cashfree.PGCreateOrder("2023-08-01",request).then(response=>{
    console.error(response.data);
    res.json(response.data);
  }).catch(error=>{
    console.error(error.response.data.message);
  })


});

app.post('/api/Verify_Payment', async (req, res) => {
  try {
   let {orderId}=req.body;
   console.error(" orderid = ",orderId)
   console.log(" orderid send to server = ",orderId)
   Cashfree.PGOrderFetchPayments("2023-08-01",orderId).then((response)=>{
    res.json(response.data);
   })
  } catch (error) {
    console.error("Unexpected error in verify payment:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ Verify Payment using Cashfree API
app.post('/api/VerifyPayment', async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: "Missing orderId" });
    }

    console.log("🔍 Verifying payment for Order ID:", orderId);

    const response = await axios.get(`https://api.cashfree.com/pg/orders/${orderId}`, {
      headers: {
        "x-api-version": "2023-08-01",
        "x-client-id": process.env.CASHFREE_CLIENT_ID,
        "x-client-secret": process.env.CASHFREE_CLIENT_SECRET
      }
    });

    console.log("✅ Payment verification response:", response.data);
    res.json(response.data);

  } catch (error) {
    console.error("❌ Payment verification error:", error.response?.data || error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// Set the port for the server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
