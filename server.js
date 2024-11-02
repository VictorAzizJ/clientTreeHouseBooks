// server.js
const express = require('express');
var path = require('path');
const app = express();
const PORT = 3000;

// Middleware
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

// Sample route
app.get('/', (req, res) => {
  // Sample data could be fetched from a database
  const data = require('./data/data.json');
  res.render('index', { data });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
