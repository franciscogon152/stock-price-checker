'use strict';

require('dotenv').config();
const expect = require('chai').expect;
const MongoClient = require('mongodb').MongoClient;
const fetch = require('node-fetch');
const crypto = require('crypto');

function anonymizeIP(ip) {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

module.exports = function (app) {
  app.route('/api/stock-prices')
    .get(async function (req, res) {
      const { stock, like } = req.query;
      if (!stock) return res.json({ error: 'stock is required' });

      const stocks = Array.isArray(stock) ? stock.slice(0, 2).map(s => s.toUpperCase()) : [stock.toUpperCase()];
      const userIP = anonymizeIP(req.ip);
      const likeFlag = like === 'true';

      let client;
      console.log('Query recibida:', req.query);
      console.log('Token:', process.env.STOCK_API_TOKEN);

      try {
        client = await MongoClient.connect(process.env.MONGO_URI, { useUnifiedTopology: true });
        const db = client.db().collection('stock');

        const stockData = await Promise.all(stocks.map(async (symbol) => {
          const existing = await db.findOne({ stock: symbol });
          const alreadyLiked = existing?.likes?.includes(userIP);

          const update = {
            $setOnInsert: { stock: symbol },
            ...(likeFlag && !alreadyLiked && { $addToSet: { likes: userIP } })
          };

          const result = await db.findOneAndUpdate(
            { stock: symbol },
            update,
            { upsert: true, returnDocument: 'after' }
          );

          const likes = Array.isArray(result.value.likes) ? result.value.likes.length : 0;

          const response = await fetch(`https://www.alphavantage.co/query?function=global_quote&symbol=${symbol}&apikey=${process.env.STOCK_API_TOKEN}`);
          const data = await response.json();
          console.log('Respuesta de Alpha Vantage:', data);
          const price = parseFloat(data['Global Quote']?.['05. price'] || 0);

          return { stock: symbol, price, likes };
        }));

        if (stockData.length === 1) {
          res.json({ stockData: stockData[0] });
        } else {
          const [s1, s2] = stockData;
          res.json({
            stockData: [
              { stock: s1.stock, price: s1.price, rel_likes: s1.likes - s2.likes },
              { stock: s2.stock, price: s2.price, rel_likes: s2.likes - s1.likes }
            ]
          });
        }

      } catch (err) {
        console.error('Database or fetch error:', err);
        res.json({ error: 'internal error' });
      } finally {
        if (client) client.close();
      }
    });
};
