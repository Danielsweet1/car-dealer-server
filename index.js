const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const { ObjectID } = require("bson");
const port = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("server is running");
});

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


    app.post('/users',async(req, res)=>{
        const user = req.body
        const result = await usersCollection.insertOne(user)
        res.send(result)
    })
    app.get("/category", async (req, res) => {
      const query = {};
      const cars = await Categories.find(query).toArray();
      res.send(cars);
    });

    app.get('/category/:brand',async (req,res)=>{
        const brand = req.params.brand;
        const filter= {brand: brand}
        const results = await CarsCollection.find(filter).toArray()
        res.send(results)
    })

    app.post('/booking',async(req,res)=>{
      const booking = req.body
      const result = await bookingsCollection.insertOne(booking)
      res.send(result)
    })

  } finally {
  }
};
run().catch((e) => console.error(e));

app.listen(port, () => {
  console.log(`server is running on ${port}`);
});
