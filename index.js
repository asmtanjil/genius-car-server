const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken')
const app = express();
const port = process.env.PORT || 5000;

//middle Wares
app.use(cors())
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.aes3u62.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'Unauthorized Access' })
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (error, decoded) {
    if (error) {
      return res.status(403).send({ message: 'Unauthorized Access' })
    }
    req.decoded = decoded;
    next();
  })
}

async function run() {
  try {

    const carCollection = client.db('geniusCar').collection('services');
    const productCollection = client.db('geniusCar').collection('products');
    const orderCollection = client.db('geniusCar').collection('orders');

    //JWT
    app.post('/jwt', (req, res) => {
      const user = req.body;
      console.log(user)
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ token })
    })

    // load data from server -- Services
    app.get('/services', async (req, res) => {
      // const query = { price: { $gt: 50, $lt: 200 } };
      // const query = { price: { $gte: 100 } };
      // const query = { price: { $lte: 150 } };
      const query = { price: { $ne: 150 } };
      const order = req.query.order === 'asc' ? 1 : -1;
      const cursor = carCollection.find(query).sort({ price: order });
      const services = await cursor.toArray();
      res.send(services)
    })

    // load Single data from server -- Services
    app.get('/services/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) }
      const service = await carCollection.findOne(query);
      res.send(service)
    })

    // load data from server -- Products
    app.get('/products', async (req, res) => {
      const query = {};
      const cursor = productCollection.find(query);
      const products = await cursor.toArray();
      res.send(products)
    })

    //Catch Orders data from UI and send to database
    app.post('/orders', async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order)
      res.send(result)
    })

    //get Orders from db and send to client
    app.get('/orders', verifyJWT, async (req, res) => {
      const decoded = req.decoded;

      if (decoded.email !== req.query.email) {
        res.status(403).send({ message: 'unauthorized access' })
      }

      let query = {}

      if (req.query.email) {
        query = {
          email: req.query.email
        }
      }
      const cursor = orderCollection.find(query)
      const orders = await cursor.toArray()
      res.send(orders)
    })

    //Delete Data From Orders
    app.delete('/orders/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) }
      const result = await orderCollection.deleteOne(query);
      res.send(result)
    })

    //Update Order Approval Status
    app.patch('/orders/:id', async (req, res) => {
      const id = req.params.id;
      const status = req.body.status
      const query = { _id: ObjectId(id) }
      const updatedDoc = {
        $set: {
          status: status
        }
      }
      const result = await orderCollection.updateOne(query, updatedDoc)
      res.send(result);
    })
  }
  finally {

  }
}

run().catch(err => console.error(err))

app.get('/', (req, res) => {
  res.send('Hello From Genius Car')
})

app.listen(port, () => {
  console.log(`Genius Car Server Running on port: ${port}`)
})