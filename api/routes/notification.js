const router = require('express').Router();
const Notification = require('../models/Notification');
const User = require('../models/User')
const verify = require('../utils/verifyToken');
const {getUserIDFromToken} = require('../utils/getUserIDFromToken');
// var { responseError, setAndSendResponse } = require('../response/error');

router.post('/create-noti', verify,  async (req, res) => {
  try {
    const { post_id, owner_id, token, notification_type } = req.body
    const user_id = await getUserIDFromToken(token)

    const newNotification = new Notification({
      post_id,
      owner_id,
      user_id,
      created: new Date(),
      read: 0,
      last_badge: 1,
      notification_type
    })
    newNotification.save()
    res.status(200).send({ message: 'thanh cong' })
  } catch(err) {
    console.log(err)
    res.status(200).send({ message: 'that bai' })
  }
})

router.post('/get-noti', verify, async (req, res) => {
  try {
    const { token } = req.body
    const owner_id = await getUserIDFromToken(token)

    const notifications = await Notification.find({ owner_id: owner_id._id })
    const data = notifications.map(async noti => {
      const {
        post_id,
        user_id,
        created,
        read,
        last_badge,
        notification_type } = noti
      let actionInTitle = ''
      switch (notification_type) {
        case 1: 
          actionInTitle += 'đã thích bài viết của bạn.'
          break
        case 2: 
          actionInTitle += 'đã bình luận vào bài viết của bạn.'
          break
        case 3:
          actionInTitle += 'sắp sinh nhật.'
          break
        case 4:
          actionInTitle += 'đã đăng bài viết mới.'
          break
        case 5: 
          break
        case 6:
          actionInTitle += 'đã chấp nhận lời mời kết bạn của bạn.'
          break
      }
      
      const user = await User.findById(user_id)
      const title = `${user.name} ${actionInTitle}`
      return {
        notification_id: noti._id,
        title,
        created,
        avatar: user?.avatar?.url,
        read,
        last_badge,
        notification_type,
        post_id,
        user_id
      }
    })
    Promise.all(data).then((data) => {
      res.status(200).send({ data, message: 'thanh cong' })
    })
  }
  catch (err) {
    res.status(200).send({ message: 'co loi roi' })
  }
})

router.post('/change-status', async (req, res) => {
  try {
    const { notification_id } = req.body

    await Notification.findByIdAndUpdate(notification_id, {
      read: 1
    })

    res.status(200).send({message: 'thanh cong'})
  } catch (err) {
    console.log(err)
    res.status(200).send({message: 'Loi doi trang thai chua doc/ da doc thong bao'})
  }
})

router.post('/delete-noti', async (req, res) => {
  try {
    const { notification_id } = req.body

    await Notification.deleteOne({_id: notification_id})

    res.status(200).send({message: 'thanh cong'})
  } catch (err) {
    console.log(err)

  }
})
module.exports = router
