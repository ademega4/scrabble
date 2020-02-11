const jwt = require("jsonwebtoken");
const {generateRandomNumber} = require("./index");

const {
  session:{
    sessSecret, authTokenExpiresIn
  },
  server:{name}
} = process.__config;

export default {
  sign(payload:any, option:any={}) :Promise<string>{
    return new Promise((resolve, reject)=>{
      jwt.sign(payload, sessSecret, option, (error:any, token:any)=>{
        if(error) return reject(error);
        resolve(token);
      });
    });
  },
  
  verify(token:any, option={ignoreExpiration:true}) :Promise<any>{
    return new Promise((resolve, reject)=>{
      jwt.verify(token, sessSecret, option, function(error:Error, payload:any){
        if(error) return reject(error);
        resolve(payload);
      });
    });
  },

  /**
   * 
   * @param {number} sub user account id
   * @returns {string}
   */
  createToken(sub:string) :Promise<string>{
    //create a new token for logged in user
    return this.sign({
      sub, 
      data:{csrf:generateRandomNumber(12)}, 
      iat:Math.floor(Date.now()/1000),
      iss:name
    });
  },//end method
  createAuthToken(sub:string, data:any) :Promise<string>{
    return this.sign({
      sub, 
      data, 
      iat:Math.floor(Date.now()/1000),
      iss:name,
    }, {expiresIn: authTokenExpiresIn });
  }
}