const joi = require('@hapi/joi');

const envVarsSchema = joi.object({
  DB_HOST:joi.string().required().ip(),
  DB_NAME:joi.string().required(),
  DB_USER:joi.string().required(),
  DB_PASSWORD:joi.string().required(),
  DB_ACQUIRE_TIMEOUT:joi.number().integer().default(60000),
  DB_PORT:joi.number().integer().default(3306),
  DB_WAIT_FOR_CONNECTION:joi.bool().truthy("true").truthy("TRUE").falsy("false").falsy("FALSE").default(true),
  DB_QUEUE_LIMIT:joi.number().integer().default(0),
  DB_CONNECTION_LIMIT:joi.number().integer().min(1).default(10),
  DB_SORT_BY_LIMIT:joi.number().integer().default(3),
}).unknown()
  .required();

const { error, value: envVars } = joi.validate(process.env, envVarsSchema);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const config = {mysql: {
    host:envVars.DB_HOST,
    database:envVars.DB_NAME,
    user:envVars.DB_USER,
    password:envVars.DB_PASSWORD,
    port:envVars.DB_PORT,
    acquireTimeout:envVars.DB_ACQUIRE_TIMEOUT,
    waitForConnections:envVars.DB_WAIT_FOR_CONNECTION,
    queueLimit:envVars.DB_QUEUE_LIMIT,
    connectionLimit:envVars.DB_CONNECTION_LIMIT,
    sortByQueryLimit:envVars.DB_SORT_BY_LIMIT,
}};

module.exports = config;
