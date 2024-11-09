import express, { Request, Response } from 'express'
import {
  forgotPasswordController,
  getMeController,
  loginController,
  logoutController,
  registerController,
  resendVerifyEmailController,
  resetPasswordController,
  updateMeController,
  verifyEmailTokenController,
  verifyForgotPasswordTokenController
} from '~/controllers/users.controllers'
import { filterMiddleware } from '~/middlewares/common.middlewares'
import {
  accessTokenValidator,
  emailVerifyTokenValidator,
  forgotPasswordTokenValidator,
  forgotPasswordValidator,
  loginValidator,
  refreshTokenValidator,
  registerValidator,
  resetPasswordValidator,
  updateMeValidator
} from '~/middlewares/users.middlewares'
import { UpdateMeReqBody } from '~/models/requests/users.requests'
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

/*desc: verify forgot password token 
kiểm tra forgot pwd token coi còn có hiệu lực k
path users/verify-forgot-password
method post
body:{
  forgot_password_token: string
}

*/
userRouter.post(
  '/verify-forgot-password',
  forgotPasswordTokenValidator, //kiểm tra forgot_password_token
  wrapAsync(verifyForgotPasswordTokenController) //xử lý logic verify
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

/*desc: reset password
path: users/reset-password
method: POST
body:{
  password: string
  confirm_password: string
  forgot_password_token: string
}
*/
userRouter.post(
  '/reset-password',
  forgotPasswordTokenValidator, //kiểm tra forgot_password_token
  resetPasswordValidator, //kiểm tra password, confirm_password
  wrapAsync(resetPasswordController) //xử lý logic reset password
)

/*desc: get me
lấy thông tin của chính mình
path: user/me
method: post
header:{
  Authorization: 'Bearer <access_token>'
}
*/
userRouter.post('/me', accessTokenValidator, wrapAsync(getMeController))
/*
des: update profile của user
path: '/me'
method: patch
Header: {Authorization: Bearer <access_token>}
body: {
  name?: string
  date_of_birth?: Date
  bio?: string // optional
  location?: string // optional
  website?: string // optional
  username?: string // optional
  avatar?: string // optional
  cover_photo?: string // optional}
*/

userRouter.patch(
  '/me',
  accessTokenValidator,
  filterMiddleware<UpdateMeReqBody>([
    'name',
    'date_of_birth',
    'bio',
    'location',
    'website',
    'avatar',
    'username',
    'cover_photo'
  ]),
  updateMeValidator,
  wrapAsync(updateMeController)
)
export default userRouter
