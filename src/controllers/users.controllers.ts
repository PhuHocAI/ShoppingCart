import e, { NextFunction, Request, Response } from 'express'
import {
  LoginReqBody,
  LogoutReqBody,
  RegisterReqBody,
  ResetPasswordReqBody,
  TokenPayLoad,
  UpdateMeReqBody,
  VerifyEmailReqQuery,
  VerifyForgotPasswordTokenReqBody
} from '~/models/requests/users.requests'
import usersServices from '~/services/users.services'
import { ParamsDictionary } from 'express-serve-static-core'
import { ErrorWithStatus } from '~/models/Errorrs'
import HTTP_STATUS from '~/constants/httpStatus'
import { USERS_MESSAGES } from '~/constants/messages'
import { UserVerifyStatus } from '~/constants/enums'
import { pick } from 'lodash'
//controller là handler có nhiệm vụ tập kết dữ liệu từ người dùng
//và phân phát vào các service đúng chỗ

//controller là nơi tập kết và xử lý logic cho các dữ liệu nhận được
//trong controller, các dữ liệu đều phải clean
export const registerController = async (
  req: Request<ParamsDictionary, any, RegisterReqBody>,
  res: Response,
  next: NextFunction
) => {
  const { email } = req.body
  //gọi service và tạo user từ email, password trong req.body
  //và lưu user đó vào users collection của mongoDB

  //kiểm tra email có bị trùng không || có tồn tại chưa ||  có ai dùng chưa
  const isDup = await usersServices.checkEmailExist(email)
  if (isDup) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
      message: USERS_MESSAGES.EMAIL_ALREADY_EXISTS
    })
  }
  const result = await usersServices.register(req.body)
  res.status(HTTP_STATUS.CREATED).json({
    message: USERS_MESSAGES.REGISTER_SUCCESS,
    result
  })
}

//
export const loginController = async (
  req: Request<ParamsDictionary, any, LoginReqBody>,
  res: Response,
  next: NextFunction
) => {
  //cần lấy email và password để tìm xem user nào đang sở hữu
  //nếu k có user nào thì ngừng cuộc chơi
  //nếu có thì tạo at và rf
  const { email, password } = req.body
  const result = await usersServices.login({ email, password })
  res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.LOGIN_SUCCESS,
    result //ac và rf token
  })
}

export const logoutController = async (
  req: Request<ParamsDictionary, any, LogoutReqBody>,
  res: Response,
  next: NextFunction
) => {
  //xem thử user_id trong payload của refresh_token và access_token có giống nhau không?
  const { refresh_token } = req.body
  const { user_id: user_id_at } = req.decode_authorization as TokenPayLoad
  const { user_id: user_id_rf } = req.decode_refresh_token as TokenPayLoad
  if (user_id_at != user_id_rf) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.UNAUTHORIZED, //401
      message: USERS_MESSAGES.REFRESH_TOKEN_IS_INVALID
    })
  }
  //nếu mà trùng rồi thì mình xem thử refresh_token có đc quyền dùng dịch vụ không ?
  await usersServices.checkRefreshToken({
    user_id: user_id_at,
    refresh_token
  })
  //khi nào mà có mã đó trong db thì mình tiến hành logout(xóa rf khỏi hệ thống)
  await usersServices.logout(refresh_token)
  res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.LOGOUT_SUCCESS
  })
}

export const verifyEmailTokenController = async (
  req: Request<ParamsDictionary, any, any, VerifyEmailReqQuery>,
  res: Response,
  next: NextFunction
) => {
  //khi họ bấm vào link thì họ sẽ gửi email_verify_token lên
  //thông qua req.query
  const email_verify_token = req.query.email_verify_token as string
  const { user_id } = req.decode_email_verify_token as TokenPayLoad
  //kiểm tra xem trong db có user nào sở hữu email_verify_token đó không
  //và là user_id trong payload không
  const user = await usersServices.checkEmailVerifyToken({
    user_id,
    email_verify_token
  })
  //kiểm tra xem user tìm được bị banned chưa, chưa thì mới cho verify
  if (user.verify == UserVerifyStatus.Banned) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.FORBIDDEN, //403
      message: USERS_MESSAGES.EMAIL_HAS_BEEN_BANNED
    })
  } else {
    //chưa verify thì mới cho verify
    const result = await usersServices.verifyEmail(user_id)
    //sau khi verify thì
    res.status(HTTP_STATUS.OK).json({
      message: USERS_MESSAGES.VERIFY_EMAIL_SUCCESS,
      result //ac và rf token
    })
  }
}

export const resendVerifyEmailController = async (
  req: Request<ParamsDictionary, any, any>,
  res: Response,
  next: NextFunction
) => {
  //dùng user_id tìm user đó
  const { user_id } = req.decode_authorization as TokenPayLoad
  //kiểm tra user đó có verify hay bị banned không
  const user = await usersServices.findUserById(user_id)
  if (!user) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.NOT_FOUND,
      message: USERS_MESSAGES.USER_NOT_FOUND
    })
  }
  if (user.verify == UserVerifyStatus.Verified) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.OK,
      message: USERS_MESSAGES.EMAIL_HAS_BEEN_VERIFIED
    })
  } else if (user.verify == UserVerifyStatus.Banned) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.FORBIDDEN,
      message: USERS_MESSAGES.EMAIL_HAS_BEEN_BANNED
    })
  } else {
    //nếu không thì mới resendEmailVerify
    await usersServices.resendEmailVerify(user_id)
    res.status(HTTP_STATUS.OK).json({
      message: USERS_MESSAGES.RESEND_EMAIL_VERIFY_TOKEN_SUCCESS
    })
  }
}

export const forgotPasswordController = async (
  req: Request<ParamsDictionary, any, any>,
  res: Response,
  next: NextFunction
) => {
  const { email } = req.body
  //kiểm tra xem email đó có tồn tại không
  const hasUser = await usersServices.checkEmailExist(email)
  if (!hasUser) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.NOT_FOUND,
      message: USERS_MESSAGES.USER_NOT_FOUND
    })
  } else {
    await usersServices.forgotPassword(email)
    res.status(HTTP_STATUS.OK).json({
      message: USERS_MESSAGES.CHECK_EMAIL_TO_RESET_PASSWORD
    })
  }
}

export const verifyForgotPasswordTokenController = async (
  req: Request<ParamsDictionary, any, VerifyForgotPasswordTokenReqBody>,
  res: Response,
  next: NextFunction
) => {
  //vào được đây có nghĩa là forgot_password_token trong body là hợp lệ
  const { forgot_password_token } = req.body
  //lấy user_id từ forgot_password_token để tìm xem user có sở hữu forgot_password_token không
  const { user_id } = req.decode_forgot_password_token as TokenPayLoad
  //kiểm tra xem forgot_password_token còn trong database này không
  await usersServices.checkForgotPasswordToken({ user_id, forgot_password_token })
  //nếu qua hàm trên êm xuôi thì nghĩa là token hợp lệ
  res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.VERIFY_FORGOT_PASSWORD_TOKEN_SUCCESS
  })
}

export const resetPasswordController = async (
  req: Request<ParamsDictionary, any, ResetPasswordReqBody>,
  res: Response,
  next: NextFunction
) => {
  //vào được đây có nghĩa là forgot_password_token trong body là hợp lệ
  const { forgot_password_token, password } = req.body
  //lấy user_id từ forgot_password_token để tìm xem user có sở hữu forgot_password_token không
  const { user_id } = req.decode_forgot_password_token as TokenPayLoad
  //kiểm tra xem forgot_password_token còn trong database này không
  await usersServices.checkForgotPasswordToken({ user_id, forgot_password_token })
  //nếu qua hàm trên êm xuôi thì nghĩa là token hợp lệ thì mình cập nhật mật khẩu
  await usersServices.resetPassword({ user_id, password })
  res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.RESET_PASSWORD_SUCCESS
  })
}

export const getMeController = async (req: Request<ParamsDictionary, any, any>, res: Response, next: NextFunction) => {
  const { user_id } = req.decode_authorization as TokenPayLoad
  //với user_id này ta sẽ lấy thông tin của user đó
  //nhưng mình k nên đưa hết thông tin của user cho ngta
  const userInfor = await usersServices.getMe(user_id)
  res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.GET_ME_SUCCESS,
    userInfor
  })
}

export const updateMeController = async (
  req: Request<ParamsDictionary, any, UpdateMeReqBody>,
  res: Response,
  next: NextFunction
) => {
  //người dùng gửi access_token để mình biết họ là ai
  //đồng thời cũng cho mình biết họ là ai thông qua user_id trong payload
  const { user_id } = req.decode_authorization as TokenPayLoad
  //req.body chứa các thuộc tính mà người dùng muốn cập nhật
  const payload = req.body //payload là những gì người dùng gửi lên
  await usersServices.checkEmailVerified(user_id)
  //nếu gọi hàm trên mà không có gì xảy ra thì nghĩa là user đã verify rồi
  //mình tiến hành cập nhật thông tin mà người dùng cung cấp
  const userInfor = await usersServices.updateMe({ user_id, payload })
  res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.UPDATE_PROFILE_SUCCESS,
    userInfor
  })
}

// export const updateMeController = async (
//   req: Request<ParamsDictionary, any, UpdateMeReqBody>,
//   res: Response,
//   next: NextFunction
// ) => {
//   //middleware accessTokenValidator đã chạy rồi, nên ta có thể lấy đc user_id từ decoded_authorization
//   const { user_id } = req.decode_authorization as TokenPayLoad
//   //user_id để biết phải cập nhật ai
//   const user = await usersServices.findUserById(user_id)
//   //kiểm tra user đã verify email chưa, nếu chưa thì không cho cập nhật

//   if (!user) {
//     throw new ErrorWithStatus({
//       status: HTTP_STATUS.NOT_FOUND,
//       message: USERS_MESSAGES.USER_NOT_FOUND
//     })
//   }
//   if (user.verify === UserVerifyStatus.Unverified) {
//     throw new ErrorWithStatus({
//       message: USERS_MESSAGES.USER_NOT_VERIFIED,
//       status: HTTP_STATUS.UNAUTHORIZED
//     })
//   }
//   //bị banned thì cũng không cho cập nhật
//   if (user.verify === UserVerifyStatus.Banned) {
//     throw new ErrorWithStatus({
//       message: USERS_MESSAGES.ACCOUNT_HAS_BEEN_BANNED,
//       status: HTTP_STATUS.UNAUTHORIZED
//     })
//   }
//   //lấy thông tin mới từ req.body
//   const body = pick(req.body, [
//     'name',
//     'date_of_birth',
//     'bio',
//     'location',
//     'website',
//     'avatar',
//     'username',
//     'cover_photo'
//   ])
//   //lấy các property mà client muốn cập nhật
//   //ta sẽ viết hàm updateMe trong user.services
//   //nhận vào user_id và body để cập nhật
//   const result = await usersServices.updateMe(user_id, body)
//   return res.json({
//     message: USERS_MESSAGES.UPDATE_PROFILE_SUCCESS, //meesage.ts thêm  UPDATE_ME_SUCCESS: 'Update me success'
//     result
//   })
// }
