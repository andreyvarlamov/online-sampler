require("dotenv").config();

const onlineSampler = require("./online-sampler");

// console.log(process.env);

const tempClientId = process.env.TEMP_CLIENT_ID;
const tempClientSecret = process.env.TEMP_CLIENT_SECRET;

// onlineSampler.authorize(tempClientId);

const tempCode = process.env.TEMP_CODE;

// onlineSampler.getToken(tempClientId, tempClientSecret, tempCode);

const authorization = onlineSampler.readTokenFromOS();

// if (authorization) {
//   const authHeader = {
//     headers: {
//       Authorization: "Bearer " + authorization.access_token,
//     },
//   };

// const tempId = "186942";
// onlineSampler.getSound(tempId, authHeader);

// onlineSampler.querySounds("kick", authHeader).then(results => {
//   console.log(results);
//   results.forEach(element => {
//     onlineSampler.getSound(element.id, authHeader);
//   });
// });
// }
