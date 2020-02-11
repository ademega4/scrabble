'use strict';

const joi = require('@hapi/joi');

const envVarsSchema = joi.object({
  NODE_ENV: joi.string()
    .allow('development', 'production', 'test', 'provision')
    .required(),
  JOIN_GAME_TIMEOUT:joi.number().min(10).max(180).required(),
  PLAY_TIMEOUT:joi.number().min(30).max(120).required(),//min of 30secs max of 2min
}).unknown()
  .required();

const { error, value: envVars } = envVarsSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const config = {
  env: envVars.NODE_ENV.trim(),
  joinGameTimeout:envVars.JOIN_GAME_TIMEOUT,
  playTimeout:envVars.PLAY_TIMEOUT,
};

module.exports = config;
