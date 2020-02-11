const common = require('./components/common');
//const mysql = require('./components/mysql');
const server = require('./components/server');
const session = require('./components/session');
//const upload = require("./components/file-upload");
const path = require("./components/path");
const cookie = require("./components/cookie");

module.exports = Object.assign(
  {}, 
  common, 
  //mysql, 
  server, 
  session,  
  //upload,
  path,
  cookie
);
