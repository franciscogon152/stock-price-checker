'use strict';

const mongoose = require('mongoose');
const fetch = require('node-fetch');

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const stockSchema = new mongoose.Schema({
  stock: String,
  likes: [String] // IPs que dieron like
});

const Stock = mongoose.model('Stock', stockSchema);

module.exports = function (app) {
  app.get('/api/stock-prices', async (req, res) => {
    const { stock, like } = req.query;
    const ip = req.ip;

    const stocks = Array.isArray(stock) ? stock : [stock];

    try {
      const stockData = await Promise.all(
        stocks.map(async (symbol) => {
          const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${process.env.STOCK_API_TOKEN}`;
          const response = await fetch(url);
          const data = await response.json();

          const price = parseFloat(data['Global Quote']?.['05. price'] || 0);

          let existing = await Stock.findOne({ stock: symbol.toUpperCase() });

          if (!existing) {
            existing = new Stock({ stock: symbol.toUpperCase(), likes: [] });
          }

          if (like === 'true' && !existing.likes.includes(ip)) {
            existing.likes.push(ip);
            await existing.save();
          }

          const likes = existing.likes.length;

          return { stock: symbol.toUpperCase(), price, likes };
        })
      );

      if (stockData.length === 1) {
        res.json({ stockData: stockData[0] });
      } else {
        const [s1, s2] = stockData;
        res.json({
          stockData: [
            {
              stock: s1.stock,
              price: s1.price,
              rel_likes: s1.likes - s2.likes
            },
            {
              stock: s2.stock,
              price: s2.price,
              rel_likes: s2.likes - s1.likes
            }
          ]
        });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error fetching stock data' });
    }
  });
};
