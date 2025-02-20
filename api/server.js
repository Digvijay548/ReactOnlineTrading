const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');
const { Client, Account } = require('node-appwrite');

dotenv.config(); // Load environment variables from .env file

const app = express();
app.use(cors({
  origin: 'http://localhost:3000'  // Replace with the URL of your frontend
})); // Enable CORS
app.use(express.json()); // For parsing application/json

// Initialize the Appwrite client for authentication
const client = new Client();
client.setEndpoint(process.env.APPWRITE_ENDPOINT) // Set Appwrite endpoint
      .setProject(process.env.APPWRITE_PROJECT_ID); // Set your Appwrite project ID
      //.setKey(process.env.APPWRITE_API_KEY); // Set your Appwrite API key

const account = new Account(client);

// Health check route to verify server is running
app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'Server is up and running!' });
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

// API route to handle payment creation using Cashfree
app.post('/api/create-payment', async (req, res) => {
  const { amount } = req.body; // Amount in paise (₹1 = 100 paise)

  // Cashfree credentials (set these as environment variables)
  const CLIENT_ID = process.env.CASHFREE_CLIENT_ID;
  const CLIENT_SECRET = process.env.CASHFREE_CLIENT_SECRET;

  // Prepare Cashfree order data
  const orderData = {
    order_amount: amount,
    order_currency: 'INR',
    customer_details: {
      customer_id: 'node_sdk_test',  // You can set a unique ID for the user
      customer_email: 'example@gmail.com',
      customer_phone: '9999999999',
    },
    order_meta: {
      return_url: 'https://your-return-url.com',  // Specify your return URL here
    },
    order_note: 'Payment for balance top-up',
  };

  try {
    // Send POST request to Cashfree API
    const response = await axios.post(
      'https://api.cashfree.com/api/v2/order/create',
      orderData,
      {
        headers: {
          'X-Client-Id': CLIENT_ID,
          'X-Client-Secret': CLIENT_SECRET,
          'Content-Type': 'application/json',
        },
      }
    );

    // Send back response from Cashfree
    res.status(200).json(response.data);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order.' });
  }
});

// Set the port for the server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
