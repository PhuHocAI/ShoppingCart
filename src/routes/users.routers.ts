import express, { Request, Response } from 'express'
import {
  forgotPasswordController,
  loginController,
  logoutController,
  registerController,
  resendVerifyEmailController,
  verifyEmailTokenController
} from '~/controllers/users.controllers'
import {
  accessTokenValidator,
  emailVerifyTokenValidator,
  forgotPasswordValidator,
  loginValidator,
  refreshTokenValidator,
  registerValidator
} from '~/middlewares/users.middlewares'
import { wrapAsync } from '~/utils/handlers'
const userRouter = express.Router()
//setup middleware cho UserRouter

//sử dụng lệnh use là middleware toàn cục

/*
desc: Register a new user
path: /register
method: POST
body:{
  //body này của request
  name: string,
  email: string,
  password: string,
  confirm_password: string,
  date_of_birth: string có cấu trúc là ISO8611, (tiêu chuẩn của chuỗi ngày tháng năm),
}
*/
userRouter.post('/register', registerValidator, wrapAsync(registerController))
//khi kết nối với server, server sẽ không chạy next nên nó sẽ chạy throw (CHẮC CHẮN LÀ THROW)

/*desc: Login
path: users/login
method: POST
body:{
  email: string,
  password: string,
}
*/
userRouter.post('/login', loginValidator, wrapAsync(loginController))

/*desc: logout
path: users/logout
method: POST
headers:{
  Authorization: 'Bearer <access_token>' 
}
body:{
  refresh_token: string
}
*/
userRouter.post('/logout', accessTokenValidator, refreshTokenValidator, wrapAsync(logoutController))

/*desc: verify email
khi người dùng nhấn vào link có trong email của họ
thì evt sẽ được gửi lên server be thông qua req.query
path: users/verify-email/?email_verify_token=string
method: GET
*/
userRouter.get(
  '/verify-email/', //
  emailVerifyTokenValidator,
  wrapAsync(verifyEmailTokenController)
)

/*desc: resend email verify
người dùng sẽ dùng chức năng này khi làm mất, lạc email verify
phải đăng nhập thì mới cho verify
header:{
  Authorization: 'Bearer <access_token>'
}
method: POST
*/
userRouter.post(
  '/resend-verify-email',
  accessTokenValidator, //
  wrapAsync(resendVerifyEmailController)
)

/*desc: forgot password
khi quên mật khẩu thì dùng chức năng này
path: users/forgot-password
method: POST
body:{
  email: string
}
*/
userRouter.post(
  '/forgot-password',
  forgotPasswordValidator, //
  wrapAsync(forgotPasswordController)
)

export default userRouter
