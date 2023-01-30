const mongoose = require("mongoose");
const notificationSchema = mongoose.Schema({
  // type: {
  //   type: String,
  // },
  post_id: {
    type: String,
  },
  owner_id: {
    type: String
  },
  user_id: String,
  title: {
    type: String,
  },
  // notification_id: {
  //   type: mongoose.Schema.Types.ObjectId,
  // },
  created: {
    type: Date,
  },
  // avatar: {
  //   type: String,
  // },
  // group: {
  //   type: Number,
  //   default: 0
  // },
  read: {
    type: Number,
    default: 0
  },
  // badge: {
  //   type: Number,
  //   default: 1
  // },
  last_badge: {
    type: Number,
  },
  //   notification_type: 1: thich, 2: binh luan, 3: sinh nhat, 4: bai viet moi/anh moi, 5: video, 6: ketban
  notification_type: {
    type: Number,
    default: 1
  }
})
module.exports = Notification = mongoose.model("notifications", notificationSchema);