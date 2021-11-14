const express = require('express')
const app = express()
const cors = require('cors');
//jwt token verify
const admin = require("firebase-admin");
//dotenv require
require('dotenv').config();
const { MongoClient } = require('mongodb');

const port = process.env.PORT || 5000

//jwt token

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

//middleware
app.use(cors());
app.use(express.json())



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.bm6uk.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

// console.log(uri)
//jwt token verify on server
async function verifyToken(req, res, next){
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
        console.log('Database connected successfully');
      const database = client.db('niche_product');
      const productsCollection = database.collection('products');
      //users 
      const usersCollection = database.collection('users');
       //order collection
       const orderCollection = database.collection('orders');


      //load appointments from api based on user 
      app.get('/products',verifyToken, async(req, res) => {
        const email = req.query.email;
        //server time changed other country server site
   const query = { email: email}
        // console.log(query)

        const cursor = productsCollection.find(query);
      
        const products = await cursor.toArray();
        res.json(products);
      })

      app.post('/products', async(req, res) =>{
        const product = req.body;
        const result = await productsCollection.insertOne(product);
        console.log(result);
       res.json(result);
      })
//[one admin added with other email person easy]
      app.get('/users/:email', async(req, res) => {
        const email = req.params.email;
        const query = { email: email };
        const user = await usersCollection.findOne(query);
        let isAdmin = false;
        if(user?.role === 'admin'){
         isAdmin= true;
        }
        res.json({ admin: isAdmin });
      })

 
      //user to the database
      app.post('/users',async(req, res) => {
        const user = req.body;
        const result = await usersCollection.insertOne(user);
        console.log(result);
        res.json(result);

      });
     
       //backend data update 
       app.put('/users', async(req, res) => {
         const user = req.body;
    
         const filter = {email: user.email}
          
         const options = { upsert: true };
            // create a document that sets update
         const updateDoc = {$set: user};
        const result = await usersCollection.updateOne(filter, updateDoc, options);
        console.log(result);
        res.json(result);
      
       });

       //[make admin page]
       app.put('/users/admin', verifyToken, async(req, res) => {
         const user= req.body;
        //  console.log('decodedEmail', req.decodedEmail);
         const requester = req.decodedEmail;
         if(requester){
           const requesterAccount = await usersCollection.findOne({email:
          requester});
          if(requesterAccount.role === 'admin'){
            const filter = { email: user.email };
            const updateDoc = {$set: {role: 'admin'}};
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.json(result);
          }
         }
         
       
        else{
          res.status(403).json({message: 'you do not have access to make admin '}
          )
        }
       })


   
   
   
    } 
    finally {
      //await client.close();
    }
  }
  run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello Niche Product!')
})

app.listen(port, () => {
  console.log(`listening at ${port}`)
})