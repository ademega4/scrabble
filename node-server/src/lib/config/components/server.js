'use strict';

const joi = require('@hapi/joi');

const envVarsSchema = joi.object({
  SERVER_PORT: joi.number().integer().min(0).required(),
  SERVER_NAME:joi.string().required(),
  HOSTNAME:joi.string().required().ip(),
}).unknown().required();

const { error, value: envVars } = envVarsSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const config = {
  server: {
    port: envVars.SERVER_PORT,
    name:envVars.SERVER_NAME,
    hostname:envVars.HOSTNAME,
  }
};

module.exports = config;
