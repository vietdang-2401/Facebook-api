const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validInput = require('../utils/validInput');
const verify = require('../utils/verifyToken');
const convertString = require('../utils/convertString');
const { responseError, callRes } = require('../response/error');
const checkInput = require('../utils/validInput');
const validTime = require('../utils/validTime');
const removeAccents = require('../utils/removeAccents');

var multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const MAX_IMAGE_NUMBER = 4;
const MAX_SIZE_IMAGE = 4 * 1024 * 1024; // for 4MB

// Create new storage instance with Firebase project credentials

const storage = new Storage({
  projectId: process.env.GCLOUD_PROJECT_ID,
  credentials: {
    private_key: process.env.private_key,
    client_email: process.env.client_email,
  },
});

// Create a bucket associated to Firebase storage bucket
const bucket = storage.bucket(process.env.GCLOUD_STORAGE_BUCKET_URL);

// Initiating a memory storage engine to store files as Buffer objects
const uploader = multer({
  storage: multer.memoryStorage(),
});

// Item Model
const User = require('../models/User');
const Setting = require('../models/Setting');
const verifyToken = require('../utils/verifyToken');
const LCS = require('../utils/LCS');

// @route  POST it4788/signup
// @desc   Register new user
// @access Public
// Example: Use Postman
// URL: http://127.0.0.1:5000/it4788/signup
// BODY: {
// "phoneNumber": "0789554152",
// "password": "nguyen123"
// }
router.post('/signup', async (req, res) => {
  const phoneNumber = req.body.phoneNumber;
  const password = req.body.password;
  const newUser = new User({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    name: req.body.lastName + " " + req.body.firstName ,
    birthday: req.body.birthday,
    phoneNumber: phoneNumber,
    email: req.body.email,
    password: password,
    verifyCode: random4digit(),
    isVerified: false,
  });

  // console.log(newUser);
  if (phoneNumber === undefined || password === undefined) {
    return callRes(
      res,
      responseError.PARAMETER_IS_NOT_ENOUGH,
      'phoneNumber, password'
    );
  }
  if (typeof phoneNumber != 'string' || typeof password != 'string') {
    return callRes(
      res,
      responseError.PARAMETER_TYPE_IS_INVALID,
      'phoneNumber, password'
    );
  }
  if (!validInput.checkPhoneNumber(phoneNumber)) {
    return callRes(
      res,
      responseError.PARAMETER_VALUE_IS_INVALID,
      'phoneNumber'
    );
  }
  // if (!validInput.checkUserPassword(password)) {
  //   return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'password');
  // }
  if (phoneNumber == password) {
    return callRes(
      res,
      responseError.PARAMETER_VALUE_IS_INVALID,
      'trùng phone và pass'
    );
  }
  try {
    let user = await User.findOne({ phoneNumber: phoneNumber });
    if (user) return callRes(res, responseError.USER_EXISTED);
    // hash the password before save to DB
    bcrypt.genSalt(10, (err, salt) => {
      if (err) return callRes(res, responseError.UNKNOWN_ERROR, err.message);
      bcrypt.hash(newUser.password, salt, async (err, hash) => {
        if (err) return callRes(res, responseError.UNKNOWN_ERROR, err.message);
        newUser.password = hash;
        try {
          let saved = await newUser.save();

          // add default settings
          await new Setting({
            user: saved.id,
          }).save();

          let data = {
            id: saved.id,
            phoneNumber: saved.phoneNumber,
            verifyCode: saved.verifyCode,
            isVerified: saved.isVerified,
          };
          return callRes(res, responseError.OK, data);
        } catch (error) {
          return callRes(
            res,
            responseError.CAN_NOT_CONNECT_TO_DB,
            error.message
          );
        }
      });
    });
  } catch (error) {
    return callRes(res, responseError.UNKNOWN_ERROR, error.message);
  }
});

// @route  POST it4788/get_verify_code
// @desc   get verified code
// @access Public
router.post('/get_verify_code', async (req, res) => {
  const phoneNumber = req.query.phoneNumber;

  if (!phoneNumber) {
    console.log('PARAMETER_IS_NOT_ENOUGH phoneNumber');
    return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'phoneNumber');
  }

  if (phoneNumber && typeof phoneNumber != 'string') {
    return callRes(res, responseError.PARAMETER_TYPE_IS_INVALID, 'phoneNumber');
  }
  if (!validInput.checkPhoneNumber(phoneNumber)) {
    return callRes(
      res,
      responseError.PARAMETER_VALUE_IS_INVALID,
      'phoneNumber'
    );
  }

  try {
    let user = await User.findOne({ phoneNumber: phoneNumber });
    if (!user) {
      console.log('phoneNumber is not existed');
      return callRes(
        res,
        responseError.USER_IS_NOT_VALIDATED,
        'phoneNumber is not existed'
      );
    }

    if (user.isVerified) {
      console.log('user is verified');
      return callRes(
        res,
        responseError.ACTION_HAS_BEEN_DONE_PREVIOUSLY_BY_THIS_USER,
        'user is verified'
      );
    }

    if (user.timeLastRequestGetVerifyCode) {
      let time = (Date.now() - user.timeLastRequestGetVerifyCode) / 1000;
      console.log(time);
      if (time < 120) {
        console.log('2 lan lay get verify gan nhau < 120s');
        return callRes(
          res,
          responseError.ACTION_HAS_BEEN_DONE_PREVIOUSLY_BY_THIS_USER,
          'Await ' + (120 - time) + 's'
        );
      }
    }

    user.timeLastRequestGetVerifyCode = Date.now();
    await user.save();

    let data = {
      verifyCode: user.verifyCode,
    };
    return callRes(res, responseError.OK, data);
  } catch (err) {
    console.log(err);
    console.log('CAN_NOT_CONNECT_TO_DB');
    return callRes(res, responseError.CAN_NOT_CONNECT_TO_DB);
  }
});

// @route  POST it4788/check_verify_code
// @desc   check verified code
// @access Public
router.post('/check_verify_code', async (req, res) => {
  const { phoneNumber, code_verify } = req.query;

  if (!phoneNumber || !code_verify) {
    return callRes(
      res,
      responseError.PARAMETER_IS_NOT_ENOUGH,
      'phoneNumber, code_verify'
    );
  }
  if (typeof phoneNumber != 'string' || typeof code_verify != 'string') {
    return callRes(
      res,
      responseError.PARAMETER_TYPE_IS_INVALID,
      'phoneNumber, code_verify'
    );
  }
  if (!validInput.checkPhoneNumber(phoneNumber)) {
    return callRes(
      res,
      responseError.PARAMETER_VALUE_IS_INVALID,
      'phoneNumber'
    );
  }
  if (!validInput.checkVerifyCode(code_verify)) {
    return callRes(
      res,
      responseError.PARAMETER_VALUE_IS_INVALID,
      'code_verify'
    );
  }

  try {
    let user = await User.findOne({ phoneNumber: phoneNumber });
    if (!user) {
      console.log('phoneNumber is not existed');
      return callRes(
        res,
        responseError.PARAMETER_VALUE_IS_INVALID,
        'phoneNumber is not existed'
      );
    }

    if (user.isVerified) {
      console.log('user is verified');
      return callRes(
        res,
        responseError.PARAMETER_VALUE_IS_INVALID,
        'user is verified'
      );
    }

    if (user.verifyCode != code_verify) {
      console.log('code_verify sai');
      return callRes(
        res,
        responseError.PARAMETER_VALUE_IS_INVALID,
        'code_verify is wrong'
      );
    }

    user.isVerified = true;
    user.verifyCode = undefined;
    user.dateLogin = Date.now();
    let loginUser = await user.save();

    try {
      var token = jwt.sign(
        { id: loginUser.id, dateLogin: loginUser.dateLogin },
        process.env.jwtSecret,
        { expiresIn: 86400 }
      );
      let data = {
        token: token,
        id: user._id,
        active: null,
      };
      return callRes(res, responseError.OK, data);
    } catch (err) {
      console.log(err);
      return callRes(res, responseError.UNKNOWN_ERROR, err.message);
    }
  } catch (err) {
    console.log(err);
    console.log('CAN_NOT_CONNECT_TO_DB');
    return callRes(res, responseError.CAN_NOT_CONNECT_TO_DB);
  }
});

// @route  POST it4788/login
// @desc   login
// @access Public
router.post('/login', async (req, res) => {
  const { phoneNumber, password } = req.body;
  
  if (phoneNumber === undefined || password === undefined) {
    return callRes(
      res,
      responseError.PARAMETER_IS_NOT_ENOUGH,
      'phoneNumber, password'
    );
  }
  if (typeof phoneNumber != 'string' || typeof password != 'string') {
    return callRes(
      res,
      responseError.PARAMETER_TYPE_IS_INVALID,
      'phoneNumber, password'
    );
  }
  if (!validInput.checkPhoneNumber(phoneNumber)) {
    return callRes(
      res,
      responseError.PARAMETER_VALUE_IS_INVALID,
      'phoneNumber'
    );
  }
  // if (!validInput.checkUserPassword(password)) {
  //   return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'password');
  // }
  if (phoneNumber == password) {
    return callRes(
      res,
      responseError.PARAMETER_VALUE_IS_INVALID,
      'trùng phone và pass'
    );
  }
  try {
    // check for existing user
    let user = await User.findOne({ phoneNumber });
    if (!user)
      return callRes(
        res,
        responseError.USER_IS_NOT_VALIDATED,
        'không có user này'
      );
    // if (!user.isVerified)
    //   return callRes(
    //     res,
    //     responseError.USER_IS_NOT_VALIDATED,
    //     'chưa xác thực code verify'
    //   );
    bcrypt.compare(password, user.password).then(async (isMatch) => {
      if (!isMatch)
        return callRes(
          res,
          responseError.PARAMETER_VALUE_IS_INVALID,
          'password'
        );
      user.dateLogin = Date.now();
      try {
        let loginUser = await user.save();
        jwt.sign(
          { id: loginUser.id, dateLogin: loginUser.dateLogin },
          process.env.jwtSecret,
          { expiresIn: 86400 },
          (err, token) => {
            if (err)
              return callRes(res, responseError.UNKNOWN_ERROR, err.message);
            let data = {
              id: loginUser.id,
              username: loginUser.name ? loginUser.name : null,
              token: token,
              avatar: loginUser.avatar.url ? loginUser.avatar.url : null,
              active: null,
            };
            return callRes(res, responseError.OK, data);
          }
        );
      } catch (error) {
        return callRes(res, responseError.UNKNOWN_ERROR, error.message);
      }
    });
  } catch (error) {
    return callRes(res, responseError.UNKNOWN_ERROR, error.message);
  }
});

router.post('/change_password', verify, async (req, res) => {
  // const { token, password, new_password } = req.query;
  const token = req.query.token
  const password = req.body.password;
  const new_password = req.body.new_password;
  const userId = req.body.userId

  // console.log(userId, password, new_password);
  
  if (!password || !new_password) {
    return callRes(
      res,
      responseError.PARAMETER_IS_NOT_ENOUGH,
      'password, new_password'
    );
  }
  if (typeof password != 'string' || typeof new_password != 'string') {
    return callRes(
      res,
      responseError.PARAMETER_TYPE_IS_INVALID,
      'password, new_password'
    );
  }
  // if (!validInput.checkUserPassword(password)) {
  //   return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'password');
  // }
  // if (!validInput.checkUserPassword(new_password)) {
  //   return callRes(
  //     res,
  //     responseError.PARAMETER_VALUE_IS_INVALID,
  //     'new_password'
  //   );
  // }

  if (password == new_password) {
    return callRes(
      res,
      responseError.PARAMETER_VALUE_IS_INVALID,
      'new_password == password'
    );
  }

  // Check xau con chung dai nhat > 80%
  var tylexauconchungtrenmatkhaumoi =
    LCS(password, new_password).length / new_password.length;
  if (tylexauconchungtrenmatkhaumoi > 0.8) {
    return callRes(
      res,
      responseError.PARAMETER_VALUE_IS_INVALID,
      'new_password va password co xau con chung/new_password > 80%'
    );
  }

  let user;
  try {
    user = await User.findById(userId);
  } catch (err) {
    console.log('Can not connect to DB');
    return setAndSendResponse(res, responseError.CAN_NOT_CONNECT_TO_DB);
  }

  var isPassword = bcrypt.compareSync(password, user.password);
  if (!isPassword) {
    return callRes(
      res,
      responseError.PARAMETER_VALUE_IS_INVALID,
      'password khong dung'
    );
  }

  //hash the password before save to DB
  bcrypt.genSalt(10, (err, salt) => {
    if (err) return callRes(res, responseError.UNKNOWN_ERROR, err.message);
    bcrypt.hash(new_password, salt, async (err, hash) => {
      if (err) return callRes(res, responseError.UNKNOWN_ERROR, err.message);
      user.password = hash;
      try {
        user.dateLogin = undefined;
        let saved = await user.save();
        return callRes(res, responseError.OK, null);
      } catch (error) {
        return callRes(res, responseError.CAN_NOT_CONNECT_TO_DB, error.message);
      }
    });
  });
});
// @route  POST it4788/logout
// @desc   logout
// @access Public
router.post('/logout', verify, async (req, res) => {
  try {
    let user = await User.findById(req.user.id);
    user.dateLogin = '';
    await user.save();
    return callRes(res, responseError.OK);
  } catch (error) {
    return callRes(res, responseError.UNKNOWN_ERROR, error.message);
  }
});

router.post('/set_devtoken', verify, async (req, res) => {
  var { token, devtype, devtoken } = req.query;
  if (token === undefined || devtype === undefined || devtoken === undefined)
    return callRes(
      res,
      responseError.PARAMETER_IS_NOT_ENOUGH,
      'token and devtype and devtoken'
    );
  let id = req.user.id;
  let thisUser = await User.findById(id);
  if (thisUser.isBlocked) {
    return callRes(
      res,
      responseError.USER_IS_NOT_VALIDATED,
      'Your account has been blocked'
    );
  }
  if (devtype != 0 && devtype != 1)
    return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'devtype');
  else return callRes(res, responseError.OK);
});

router.post(
  '/change_info_after_signup',
  verify,
  uploader.single('avatar'),
  async (req, res) => {
    // do what you want
    // Validation
    let code, message;
    if (req.query.username === undefined) {
      return callRes(res, responseError.PARAMETER_IS_NOT_ENOUGH, 'username');
    }
    if (req.query.username.length == 0) {
      return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'username');
    }
    let str = removeAccents(req.query.username);
    var regex = /^[a-zA-Z][a-zA-Z_ ]*$/;
    if (!regex.test(str)) {
      return callRes(res, responseError.PARAMETER_VALUE_IS_INVALID, 'username');
    }
    if (str.length <= 3) {
      return callRes(
        res,
        responseError.PARAMETER_VALUE_IS_INVALID,
        'username too short'
      );
    }
    if (str.length >= 30) {
      return callRes(
        res,
        responseError.PARAMETER_VALUE_IS_INVALID,
        'username too long'
      );
    }

    if (req.file) {
      if (req.file.size > MAX_SIZE_IMAGE) {
        return callRes(res, responseError.FILE_SIZE_IS_TOO_BIG);
      }
      if (
        req.file.mimetype != 'image/jpeg' &&
        req.file.mimetype != 'image/jpg' &&
        req.file.mimetype != 'image/png'
      ) {
        return callRes(
          res,
          responseError.PARAMETER_VALUE_IS_INVALID,
          'image type'
        );
      }
      let id = req.user.id;
      var user = await User.findById(id);

      if (user.name !== undefined) {
        return callRes(
          res,
          responseError.ACTION_HAS_BEEN_DONE_PREVIOUSLY_BY_THIS_USER
        );
      }

      user.name = req.query.username;
      let promise = await uploadFile(req.file);
      user.avatar = promise;
      user.save();
      let data = {
        code: '1000',
        message: 'OK',
        data: {
          id: user.id,
          username: user.name,
          phoneNumber: user.phoneNumber,
          created: String(Math.floor(user.registerDate / 1000)),
          avatar: user.avatar.url,
        },
      };
      res.json({ code, message, data });
      return;
    } else {
      let id = req.user.id;
      var user = await User.findById(id);

      if (user.name !== undefined) {
        return callRes(
          res,
          responseError.ACTION_HAS_BEEN_DONE_PREVIOUSLY_BY_THIS_USER
        );
      }

      user.name = req.query.username;
      user.save();
      let data = {
        code: '1000',
        message: 'OK',
        data: {
          id: user.id,
          username: user.name,
          phoneNumber: user.phoneNumber,
          created: String(Math.floor(user.registerDate / 1000)),
          avatar: null,
        },
      };
      res.json({ code, message, data });
      return;
    }
  }
);

router.post('/check_new_version', verify, async (req, res) => {
  var { token, last_update } = req.query;
  if (token === undefined || last_update === undefined)
    return callRes(
      res,
      responseError.PARAMETER_IS_NOT_ENOUGH,
      'token and last_update'
    );
  let id = req.user.id;
  let thisUser = await User.findById(id);
  if (thisUser.isBlocked) {
    return callRes(
      res,
      responseError.USER_IS_NOT_VALIDATED,
      'Your account has been blocked'
    );
  }
  if (last_update != currentVersion) {
    data = {
      version: currentVersion,
      required: 1,
      url: 'updateversion.com',
    };
    return callRes(res, responseError.OK, data);
  } else {
    data = {
      version: currentVersion,
      required: 0,
    };
    return callRes(res, responseError.OK, data);
  }
});

var currentVersion = '1.0';

function uploadFile(file) {
  const newNameFile = new Date().toISOString() + file.originalname;
  const blob = bucket.file(newNameFile);
  const blobStream = blob.createWriteStream({
    metadata: {
      contentType: file.mimetype,
    },
  });
  const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${
    bucket.name
  }/o/${encodeURI(blob.name)}?alt=media`;
  return new Promise((resolve, reject) => {
    blobStream.on('error', function (err) {
      reject(err);
    });

    blobStream.on('finish', () => {
      resolve({
        filename: newNameFile,
        url: publicUrl,
      });
    });

    blobStream.end(file.buffer);
  });
}

function random4digit() {
  return Math.floor(Math.random() * 9000) + 1000;
}

module.exports = router;
