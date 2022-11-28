const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const { ObjectID } = require("bson");
const stripe = require("stripe")(process.env.STRIPE_KEY);

const port = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("server is running");
});

const verifyJwt = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
  });
  next();
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.8d3cohe.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
const run = async () => {
  try {
    const Categories = client.db("carDealer").collection("categories");
    const CarsCollection = client.db("carDealer").collection("cars");
    const usersCollection = client.db("carDealer").collection("users");
    const bookingsCollection = client.db("carDealer").collection("bookings");
    const paymentCollection = client.db("carDealer").collection("payments");
    const reportCollection = client.db("carDealer").collection("reports");

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get("/user/admin/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const user = await usersCollection.findOne(filter);
      res.send({ isAdmin: user?.role === "admin" });
    });
    app.get("/user/seller/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const user = await usersCollection.findOne(filter);
      res.send({ isSeller: user?.role === "Seller" });
    });
    app.get("/user/buyer/:email", verifyJwt, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const email = req.params.email;

      if (email !== decodedEmail) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const filter = { email: email };
      const user = await usersCollection.findOne(filter);
      res.send({ isBuyer: user?.role === "User" });
    });

    app.get("/allsellers", async (req, res) => {
      const filter = { role: "Seller" };
      const seller = await usersCollection.find(filter).toArray();
      res.send(seller);
    });
    app.get("/allbuyers", async (req, res) => {
      const filter = { role: "User" };
      const seller = await usersCollection.find(filter).toArray();
      res.send(seller);
    });

    app.post("/payment", async (req, res) => {
      const payment = req.body;
      const id = payment.bookingId;
      const id2 = payment.productId;
      const filter = { _id: ObjectID(id) };
      const query = { _id: ObjectID(id2) };
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };
      const updatedDoc2 = {
        $set: {
          sold: true,
          transactionId: payment.transactionId,
        },
      };
      const result = await paymentCollection.insertOne(payment);
      await bookingsCollection.updateOne(filter, updatedDoc);
      await CarsCollection.updateOne(query, updatedDoc2);
      res.send(result);
    });

    app.post("/reporteditems", async (req, res) => {
      const report = req.body;
      const result = await reportCollection.insertOne(report)
      res.send(result)
    });

    app.get('/reporteditems',async(req,res)=>{
      const query = {}
      
      const report = await reportCollection.find(query).toArray()
      res.send(report)
    })


    app.delete('/reporteditems/:id',async(req,res)=>{
      const id = req.params.id;
      const query = {_id: ObjectID(id)}
      const result = await reportCollection.deleteOne(query)
      res.send(result)
    })

    app.post("/create-payment-intent", async (req, res) => {
      const booking = req.body;
      const price = booking.price;
      const amount = price * 100;

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.get("/myproducts", async (req, res) => {
      const email = req.query.email;
      const filter = { email: email };
      const products = await CarsCollection.find(filter).toArray();
      res.send(products);
    });

    app.get("/myproducts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectID(id) };
      const product = await CarsCollection.findOne(query);
      res.send(product);
    });

    app.delete("/myproducts/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectID(id) };
      const result = await CarsCollection.deleteOne(filter);
      res.send(result);
    });

    app.post("/cars", async (req, res) => {
      const carInfo = req.body;
      carInfo.date = new Date();
      const result = await CarsCollection.insertOne(carInfo);
      res.send(result);
    });

    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "1d",
        });
        return res.send({ accessToken: token });
      }
      res.status(403).send({ message: "unauthorized User" });
    });

    app.put("/seller/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectID(id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          verified: true,
        },
      };
      const result = await usersCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectID(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/category", async (req, res) => {
      const query = {};
      const cars = await Categories.find(query).toArray();
      res.send(cars);
    });

    app.post("/category", async (req, res) => {
      const category = req.body;
      const query = { brand: category.brand };
      const all = await Categories.findOne(query);

      if (category.brand === all?.brand) {
        return res.send({ message: "already added" });
      }
      const result = await Categories.insertOne(category);
      res.send(result);
    });

    app.get("/category/:brand", async (req, res) => {
      const brand = req.params.brand;
      const filter = { brand: brand };
      const results = await CarsCollection.find(filter).toArray();
      res.send(results);
    });

    app.post("/booking", async (req, res) => {
      const booking = req.body;
      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    });

    app.get("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectID(id) };
      const booking = await bookingsCollection.findOne(query);
      res.send(booking);
    });

    app.get("/bookings", verifyJwt, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "unauthorized access" });
      }
      const filter = { email: email };
      const booking = await bookingsCollection.find(filter).toArray();
      res.send(booking);
    });

    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectID(id) };
      const result = await bookingsCollection.deleteOne(filter);
      res.send(result);
    });
  } finally {
  }
};
run().catch((e) => console.error(e));

app.listen(port, () => {
  console.log(`server is running on ${port}`);
});
