"use strict";

const request = require('request');

const knex = require('knex')({
  client: 'pg',
  connection: {
    database: 'promise-test'
  },
  //debug: true
});

// knex adds an additional layer on top of the pg interface (which allows us to interact with Postgres) and further simplifies (or 'abstracts') away the specifics of the database we're using - knex is an ORM tool

const pg = require('knex')({
  client: 'pg',
  connection: process.env.PG_CONNECTION_STRING,
  searchPath: 'knex,public'
});

var queryUSDAFarmersMarkets = (zipCode) => {
  return new Promise((resolve, reject) => {
    const baseUrl = 'http://search.ams.usda.gov/farmersmarkets/v1/data.svc/zipSearch?zip=';
    request(baseUrl + zipCode, (err, resp, body) => {
      if (err) reject(err);
      resolve(body);
    });
  });
};

// queryUSDAFarmersMarkets(22201)
//   .then((respBody) => {
//     console.log('response', JSON.parse(respBody))
//   })
//   .then(null, (error) => {
//     console.log('error :', error)
//   })

// knex code to create the database (run from command line)

// createdb promise-test

// knex code to create the schema
// unlike knex's other functions, createTableIfNotExists does not return a promise, but we can fix that by wrapping it in Promise.resolve
Promise.resolve(knex.schema.createTableIfNotExists('markets', (table) => {
    table.string('id').primary();
    table.string('marketname');
}))
.then(() => {
  console.log('Fetching the list of markets from the USDA server...')
  return queryUSDAFarmersMarkets(22201).then((respBody) => {
    // because the queryUSDAFarmersMarkets function returns a promise we MUST CALL .then() in order to get the response body back, and then we must explicitly return it to pass it on to the next callback (.then())
    return JSON.parse(respBody).results
  })
})
.then((markets) => {
  console.log('Inserting query results into the database...')
  return Promise.all(markets.map((market) => {
    return knex('markets').insert(market)
  }))
})
.then((result) => {
  return knex.select('*').from('markets').then((result) => {
    console.log("Now our markets table has data in it!")
    console.log("Contents of markets table: ", result)
  })
})
.catch((error) => {
  console.log(error)
})
