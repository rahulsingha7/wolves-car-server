const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

//middlewire
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1wb5a.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
 
async function run() {
  try {
    await client.connect();
    const database = client.db("wolvesCar");
    const productsCollection = database.collection("products");
    const reviewsCollection = database.collection("reviews");
    const ordersCollection = database.collection("orders");
    // GET API
    app.get('/products',async(req,res)=>{
      const cursor = productsCollection.find({});
      const products = await cursor.toArray();
      res.send(products);
    })
    app.get('/reviews',async(req,res)=>{
      const cursor = reviewsCollection.find({});
      const reviews = await cursor.toArray();
      res.send(reviews);
    })
    app.get('/orders',async(req,res)=>{
      const cursor = ordersCollection.find({});
      const orders = await cursor.toArray();
      res.send(orders);
    })
    app.get('/products/:id',async(req,res)=>{
      const id= req.params.id;
      const query = {_id:ObjectId(id)};
      const product = await productsCollection.findOne(query);
      res.json(product)
    })
    app.get('/orders/:id',async(req,res)=>{
      const id= req.params.id;
      console.log('getting the order',id);
      const query = {_id:ObjectId(id)};
      const order = await ordersCollection.findOne(query);
      res.json(order);
    })
    app.get('/myOrder/:email',async(req,res)=>{
      const result = await ordersCollection.find({email: req.params.email}).toArray();
      res.send(result);
    })
    // POST API
    app.post('/products',async(req,res)=>{
      const product = req.body;
      console.log('hiting the post',product);
      const result = await productsCollection.insertOne(product);
      res.json(result);
    })
    app.post('/reviews',async(req,res)=>{
      const review = req.body;
      console.log('hiting the post',review);
      const result = await reviewsCollection.insertOne(review);
      res.json(result);
    })
    app.post('/orders',async(req,res)=>{
      const order = req.body;
      console.log('hiting the post',order);
      const result = await ordersCollection.insertOne(order);
      res.json(result);
    })
    // UPDATE API
    app.put('/products/:id',async(req,res)=>{
      const id=req.params.id;
      const updatedProduct = req.body;
      const filter = {_id: ObjectId(id)};
      const options = {upsert: true};
      const updateDoc = {
         $set: {
           name: updatedProduct.name,
           description: updatedProduct.description,
           price: updatedProduct.price,
           img: updatedProduct.img
         }
      };
      const result = await productsCollection.updateOne(filter,updateDoc,options);
      res.json(result);
    })
    // DELETE API
    app.delete('/products/:id',async(req,res)=>{
      const id = ObjectId(req.params.id);
      const query = {_id: ObjectId(id)};
      const result = await productsCollection.deleteOne(query);
      res.json(result);

    })
    app.delete('/orders/:id',async(req,res)=>{
      const id = ObjectId(req.params.id);
      const query = {_id: ObjectId(id)};
      const result = await ordersCollection.deleteOne(query);
      res.json(result);

    })
    
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);
app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`listening on port ${port}`)
})