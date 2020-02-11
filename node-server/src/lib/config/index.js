const join = require("path").join;
const env = process.env.NODE_ENV ? process.env.NODE_ENV.trim() : "";

if(process.__config) return;


// load .env in local development//
if (env === 'development'){
  //const path = process.argv[2] ? process.argv[2] :"./.env";
  const path = join(__dirname, "../../../.env");
  
  require('dotenv').config({silent: true, path});
}
else if(process.env.NODE_ENV.trim() === 'production'){
  const path = join(__dirname, "../../../prod.env");
  
  require('dotenv').config({silent: true, path});
}

else{
  throw new Error("environment can only be development or production")
}

const processType = process.env.PROCESS_TYPE;

try {
  if(processType && processType.trim().toLocaleLowerCase() === "web"){
    //process.env.__config = ;
    process.__config = require(join(__dirname, "./web"));
  }
  else{
    process.__config = require(join(__dirname, processType));
  }
  //save environment type
  process.__config.env = env;
} catch (ex) {
  if (ex.code === 'MODULE_NOT_FOUND') {
    throw new Error(`No config for process type: ${processType}`);
  }
  throw ex;
}

