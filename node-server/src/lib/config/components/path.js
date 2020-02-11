'use strict';

const joi = require('@hapi/joi');

const envVarsSchema = joi.object({
  RINGTONES_PATH:joi.string().required(),
  NOTIFICATIONS_PATH:joi.string().required(),
  DICT_PATH:joi.string().required(),
  PATH_TO_INDEX_HTML:joi.string().required(),
}).unknown()
  .required();

const { error, value: envVars } = envVarsSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const config = {
  path:{
    ringtonesPath:envVars.RINGTONES_PATH,
    notificationsPath:envVars.NOTIFICATIONS_PATH,
    dictPath:envVars.DICT_PATH,
    pathToIndexHtml:envVars.PATH_TO_INDEX_HTML
  }
};

module.exports = config;