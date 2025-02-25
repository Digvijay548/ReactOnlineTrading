const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');
const crypto = require('crypto');
const { Cashfree } = require('cashfree-pg');
const { Client, Account, Query, Databases, ID } = require('node-appwrite');
const { error } = require('console');



dotenv.config(); // Load environment variables from .env file

const app = express();
const corsOptions = {
  origin: "*", // Allow all origins (Change this to your frontend URL for security)
  methods: "GET,POST,PUT,DELETE,OPTIONS",
  allowedHeaders: "Content-Type, Authorization",
  credentials: true
};
app.use(cors(corsOptions));

//app.use((req, res, next) => {
// res.setHeader("Access-Control-Allow-Origin", "*");  // Allow all origins (or specify domain)
// res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
// res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
// next();
//});

app.use(express.json()); // For parsing application/json

// Cashfree credentials (set these as environment variables)

Cashfree.XEnvironment = Cashfree.Environment.PRODUCTION;
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

app.post('/api/start-trade', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Missing email" });
  }

  try {
    console.log("🔍 Checking last trade date for:", email);

    // ✅ Query to check if user exists
    const userRecords = await database.listDocuments(DB_ID, COLLECTION_ID, [
      Query.equal("email", [email])
    ]);

    if (userRecords.documents.length > 0) {
      const user = userRecords.documents[0];
      const userId = user.$id;
      const currentBalance = parseFloat(user.Balance) || 0;
      const lastTradeTime = user.last_trade_time ? new Date(user.last_trade_time) : null;
      const currentDate = new Date().toISOString().split("T")[0]; // Get YYYY-MM-DD format

      if (lastTradeTime) {
        const lastTradeDate = lastTradeTime.toISOString().split("T")[0]; // Extract date

        if (lastTradeDate === currentDate) {
          console.log(`❌ Trade blocked: ${email} already traded today (${lastTradeDate})`);
          return res.status(403).json({
            error: "Trade allowed only once per day",
            last_trade_time: lastTradeTime.toISOString()
          });
        }
      }

      // ✅ Increase balance by 4% and update trade date
      const increasedBalance = currentBalance * 1.04;

      await database.updateDocument(DB_ID, COLLECTION_ID, userId, {
        Balance: increasedBalance.toFixed(2).toString(), // Convert to string with 2 decimals
        last_trade_time: new Date().toISOString() // Update last trade time
      });

      console.log(`✅ Trade successful for ${email}: New Balance ₹${increasedBalance}`);
      return res.json({
        message: "Trade started successfully, balance updated by 4%",
        balance: increasedBalance
      });
    } else {
      console.error(`❌ User not found: ${email}`);
      return res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    console.error("❌ Error starting trade:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ Create or Update Add-Account in Appwrite Database
app.post('/api/Add-Account', async (req, res) => {
  const { email, accountnumber, accountholdername, ifsccode } = req.body;
  if (!email || !accountnumber || !accountholdername || !ifsccode) {
    return res.status(400).json({ error: "Missing email or accountnumber" });
  }
  try {

    //#region for update balance and refer
    console.log("🔍 Checking balance for email:", email);

    // ✅ Query to check if email exists
    const userRecords = await database.listDocuments(DB_ID, COLLECTION_ID, [
      Query.equal("email", [email])  // ✅ Using Query.equal() correctly
    ]);

    if (userRecords.documents.length > 0) {
      // ✅ If user exists, update the balance
      const user = userRecords.documents[0];
      const userId = user.$id;
      const Accountnumber = accountnumber;
      const Accountholdername = accountholdername;
      const Ifsccode = ifsccode;
      await database.updateDocument(DB_ID, COLLECTION_ID, userId, {
        accountnumber: Accountnumber.toString() // Convert back to string if needed
      });  //update account
      await database.updateDocument(DB_ID, COLLECTION_ID, userId, {
        accountholdername: Accountholdername.toString() // Convert back to string if needed
      });  //update accountholdername
      await database.updateDocument(DB_ID, COLLECTION_ID, userId, {
        ifsccode: Ifsccode.toString() // Convert back to string if needed
      });  //update accountholdername

      console.log(`✅ Updated Account Details  ${email} : ${Accountholdername}: ${Accountnumber} : ${Ifsccode}`);
    }

  } catch (error) {
    console.error("❌ Error updating balance:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }

});

// ✅ Create or Update Balance in Appwrite Database
app.post('/api/update-balance', async (req, res) => {
  const { email, amount } = req.body;

  if (!email || amount === undefined) {
    return res.status(400).json({ error: "Missing email or amount" });
  }

  try {
    //#region for update balance and refer
    console.log("🔍 Checking balance for email:", email);

    // ✅ Query to check if email exists
    const userRecords = await database.listDocuments(DB_ID, COLLECTION_ID, [
      Query.equal("email", [email])  // ✅ Using Query.equal() correctly
    ]);

    if (userRecords.documents.length > 0) {
      // ✅ If user exists, update the balance
      const user = userRecords.documents[0];
      const userId = user.$id;
      const currentBalance = parseFloat(user.Balance) || 0; // Ensure numeric conversion
      const NumberOfTimeBalance = parseFloat(user.NumberOfTimeBalance) || 0; // Ensure numeric conversion
      const newBalance = currentBalance + parseFloat(amount);
      const referralCode = user.referralCode; //which is email
      const newNumberOfTimeBalance = NumberOfTimeBalance + parseFloat('1');
      await database.updateDocument(DB_ID, COLLECTION_ID, userId, {
        Balance: newBalance.toString() // Convert back to string if needed
      });  //update balance
      await database.updateDocument(DB_ID, COLLECTION_ID, userId, {
        NumberOfTimeBalance: newNumberOfTimeBalance.toString() // Convert back to string if needed        
      }); //update no of time balance
      //#endregion


      //#region for referal
      if (user.NumberOfTimeBalance == '0' && referralCode != null) {
        const ReferalUser = await database.listDocuments(DB_ID, COLLECTION_ID, [
          Query.equal("email", [referralCode])  // ✅ Using Query.equal() correctly
        ]);
        if (ReferalUser.documents.length > 0) {
          // ✅ If user exists, update the balance
          const user = ReferalUser.documents[0];
          const userId = user.$id;
          const currentBalance = parseFloat(user.Balance) || 0;
          const newBalance = currentBalance + parseFloat("150");
          await database.updateDocument(DB_ID, COLLECTION_ID, userId, {
            Balance: newBalance.toString() // Convert back to string if needed
          });
          console.log(`✅ Updated balance for Refered People ${email}: ₹${newBalance}`);
        }
      }
      //#endregion

      console.log(`✅ Updated balance for ${email}: ₹${newBalance}`);
      console.log(`✅ Updated NumberOfTimeBalance for ${email}: ₹${newNumberOfTimeBalance}`);
      return res.json({ message: "Balance updated successfully", balance: newBalance });
    }
    else {
      // ✅ If user does not exist, create a new entry
      const newUser = await database.createDocument(DB_ID, COLLECTION_ID, ID.unique(), {
        email,
        Balance: parseFloat(amount).toString(), // Store as string if needed
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

    console.log(userRecords);

    if (userRecords.documents.length > 0) {
      // ✅ Email found, return balance
      const user = userRecords.documents[0];

      // ✅ Convert balance from string to number (Default to 0 if missing)
      const balance = user.Balance ? parseFloat(user.Balance) : 0;
      const lastTradeTime = user.last_trade_time || "Not Available";

      console.log(`✅ Balance for ${email}: ₹${balance}`);
      return res.json({ balance, last_trade_time: lastTradeTime });
    } else {
      // ❌ Email not found
      console.error(`❌ User not found: ${email}`);
      return res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    console.error("❌ Error fetching balance:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ Get Account Details from  Appwrite Database
app.get('/api/get-AccountDetails', async (req, res) => {
  const { email } = req.query; // Get email from query params

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    console.log("🔍 Fetching Account Details for email:", email);

    // ✅ Query Appwrite to check if email exists
    const userRecords = await database.listDocuments(DB_ID, COLLECTION_ID, [
      Query.equal("email", [email])
    ]);

    console.log(userRecords);

    if (userRecords.documents.length > 0) {
      // ✅ Email found, return AccountDetails
      const user = userRecords.documents[0];

      // ✅ Convert balance from string to number (Default to 0 if missing)
      const Accountnumber = user.accountnumber || "Not Available";
      const Accountholdername = user.accountholdername || "Not Available";
      const Ifsccode = user.ifsccode || "Not Available";
      const Balance = user.Balance ? parseFloat(user.Balance) : 0;
      const LastTradeTime = user.last_trade_time || "Not Available";

      console.log(`✅ Details for ${email}: Account No :${Accountnumber}, User Name : ${Accountholdername}, IFSC Code : ${Ifsccode}`);
      return res.json({ accountnumber: Accountnumber, accountholdername: Accountholdername, ifsccode: Ifsccode, balance: Balance, last_trade_time: LastTradeTime });
    } else {
      // ❌ Email not found
      console.error(`❌ User not found: ${email}`);
      return res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    console.error("❌ Error fetching Account Details:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// required email and amount
app.post('/api/getWithdrawal', async (req, res) => {
  try {
    const { email, amount } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: "Valid withdrawal amount is required" });
    }

    console.log("🔍 Fetching Account Details in get-Withdrawal for email:", email);
    console.log("🔍 Fetching Account Details in get-Withdrawal for amount:", amount);

    try {
      console.log("✅ Query Appwrite to check if email exists:");
      // ✅ Query Appwrite to check if email exists
    var userRecords = await database.listDocuments(DB_ID, COLLECTION_ID, [
      Query.equal("email", [email])
    ]);
    } catch (error) {
      console.log("❌ Query Appwrite error ");
    }
    
    console.log("🔍 Fetching Account Details in get-Withdrawal for userRecords:", userRecords);

    if (userRecords.documents.length === 0) {
      console.error(`❌ User not found: ${email}`);
      return res.status(404).json({ error: "User not found" });
    }


    console.log("✅ userRecords found :");
    const user = userRecords.documents[0];
    const userId = user.$id;
    console.log("✅ Extract user details with proper default values start");
    // Extract user details with proper default values
    const accountNumber = user.accountnumber || "Not Available";
    console.log("✅ Extract user details with proper default values accountNumber:", accountNumber);
    const accountHolderName = user.accountholdername || "Not Available";
    console.log("✅ Extract user details with proper default values accountHolderName:", accountHolderName);
    const ifscCode = user.ifsccode || "Not Available";
    console.log("✅ Extract user details with proper default values ifsccode:", ifsccode);
    const balance = user.Balance ? parseFloat(user.Balance) : 0;

    // ✅ Fix for empty `Withdrawal_Amount` and `Withdrawal_Count`
    const withdrawalAmount = user.Withdrawal_Amount && !isNaN(user.Withdrawal_Amount) ? parseFloat(user.Withdrawal_Amount) : 0;
    const withdrawalCount = user.Withdrawal_Count && !isNaN(user.Withdrawal_Count) ? parseInt(user.Withdrawal_Count) : 0;
    console.log("✅ Condition for the  check withdrawalAmount:",typeof(user.Withdrawal_Amount).toString());
    console.log("✅ Condition for the  check withdrawalAmount:",typeof(user.Withdrawal_Count).toString());

    // ✅ Condition checks
    if (accountNumber === "Not Available" || accountHolderName === "Not Available" || ifscCode === "Not Available") {
      return res.status(400).json({ error: "Bank account details are missing. Please update your account." });
    }

    if (balance < 1000) {
      return res.status(400).json({ error: "Minimum balance of ₹1000 is required", balance });
    }

    if (withdrawalAmount !== 0 || withdrawalCount !== 0) {
      return res.status(400).json({
        error: "Your previous withdrawal request is still being processed. Please wait.",
        withdrawal_balance: withdrawalAmount
      });
    }

    // ✅ Calculate final balance after withdrawal
    const finalBalance = balance - parseFloat(amount);

    // ✅ Batch update using `Promise.all()` to optimize performance
    await Promise.all([
      database.updateDocument(DB_ID, COLLECTION_ID, userId, { Balance: finalBalance.toString() }),
      database.updateDocument(DB_ID, COLLECTION_ID, userId, { Withdrawal_Amount: amount.toString() }),
      database.updateDocument(DB_ID, COLLECTION_ID, userId, { Withdrawal_Count: "1" })
    ]);

    console.log(`✅ Withdrawal successful for ${email}: Account No: ${accountNumber}, Name: ${accountHolderName}, IFSC: ${ifscCode}, Withdrawal: ₹${amount}, Final Balance: ₹${finalBalance}`);

    return res.json({
      message: "Withdrawal request submitted successfully",
      accountnumber: accountNumber,
      accountholdername: accountHolderName,
      ifsccode: ifscCode,
      finalbalance: finalBalance,
      withdrawal_amount: amount
    });

  } catch (error) {
    console.error("❌ Error processing withdrawal:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});


// Health check route to verify server is running
app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'Server is up and running! 21-02-2025 15-42' });
});

// Register route to create a new user with Appwrite
app.post('/api/register', async (req, res) => {
  const { email, password, referralCode } = req.body;
  console.log(email)
  console.log(password)
  const finalReferralCode = referralCode || "Not Applied";
  try {
    // Register the user using Appwrite's createEmailAccount method
    const user = await account.create('unique()', email, password);
    // ✅ Create an entry in the balance table
    await database.createDocument(DB_ID, COLLECTION_ID, ID.unique(), {
      email: email,
      Balance: "0",  // Initialize balance as 0
      last_trade_time: null, // Set last_trade_time as null
      referralCode: finalReferralCode, //emailid of refered person
      NumberOfTimeBalance: '0'
    });

    await

      console.log(`✅ Registration successful ${email}: Referal Code ${finalReferralCode}`);


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
function GeterateId() {
  console.log(Cashfree.XClientId.toString())
  const UniqId = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256');
  hash.update(UniqId);

  const orderid = hash.digest('hex');
  return orderid.substring(0, 12);
}

// API route to handle payment creation using Cashfree
app.get('/api/create-payment', async (req, res) => {
  const { amount, email } = req.query; // Amount in paise (₹1 = 100 paise)
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
  Cashfree.PGCreateOrder("2023-08-01", request).then(response => {
    console.error(response.data);
    res.json(response.data);
  }).catch(error => {
    console.error(error.response.data.message);
  })


});

app.post('/api/Verify_Payment', async (req, res) => {
  try {
    let { orderId } = req.body;
    console.error(" orderid = ", orderId)
    console.log(" orderid send to server = ", orderId)
    Cashfree.PGOrderFetchPayments("2023-08-01", orderId).then((response) => {
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
