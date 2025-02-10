const express = require('express');
const cors = require("cors");
require("dotenv").config();
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    "https://assignment-11-client-1d064.web.app",
    "https://assignment-11-client-1d064.firebaseapp.com"
  ],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: 'Unauthorized access' });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'Unauthorized access' });
    }
    req.user = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ipsrkdy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    const foodsCollection = client.db("foodsDB").collection("foods");

    // Authentication Routes
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.cookie('token', token, cookieOptions).send({ success: true });
    });

    app.post('/logout', async (req, res) => {
      res.clearCookie('token', { maxAge: 0 }).send({ success: true });
    });

    // CRUD Operations for Foods Collection
    app.post("/food", async (req, res) => {
      const newFood = req.body;
      const result = await foodsCollection.insertOne(newFood);
      res.send(result);
    });

    app.get("/food", async (req, res) => {
      const result = await foodsCollection.find().toArray();
      res.send(result);
    });

    app.get("/food/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await foodsCollection.findOne(query);
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    app.put("/food/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateFood = {
        $set: req.body
      };
      const result = await foodsCollection.updateOne(filter, updateFood);
      res.send(result);
    });

    app.delete("/food/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await foodsCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    console.log("Connected to MongoDB!");
  } finally {
    // Keep the connection open
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello Boss!');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
