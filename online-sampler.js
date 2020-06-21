const axios = require("axios");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { v4: uuid } = require("uuid");
const open = require("open");

// Check if it's running in max
const MAX_ENV = process.env.hasOwnProperty("MAX_ENV");
var Max = null;
if (MAX_ENV) Max = require("max-api");

const freesoundSoundsURI = "https://freesound.org/apiv2/sounds/";
const freesoundAuthURI = "https://freesound.org/apiv2/oauth2/authorize";
const freesoundTokenURI = "https://freesound.org/apiv2/oauth2/access_token";
const freesoundSearchURI = "https://freesound.org/apiv2/search/text/?query=";
const tokenFilename = "Onsam_access_token.json";
const tempFolder = path.join(os.tmpdir(), "com.av.onsam");

let currentQuery = "";

if (!fs.existsSync(tempFolder)) {
  fs.mkdirSync(tempFolder);
}

// ---------------------------------------------------Authorization ---------------------------------------------------
/* 1) register at freesound.org
 * 2) request api access
 * 3) copy in your client id and your client secret
 * 4) go to freeseound auth api and copy in your authorization code
 * 5) POST request freesound token api and get back the access code
 * 7) TODO Can use refresh_token to refresh
 * 8) When making requests add a header: Authorization: "Bearer " + token
 */
async function authorize(clientId) {
  const requestURI =
    freesoundAuthURI +
    "?client_id=" +
    clientId +
    "&response_type=code&state=xyz";
  await open(requestURI);
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

// --------------------------------------------------- Queries ---------------------------------------------------
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

async function querySounds(query, authHeader, page = 1) {
  const config = {
    ...authHeader,
  };

  return axios({
    method: "get",
    url: freesoundSearchURI + query + "&page=" + page,
    ...config,
  }).then(res => {
    return new Promise((resolve, reject) => {
      resolve(res.data.results);
    });
  });
}

const getSound = (id, authHeader, index) => {
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
      sound.name = res.data.name;
      sound.downloadLink = res.data.download;
      sound.previewLink = res.data.previews["preview-lq-mp3"];
      sound.waveformImgLink = res.data.images.waveform_m;
      sound.length = Math.round(res.data.duration * 1000);

      Max.outlet("name", index, sound.name);
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
    })
    .catch(err => console.log(err));
};

// --------------------------------------------------- MAX Handlers etc. ---------------------------------------------------
if (MAX_ENV) {
  const authorization = readTokenFromOS();

  if (authorization) {
    const authHeader = {
      headers: {
        Authorization: "Bearer " + authorization.access_token,
      },
    };

    Max.addHandlers({
      query: queryText => {
        if (currentQuery !== queryText) {
          currentQuery = queryText;
          Max.outlet("new-query", 1);
        }
        Max.outlet("qloading", 1);
        querySounds(queryText, authHeader).then(results => {
          results.forEach((element, index) => {
            getSound(element.id, authHeader, index + 1);
          });
          Max.outlet("qloading", 0);
        });
      },
      page: pageNum => {
        Max.outlet("qloading", 1);
        querySounds(currentQuery, authHeader, pageNum).then(results => {
          results.forEach((element, index) => {
            getSound(element.id, authHeader, index + 1);
          });
          Max.outlet("qloading", 0);
        });
      },
    });
  }
}

module.exports = {
  authorize,
  getSound,
  getToken,
  readTokenFromOS,
  querySounds,
};
