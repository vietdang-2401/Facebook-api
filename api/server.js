require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const multer = require('multer')
const { responseError, callRes } = require('./response/error')
const http = require('http')
const { Server } = require('socket.io')

const app = express()

// use express.json as middleware
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cors())

// connect to MongoDB
const url = process.env.mongoURI
mongoose.set('strictQuery', true)
mongoose
  .connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    // useCreateIndex: true,
  })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log(`errors: ${err}`))

// use Routes
app.use('/it4788/auth', require('./routes/auth'))
app.use('/it4788/friend', require('./routes/friend'))
app.use('/it4788/post', require('./routes/posts'))
app.use('/it4788/search', require('./routes/search'))
app.use('/it4788/comment', require('./routes/comments'))
app.use('/it4788/like', require('./routes/likes'))
app.use('/it4788/friend', require('./routes/friend'))
app.use('/it4788/setting', require('./routes/settings'))
app.use('/it4788/user', require('./routes/user'))
app.use('/it4788/chat', require('./routes/chat'))
app.use('/it4788/notification', require('./routes/notification'))
app.use(function (err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return callRes(
        res,
        responseError.EXCEPTION_ERROR,
        "'" +
          err.field +
          "'" +
          ' không đúng với mong đợi. Xem lại trường ảnh hoặc video gửi lên trong yêu cầu cho đúng',
      )
    }
  }
  console.log(err)
  return callRes(res, responseError.UNKNOWN_ERROR, 'Lỗi chưa xác định')
})

const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
})

io.on('connection', (socket) => {
  // console.log(`User Connected: ${socket.id}`);

  socket.on('notification', (data) => {
    console.log(data)
  })
})

const port = process.env.PORT || 5000
server.listen(port, () => console.log(`Server is running on port ${port}`))
