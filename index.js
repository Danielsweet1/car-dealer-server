const express = require('express')
const cors= require('cors')
require('dotenv').config()
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 5000
const app = express()

app.use(cors())
app.use(express.json())

app.get('/',(req,res)=>{
    res.send('server is running')
})

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.8d3cohe.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
const run = async () =>{
try{
const carsCollection = client.db('carDealer').collection('cars')
app.get('/cars',async(req,res)=>{
    const query = {}
    const cars = await carsCollection.find(query).toArray()
    res.send(cars)
})
}
finally{

}
}
run().catch(e=>console.error(e))




app.listen(port, ()=>{
    console.log(`server is running on ${port}`)
})