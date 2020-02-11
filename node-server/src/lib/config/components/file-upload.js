'use strict';

const joi = require('@hapi/joi');

const envVarsSchema = joi.object({
  UPLOAD_AVATAR_DIR: joi.string().required(),
  MAX_AVATAR_SIZE:joi.number().required(),
  UPLOAD_AUDIO_NOTES_DIR:joi.string().required(),
  MEDIA_FILE_UPLOADS_DIR:joi.string().required(),
  MAX_MEDIA_FILE_SIZE: joi.number().integer(),
}).unknown()
  .required();

const { error, value: envVars } = joi.validate(process.env, envVarsSchema);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const config = {
  upload:{
    uploadAvatarDIR: envVars.UPLOAD_AVATAR_DIR,
    maxAvatarSize:envVars.MAX_AVATAR_SIZE,
    uploadAudioNotesDIR:envVars.UPLOAD_AUDIO_NOTES_DIR,
    mediaFileUploadsDIR:envVars.MEDIA_FILE_UPLOADS_DIR,
    maxMediaFileSize:envVars.MAX_MEDIA_FILE_SIZE,
  }
};



module.exports = config;
