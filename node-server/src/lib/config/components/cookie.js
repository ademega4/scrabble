const joi = require('@hapi/joi');

const envVarsSchema = joi.object({
  COOKIE_NAME: joi.string().required(),
  COOKIE_PATH: joi.string().required(),
  HTTP_ONLY:joi.boolean().required(),
  COOKIE_EXPIRES_IN:joi.number().required(),
}).unknown()
  .required();

const { error, value: envVars } = envVarsSchema.validate(process.env);
if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const config = {
  cookie: {
    name: envVars.COOKIE_NAME,
    path: envVars.COOKIE_PATH,
    httpOnly:envVars.HTTP_ONLY,
    expiresIn:envVars.COOKIE_EXPIRES_IN
  }
};

module.exports = config;
