// api/create-payment.js
const axios = require('axios');

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    const { amount } = req.body; // Amount in paise (₹1 = 100 paise)
    
    // Cashfree credentials (set these as environment variables in Vercel later)
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
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
};
