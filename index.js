const express = require('express');
const cors = require('cors');
const admin = require("firebase-admin");
const app = express();
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
const stripe = require('stripe')(process.env.STRIPE_SECRET)

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

//middlewire
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1wb5a.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
 
async function verifyToken(req,res,next){
  if(req.headers?.authorization?.startsWith('Bearer ')){
    const token = req.headers.authorization.split(' ')[1];
    try{
         const decodedUser = await admin.auth().verifyIdToken(token);
         req.decodedEmail = decodedUser.email;
    }
    catch{

    }
  }
  next();
}


async function run() {
  try {
    await client.connect();
    const database = client.db("wolvesCar");
    const productsCollection = database.collection("products");
    const reviewsCollection = database.collection("reviews");
    const ordersCollection = database.collection("orders");
    const usersCollection = database.collection("users");
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
    app.get('/users/:email',async(req,res)=>{
      const email = req.params.email;
      const query = {email:email};
      const user = await usersCollection.findOne(query);
      let isAdmin = false
      if(user?.role === 'admin'){
           isAdmin = true;
      }
      res.json({admin: isAdmin});
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
    app.post('/users',async(req,res)=>{
      const user = req.body;
      const result = await usersCollection.insertOne(user);
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
    app.put('/users',async(req,res)=>{
      const user = req.body;
      const filter = {email: user.email};
      const options = {upsert:true};
      const updateDoc ={$set: user};
      const result =await usersCollection.updateOne(filter,updateDoc,options);
      res.json(result);
    })
    app.put('/users/admin',verifyToken, async(req,res)=>{
      const user = req.body;
      const requester = req.decodedEmail;
      if(requester){
        const requesterAccount =await usersCollection.findOne({email: requester})
        if(requesterAccount.role==='admin'){
          const filter = {email: user.email};
          const updateDoc  = {$set: {role: 'admin'}};
          const result = await usersCollection.updateOne(filter,updateDoc);
          res.json(result);
        }
      }
      else{
        res.status(403).json({message: 'you do not have access to make admin'});
      }
     
     
    })
    // Update Status
    app.put('/orders/:id',(req,res)=>{
      const id = ObjectId(req.params.id);
      const data = req.body;
      ordersCollection.findOneAndUpdate({_id:id},{$set:{status:data.status}})
      .then(result=>{
        res.send(result);
      })
    })
    app.put('/myOrder/:id',async(req,res)=>{
      const id = req.params.id;
      const payment = req.body;
      const filter = {_id: ObjectId(id)};
      const updateDoc ={
        $set: {
          payment : payment
        }
      };
      const result = await ordersCollection.updateOne(filter,updateDoc);
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
    app.post('/create-payment-intent',async(req,res)=>{
        const paymentInfo = req.body;
        const amount = paymentInfo.price*100;
        const paymentIntent = await stripe.paymentIntents.create({
          currency: 'usd',
          amount: amount,
          payment_method_types: ['card']
        })
        res.json({clientSecret:paymentIntent.client_secret})
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