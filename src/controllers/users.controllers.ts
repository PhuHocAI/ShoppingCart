import e, { NextFunction, Request, Response } from 'express'
import {
  LoginReqBody,
  LogoutReqBody,
  RegisterReqBody,
  TokenPayLoad,
  VerifyEmailReqQuery
} from '~/models/requests/users.requests'
import usersServices from '~/services/users.services'
import { ParamsDictionary } from 'express-serve-static-core'
import { ErrorWithStatus } from '~/models/Errorrs'
import HTTP_STATUS from '~/constants/httpStatus'
import { USERS_MESSAGES } from '~/constants/messages'
import { UserVerifyStatus } from '~/constants/enums'
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
