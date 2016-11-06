'use strict'

const express = require('express')
const client = require('mongodb').MongoClient
const app = express()

// DATABASE
const dbUrl = process.env.MONGODB_URI ||
              'mongodb://localhost:27017/image-search'


// BING SEARCH
const Search = require('bing.search')
const util = require('util')

function searchImages(query, offset) {
  return new Promise(function(resolve, reject) {
    let search = new Search(process.env.BING_API)

    search.images(query, { top: 10, skip: offset }, function(err, results) {
      if (err) throw err

      let img = results.map(function (element) {
        return constructJSON(element)
      })

      resolve(img)
    })
  })
}

function constructJSON(search) {
  return {
    url: search.url,
    snippet: search.title,
    thumbnail: search.thumbnail.url,
    context: search.sourceUrl
  }
}

function showJSON(request) {
  console.log(JSON.stringify(request, null, 2))
}


function insertSearch(term, when) {
  client.connect(dbUrl, {}, function(err, db) {
    if (err) throw err

    let search = {
      "term": term,
      "when": when
    }
    let collection = db.collection('recent-searches')
    collection.insert(search, {w:1}, (err, result) => {
      if (err) throw err
      console.log(result)
      db.close()
    })

  })
}


// EXPRESS
app.get('/api/imagesearch/:query', function(req, res) {
  let query = req.params.query
  let offset = req.query.offset
  let when = new Date().toLocaleString()

  let request = searchImages(query, offset).then(function (image) {
    showJSON(image)
    res.send(image)
  })

  insertSearch(query, when)

})

app.get('/api/latest/imagesearch', function(req, res) {
  client.connect(dbUrl, {}, function(err, db) {
    if (err) throw err

    let collection = db.collection('recent-searches')
    collection.find({}, { "_id": 0 })
              .sort({ $natural: -1 })
              .limit(10)
              .toArray( (err, results) => {
      if (err) throw err
      console.log(results)
      res.send(results)
      db.close()
    })
  })
})

app.get('/', function(req, res) {
  res.redirect('/api/latest/imagesearch')
})

app.listen(process.env.PORT || 8080, function() {
  console.log('Server is listening.')
})
