require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require('body-parser');
const url = require('url');
const dns = require('dns');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', (req, res) => {
  res.json({ greeting: 'hello API' });
});

// DB urlSchema
const urlSchema = new Schema({
  original_url: { type: String, required: true },
  short_url: { type: Number, required: true },
});

// DB Url model
const Url = mongoose.model("Url", urlSchema);

// DB generate a new short url for a new url
const newShortUrl = (done) => {
  Url.findOne()
  .sort('-short_url')
  .select('short_url')
  .exec((err, data) => {
    if (err) return console.log(err)
    if (data) {
      done(null, data['short_url'] + 1)
    } else {
      done(null, 1)
    }
    
  })
}

// DB shorten and save a new URL
const shortenAndSaveUrl = (original_url, done) => {
  newShortUrl((err, short_url) => {
    let url = new Url({original_url: original_url, short_url: short_url})
    url.save((err, data) => {
      if (err) return console.log(err)
      done(null, data)
    })
  })
}

// DB find previously saved url by short url
const findUrl = (short_url, done) => {
  Url.findOne({short_url: short_url}, (err,data) => {
    if (err) return console.log(err)
    done(null, data)
  })
}


// POST creating a new short URL
app.post('/api/shorturl/new', async (req, res) => {
  const isValidUrlPromise = new Promise((resolve, reject) => {
    let parsedLookupUrl = req.body.url
    if (req.body.url.startsWith('http')) {
      parsedLookupUrl = url.parse(req.body.url).hostname
    }
    dns.lookup(parsedLookupUrl, (err, address) => {
        err ? resolve(false) : resolve(true)
    });
  });

  
  const isValidUrl = await isValidUrlPromise

  if (isValidUrl) {
    shortenAndSaveUrl(req.body.url, (err, data) => {
      res.json({
        original_url : data.original_url,
        short_url: data.short_url
      })
    })
  } 
  else {
    res.json({ 
      error: 'invalid url' 
    })
  }
})

// GET redirect to previusly shortened URL
app.get('/api/shorturl/:urlId', async (req, res) => {
  findUrl(req.params.urlId, (err, data) => {
      if (data) {
        if (data['original_url'].startsWith('http')) {
          res.redirect(data['original_url'])
        }
        else {
          res.redirect('https://' + data['original_url'])
        }
      }
      else {
        res.json({ 
          error: 'invalid url' 
        })
      }
      
    })
})

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
