import {getRequestOption} from "../lib";

export default {
  viewer:getRequestOption("GET"),
  login:getRequestOption("POST"),
  logOut:getRequestOption("GET"),
}