const onlineSampler = require("./online-sampler");

console.log(process.env);

// const tempClientId = "NLzNgGu1qyTCiMrPF9HK";
// const tempClientSecret = "UADd9Szp5gHVPjWBjVDLpbuIcyt7qoElsvkr00FQ";

// onlineSampler.authorize(tempClientId);

// const tempCode = "URXHkDMZtvYBeSzVf1HlLmPEMFz0xM";

// onlineSampler.getToken(tempClientId, tempClientSecret, tempCode);

const authorization = onlineSampler.readTokenFromOS();

if (authorization) {
  const authHeader = {
    headers: {
      Authorization: "Bearer " + authorization.access_token, //the token is a variable which holds the token
    },
  };

  // const tempId = "186942";
  // onlineSampler.findASound(tempId, authHeader);

  onlineSampler.querySounds("kick", authHeader).then(results => {
    console.log(results);
    results.forEach(element => {
      onlineSampler.findASound(element.id, authHeader);
    });
  });
}

// https://freesound.org/apiv2/oauth2/access_token/
// ?client_id=NLzNgGu1qyTCiMrPF9HK&client_secret=UADd9Szp5gHVPjWBjVDLpbuIcyt7qoElsvkr00FQ
// &grant_type=authorization_code&code=DWjSL3wZvvosxkP68RiVDQcU7R058R
