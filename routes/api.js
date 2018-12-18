/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

var expect = require('chai').expect;
var MongoClient = require('mongodb').MongoClient;
var request = require('request');

module.exports = function(app) {

  app.route('/api/stock-prices').get(function(req, res) {
    if (req.query.stock === undefined) {
      return res.json({ error: 'stock is required' });
    }
    
    let stock = req.query.stock;
    let like = (req.query.like !== undefined && req.query.like === 'true' ? true : false);
    
    if (Array.isArray(stock)) {
      if (stock.length > 2) {
        return res.json({ error: 'only 1 or 2 stock is supported' });
      }
    } else {
      stock = [stock];
    }
    
    MongoClient.connect(process.env.DATABASE, { useNewUrlParser: true }, function(err, db) {
      if (err) {
        // console.log('Database error: ' + err);
        return res.json({ error: 'error' });
      } else {
        stock[0] = stock[0].toUpperCase();
        
        let updateObj = {
          $setOnInsert: {
            stock: stock[0]
            // likes: req['ip'] || []
          }
        };
        
        if (like) {
          updateObj['$addToSet'] = {
            likes: req['ip']
          };
        }
        
        db.db().collection('stock').findOneAndUpdate(
          {
            stock: stock[0]
          },
          updateObj,
          { upsert: true, returnOriginal: false }, // Insert object if not found, Return updated object after modify
          function(error, result) {
            let likes = (result.value.likes !== undefined ? result.value.likes.length : 0);
            
            request('https://api.iextrading.com/1.0/stock/'+stock[0]+'/price', function(error, response, body) {
              if (stock[1] === undefined) {
                return res.json({ stockData: { stock: stock[0], price: body, likes: likes } });
              } else {
                let stock_result = [];
                stock_result.push({ stock: stock[0], price: body, rel_likes: likes });

                stock[1] = stock[1].toUpperCase();
                
                updateObj = {
                  $setOnInsert: {
                    stock: stock[1]
                    // likes: req['ip'] || []
                  }
                };

                if (like) {
                  updateObj['$addToSet'] = {
                    likes: req['ip']
                  };
                }

                db.db().collection('stock').findOneAndUpdate(
                  {
                    stock: stock[1]
                  },
                  updateObj,
                  { upsert: true, returnOriginal: false }, // Insert object if not found, Return updated object after modify
                  function(error, result2) {
                    likes = (result2.value.likes !== undefined ? result2.value.likes.length : 0);

                    request('https://api.iextrading.com/1.0/stock/'+stock[1]+'/price', function(error, response, body2) {
                      stock_result.push({ stock: stock[1], price: body2, rel_likes: likes });
                      
                      let rel_likes1 = stock_result[0]['rel_likes'] - stock_result[1]['rel_likes'];
                      let rel_likes2 = stock_result[1]['rel_likes'] - stock_result[0]['rel_likes'];
                      
                      stock_result[0]['rel_likes'] = rel_likes1;
                      stock_result[1]['rel_likes'] = rel_likes2;

                      return res.json({ stockData: stock_result });
                    });
                  }
                );
              }
            });
          }
        );
      }
    });
  });
  
};
