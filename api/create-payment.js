// server.js
const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables from a .env file
dotenv.config();

const app = express();
app.use(express.json()); // For parsing application/json

// API route to handle payment creation
app.post('/api/create-payment', async (req, res) => {
  const { amount } = req.body; // Amount in paise (₹1 = 100 paise)

  // Cashfree credentials (set these as environment variables)
  const CLIENT_ID = process.env.CLIENT_ID;
  const CLIENT_SECRET = process.env.CLIENT_SECRET;

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
