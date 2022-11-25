const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
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

const verifyJwt = (req,res,next)=>{
  const authHeader = req.headers.authorization;
  if(!authHeader){
    return res.status(401).send({message: 'unauthorized access'})
  }

  const token = authHeader.split(' ')[1]
  jwt.verify(token, process.env.ACCESS_TOKEN, function(err,decoded){
    if(err){
      return res.status(403).send({message: 'Forbidden access'})
    }
    req.decoded = decoded
  })
next()
}

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

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get('/allsellers', async(req,res)=>{
      const filter = {role: 'Seller'}
      const seller = await usersCollection.find(filter).toArray()
      res.send(seller)
    })
    app.get('/allbuyers', async(req,res)=>{
      const filter = {role: 'User'}
      const seller = await usersCollection.find(filter).toArray()
      res.send(seller)
    })

    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
       const token = jwt.sign({email}, process.env.ACCESS_TOKEN, { expiresIn: "1d" });
       return res.send({ accessToken: token });
      }
      res.status(403).send({message: 'unauthorized User'})
    });

    app.put('/seller/:id',async(req,res)=>{
        const id = req.params.id;
        const filter = {_id: ObjectID(id)}
        const options = {upsert: true}
        const updatedDoc = {
          $set: {
            verified: true
          }
        }
        const result = await CarsCollection.updateOne(filter, updatedDoc,options)
        const result2 = await usersCollection.updateOne(filter, updatedDoc,options)
        res.send({result,result2})
    })

    app.get("/category", async (req, res) => {
      const query = {};
      const cars = await Categories.find(query).toArray();
      res.send(cars);
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

    app.get("/bookings",verifyJwt, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if(email !== decodedEmail){
        return res.status(403).send({message: 'unauthorized access'})
      }
      const filter = { email: email };
      const booking = await bookingsCollection.find(filter).toArray();
      res.send(booking);
    });
  } finally {
  }
};
run().catch((e) => console.error(e));

app.listen(port, () => {
  console.log(`server is running on ${port}`);
});
