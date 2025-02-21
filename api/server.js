const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');
const crypto=require('crypto');
const {Cashfree}=require('cashfree-pg');
const { Client, Account } = require('node-appwrite');

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

app.post('/api/VerifyPayment', async (req, res) => {
  try {
   let {orderId}=req.body;
   console.error(" orderid = ",orderId)
   console.log(" orderid send to server = ",orderId)
   const resp= await Cashfree.PGOrderFetchPayments("2023-08-01",orderId)
   res.json(resp)
   console.log(resp)
   
  } catch (error) {
    console.error("Unexpected error in verify payment:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



// Set the port for the server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
