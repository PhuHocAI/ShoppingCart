import express from 'express'
import userRouter from './routes/users.routers'
import { databaseServices } from './services/database.services'
import { defaultErrorHandler } from './middlewares/error.middlewares'
//dùng express để tạo server

const app = express()
const PORT = 3000 //3000 cho BE 4000 cho FE

//kết nối với mongodb
databaseServices.connect()
//dựng userRouter
app.use(express.json()) //Server dùng middlewares biến đổi các chuỗi json được gửi lên thành object
//handler: những hàm nhận req và trả về res
//những handler nằm ở giữa thì gọi là middleware
//những handler cuối cùng gọi là controller
//app dùng userRouter
app.use('/users', userRouter)
app.use(defaultErrorHandler)
//server mở ở port 3000
//http://localhost:3000/
app.listen(PORT, () => {
  console.log(`Server BE được mở ở port:${PORT}`)
})
