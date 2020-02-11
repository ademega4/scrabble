const joi = require('@hapi/joi');

const envVarsSchema = joi.object({
  SESS_SECRET_TOKEN: joi.string().required(),
  SESS_NAME: joi.string().required(),
  AUTH_TOKEN_EXPIRES_IN:joi.number().required()
}).unknown()
  .required();

const { error, value: envVars } = envVarsSchema.validate(process.env);
if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const config = {
  session: {
    sessSecret: envVars.SESS_SECRET_TOKEN,
    sessName:envVars.SESS_NAME,
    authTokenExpiresIn:envVars.AUTH_TOKEN_EXPIRES_IN
  }
};

module.exports = config;
