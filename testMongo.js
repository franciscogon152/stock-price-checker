const { MongoClient } = require('mongodb');
require('dotenv').config();

(async () => {
  try {
    const client = await MongoClient.connect(process.env.MONGO_URI, { useUnifiedTopology: true });
    console.log('✅ Conexión exitosa a MongoDB Atlas');
    await client.close();
  } catch (err) {
    console.error('❌ Error de conexión:', err.message);
  }
})();
