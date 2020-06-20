const axios = require("axios");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { v4: uuid } = require("uuid");
const open = require("open");

const MAX_ENV = process.env.hasOwnProperty("MAX_ENV");

var Max = null;

if (MAX_ENV) Max = require("max-api");

if (MAX_ENV) Max.post("online sampler ok");

if (MAX_ENV) Max.post(process.version);

const freesoundSoundsURI = "https://freesound.org/apiv2/sounds/";
const freesoundAuthURI = "https://freesound.org/apiv2/oauth2/authorize";
const freesoundTokenURI = "https://freesound.org/apiv2/oauth2/access_token";
const freesoundSearchURI = "https://freesound.org/apiv2/search/text/?query=";
const tokenFilename = "Onsam_access_token.json";
const tempFolder = path.join(os.tmpdir(), "com.av.onsam");

if (!fs.existsSync(tempFolder)) {
  fs.mkdirSync(tempFolder);
}

// authorize
/* 1) register at freesound.org
 * 2) request api access
 * 3) copy in your clientID
 */
async function authorize(clientId) {
  // ?client_id=NLzNgGu1qyTCiMrPF9HK&response_type=code&state=xyz
  const requestURI =
    freesoundAuthURI +
    "?client_id=" +
    clientId +
    "&response_type=code&state=xyz";
  await open(requestURI);
  // https://freesound.org/apiv2/oauth2/access_token/?client_id=NLzNgGu1qyTCiMrPF9HK&client_secret=UADd9Szp5gHVPjWBjVDLpbuIcyt7qoElsvkr00FQ&grant_type=authorization_code&code=9oFzzFwjInsGCTE0UxNzXxMGHEK0xL
}

function getToken(clientId, clientSecret, code) {
  const requestURI =
    freesoundTokenURI +
    "/?client_id=" +
    clientId +
    "&client_secret=" +
    clientSecret +
    "&grant_type=authorization_code&code=" +
    code;

  // https://freesound.org/apiv2/oauth2/access_token/
  // ?client_id=NLzNgGu1qyTCiMrPF9HK&client_secret=UADd9Szp5gHVPjWBjVDLpbuIcyt7qoElsvkr00FQ
  // &grant_type=authorization_code&code=DWjSL3wZvvosxkP68RiVDQcU7R058R
  axios
    .post(requestURI)
    .then(res => {
      const data = res.data;
      console.log();
      const jsonString = JSON.stringify(data);
      const filePath = path.join(tempFolder, tokenFilename);
      fs.writeFileSync(filePath, jsonString);
      console.log(filePath);
    })
    .catch(err => console.log(err));
}

function readTokenFromOS() {
  const result = fs.readFileSync(path.join(tempFolder, tokenFilename));
  return JSON.parse(result);
}

async function downloadFile(fileUrl, authHeader, sound = null) {
  const filename = fileUrl.substring(fileUrl.lastIndexOf("/") + 1);
  let outputPath = "";
  if (sound) outputPath = path.join(tempFolder, sound);
  else outputPath = path.join(tempFolder, filename);

  const ws = fs.createWriteStream(outputPath);

  const config = {
    responseType: "stream",
    ...authHeader,
  };

  return axios({
    method: "get",
    url: fileUrl,
    ...config,
  })
    .then(res => {
      return new Promise((resolve, reject) => {
        res.data.pipe(ws);

        let error = null;
        ws.on("error", err => {
          error = err;
          ws.close();
          reject(err);
        });
        ws.on("close", () => {
          if (!error) {
            resolve(outputPath);
          }
        });
        return outputPath;
      });
    })
    .catch(err => console.log(err));
}

// Find a sound
const findASound = (id, authHeader, index) => {
  const sound = {
    name: "",
    length: "",
    downloadLink: "",
    previewLink: "",
    waveformImgLink: "",
  };

  axios
    .get(freesoundSoundsURI + id, authHeader)
    .then(res => {
      // console.log(res.data)
      sound.name = res.data.name;
      sound.downloadLink = res.data.download;
      sound.previewLink = res.data.previews["preview-lq-mp3"];
      sound.waveformImgLink = res.data.images.waveform_m;
      sound.length = Math.round(res.data.duration * 1000);

      Max.outlet("name", index, sound.name);
      // console.log(sound);
      downloadFile(sound.waveformImgLink, authHeader)
        .then(file => {
          console.log(file);
          if (MAX_ENV) Max.outlet("waveform", index, file);
        })
        .catch(err => console.log(err));
      downloadFile(sound.previewLink, authHeader)
        .then(file => {
          console.log(file);
          if (MAX_ENV) Max.outlet("preview", index, file, sound.length);
        })
        .catch(err => console.log(err));
      // downloadFile(sound.downloadLink, authHeader, uuid() + ".wav")
      //   .then(file => {
      //     console.log(file);
      //     if (MAX_ENV) Max.outlet("sample", file);
      //   })
      //   .catch(err => console.log(err));
    })
    .catch(err => console.log(err));
};

// Query Sounds
async function querySounds(query, authHeader) {
  const config = {
    ...authHeader,
  };

  return axios({
    method: "get",
    url: freesoundSearchURI + query,
    ...config,
  }).then(res => {
    return new Promise((resolve, reject) => {
      resolve(res.data.results);
    });
  });
}

if (MAX_ENV) {
  const authorization = readTokenFromOS();

  if (authorization) {
    const authHeader = {
      headers: {
        Authorization: "Bearer " + authorization.access_token, //the token is a variable which holds the token
      },
    };

    // const tempId = "186942";
    // onlineSampler.findASound(tempId, authHeader);

    Max.addHandlers({
      query: queryText => {
        Max.outlet("query-done", 0);
        querySounds(queryText, authHeader).then(results => {
          results.forEach((element, index) => {
            findASound(element.id, authHeader, index + 1);
          });
          Max.outlet("query-done", 1);
        });
      },
    });
  }
}

module.exports = {
  authorize,
  findASound,
  getToken,
  readTokenFromOS,
  querySounds,
};

// Client id NLzNgGu1qyTCiMrPF9HK
// https://freesound.org/apiv2/oauth2/authorize/?client_id=NLzNgGu1qyTCiMrPF9HK&response_type=code&state=xyz
// Auth code 9oFzzFwjInsGCTE0UxNzXxMGHEK0xL
// POST Auth code to https://freesound.org/apiv2/oauth2/access_token/client_id=NLzNgGu1qyTCiMrPF9HK&client_secret=UADd9Szp5gHVPjWBjVDLpbuIcyt7qoElsvkr00FQ&grant_type=authorization_code&code=9oFzzFwjInsGCTE0UxNzXxMGHEK0xL
/* client_id	Client id of your API credential (not the client secret!)
client_secret	The client secret ;)
grant_type	Must be ‘authorization_code’
code	The authorization code you got in step 2 (see above) */
/* {
    "access_token": "OWq5NdmRvr6P9oyqOd3DKrgt9DDp5C",
    "token_type": "Bearer",
    "expires_in": 86400,
    "refresh_token": "G46zGOyILP8KvzaQOLUlbgfFK2KlWf",
    "scope": "read write"
} */

// curl -X POST -d "client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&grant_type=refresh_token&refresh_token=REFRESH_TOKEN" "https://freesound.org/apiv2/oauth2/access_token/"

// GET /apiv2/sounds/<sound_id>/
