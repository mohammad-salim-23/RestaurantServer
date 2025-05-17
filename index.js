const express = require('express');
const cors = require("cors");
require("dotenv").config();
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
const allowedOrigins = [
  "https://www.royalcrowncafebd.com",
  "http://localhost:5000",
  "http://localhost:5173"
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

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
    const foodsCollection = client.db("foodsDB").collection("fods");
    const userCollection = client.db("foodsDB").collection("users"); 
      const employeeCollection = client.db("foodsDB").collection("employees");
    // User Signup/Login - Save User in Database
    app.post("/users", async (req, res) => {
      const user = req.body;
      
      // Check if user already exists
      const existingUser = await userCollection.findOne({ email: user.email });
      if (existingUser) {
        return res.status(409).send({ message: "User already exists" });
      }

      // Insert new user
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    app.get("/user/:email", async (req, res) => {
     const email = req.params.email;
     const user = await userCollection.findOne({email:email})
     if(user){
      res.send(user);
     }else{
      res.status(404).send({message: "Users not found"});
     }
    });
    // Authentication Routes
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '10h' });
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
        res.send({foods: result});
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    app.put("/food/:id", async (req, res) => {
      try {
        const id = req.params.id;
    
        // Validate ObjectId
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ error: "Invalid ID format" });
        }
    
        const filter = { _id: new ObjectId(id) };
        const updateFood = { $set: req.body };
    
        const result = await foodsCollection.updateOne(filter, updateFood);
    
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
      }
    });    app.delete("/food/:id", async (req, res) => {
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
     // Create a new employee
    app.post("/employee", async (req, res) => {
      try {
        const newEmployee = req.body;
        const result = await employeeCollection.insertOne(newEmployee);
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to create employee" });
      }
    });

    // Get all employees
    app.get("/employee", async (req, res) => {
      try {
        const result = await employeeCollection.find().toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to fetch employees" });
      }
    });

    // Get a single employee by ID
    app.get("/employee/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await employeeCollection.findOne(query);
        if (!result) {
          return res.status(404).send({ message: "Employee not found" });
        }
        res.send({ employee: result });
      } catch (error) {
        res.status(500).send({ error: "Failed to fetch employee" });
      }
    });

    // Update an employee
    app.put("/employee/:id", async (req, res) => {
      try {
        const id = req.params.id;
        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ error: "Invalid ID format" });
        }

        const filter = { _id: new ObjectId(id) };
        const update = { $set: req.body };

        const result = await employeeCollection.updateOne(filter, update);
        res.send(result);
      } catch (error) {
        res.status(500).json({ error: "Failed to update employee" });
      }
    });

    // Delete an employee
    app.delete("/employee/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await employeeCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to delete employee" });
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
