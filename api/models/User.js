const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  firstName: {
    type: String,
    // required: true,
  },
  lastName: {
    type: String,
    // required: true,
  },
  middleName: {
    type: String,
  },
  name: {
    type: String,
    // required: true,
  },
  birthday: {
    type: Date,
    // require: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    // required: true,
  },
  password: {
    type: String,
    required: true,
  },
  dateLogin: {
    type: Date,
  },
  registerDate: {
    type: Date,
    default: Date.now,
  },
  avatar: {
    filename: {
      type: String,
    },
    url: {
      type: String,
    },
  },
  verifyCode: {
    type: Number,
  },
  isVerified: {
    type: Boolean,
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  friends: [
    {
      friend: {
        type: Schema.Types.ObjectId,
        ref: 'users',
      },
      createdAt: {
        type: Date,
      },
    },
  ],
  blockedList: [
    {
      user: {
        type: Schema.Types.ObjectId,
        ref: 'users',
      },
      createdAt: {
        type: Date,
      },
    },
  ],
  friendRequestReceived: [
    {
      fromUser: {
        type: Schema.Types.ObjectId,
        ref: 'users',
      },
      lastCreated: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  friendRequestSent: [
    {
      type: Schema.Types.ObjectId,
      ref: 'users',
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  description: {
    type: String,
    default: 'chưa có mô tả',
  },
  coverImage: {
    filename: {
      type: String,
    },
    url: {
      type: String,
    },
  },
  address: {
    type: String,
  },
  city: {
    type: String,
  },
  country: {
    type: String,
  },
  link: {
    type: String,
  },
  timeLastRequestGetVerifyCode: {
    type: Date,
  },
});

module.exports = mongoose.model('users', UserSchema);
