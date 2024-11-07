//import các interface của express giúp em mô tả
import e, { Request, Response, NextFunction } from 'express'
import { checkSchema, validationResult } from 'express-validator'
import { JsonWebTokenError, VerifyErrors } from 'jsonwebtoken'
import { capitalize } from 'lodash'
import HTTP_STATUS from '~/constants/httpStatus'
import { USERS_MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errorrs'
import { verifyToken } from '~/utils/jwt'
import { validate } from '~/utils/validation'
import dotenv from 'dotenv'
dotenv.config()
//interface là bộ mô tả
//Middleware là handler có nhiệm vụ kiểm tra các dữ liệu mà người dùng gửi lên thông qua request.
//Middleware đảm nhận vai trò kiểm tra dữ liệu đủ và đúng kiểu

//bây giờ mình sẽ mô phỏng chức năng đăng nhập
//nếu 1 người dùng muốn đăng nhập họ sẽ gửi lên email và password
//thông qua req.body
//sau này sờ cái gì thấy any thì nhớ định nghĩa nó
export const registerValidator = validate(
  checkSchema(
    {
      name: {
        notEmpty: {
          errorMessage: USERS_MESSAGES.NAME_IS_REQUIRED
        },
        isString: {
          errorMessage: USERS_MESSAGES.NAME_MUST_BE_A_STRING
        },
        trim: true,
        isLength: {
          options: { min: 1, max: 100 },
          errorMessage: USERS_MESSAGES.NAME_LENGTH_MUST_BE_FROM_1_TO_100
        }
      },
      email: {
        notEmpty: {
          errorMessage: USERS_MESSAGES.EMAIL_IS_REQUIRED
        },
        isEmail: {
          errorMessage: USERS_MESSAGES.EMAIL_IS_INVALID
        },
        trim: true
      },
      password: {
        notEmpty: {
          errorMessage: USERS_MESSAGES.PASSWORD_IS_REQUIRED
        },
        isString: {
          errorMessage: USERS_MESSAGES.PASSWORD_MUST_BE_A_STRING
        },
        isLength: {
          options: { min: 8, max: 50 },
          errorMessage: USERS_MESSAGES.PASSWORD_LENGTH_MUST_BE_FROM_8_TO_50
        },
        isStrongPassword: {
          options: { minLength: 1, minLowercase: 1, minNumbers: 1, minUppercase: 1, minSymbols: 1 },
          errorMessage: USERS_MESSAGES.PASSWORD_MUST_BE_STRONG
        }
      },
      confirm_password: {
        notEmpty: {
          errorMessage: USERS_MESSAGES.CONFIRM_PASSWORD_IS_REQUIRED
        },
        isString: {
          errorMessage: USERS_MESSAGES.CONFIRM_PASSWORD_MUST_BE_A_STRING
        },
        isLength: {
          options: { min: 8, max: 50 },
          errorMessage: USERS_MESSAGES.CONFIRM_PASSWORD_LENGTH_MUST_BE_FROM_8_TO_50
        },
        isStrongPassword: {
          options: { minLength: 1, minLowercase: 1, minNumbers: 1, minUppercase: 1, minSymbols: 1 },
          errorMessage: USERS_MESSAGES.CONFIRM_PASSWORD_MUST_BE_STRONG
        },
        custom: {
          options: (value, { req }) => {
            if (value !== req.body.password) {
              throw new Error(USERS_MESSAGES.CONFIRM_PASSWORD_MUST_BE_THE_SAME_AS_PASSWORD)
            }
            return true
          }
        }
      },
      date_of_birth: {
        isISO8601: {
          options: { strict: true, strictSeparator: true }
        }
      }
    },
    ['body']
  )
)
//middleware này sẽ kiểm tra xem người dùng có gửi lên email và password không
//middleware KHÔNG ĐƯỢC PHÉP kiểm tra dữ liệu đúng hay không
//chỉ được kiểm tra đủ và đúng định dạng thôi

//viết hàm kiểm tra loginReqBody
export const loginValidator = validate(
  checkSchema(
    {
      email: {
        notEmpty: {
          errorMessage: USERS_MESSAGES.EMAIL_IS_REQUIRED
        },
        isEmail: {
          errorMessage: USERS_MESSAGES.EMAIL_IS_INVALID
        },
        trim: true
      },
      password: {
        notEmpty: {
          errorMessage: USERS_MESSAGES.PASSWORD_IS_REQUIRED
        },
        isString: {
          errorMessage: USERS_MESSAGES.PASSWORD_MUST_BE_A_STRING
        },
        isLength: {
          options: { min: 8, max: 50 },
          errorMessage: USERS_MESSAGES.PASSWORD_LENGTH_MUST_BE_FROM_8_TO_50
        },
        isStrongPassword: {
          options: { minLength: 1, minLowercase: 1, minNumbers: 1, minUppercase: 1, minSymbols: 1 },
          errorMessage: USERS_MESSAGES.PASSWORD_MUST_BE_STRONG
        }
      }
    },
    ['body'] //checkSchema kiểm tra trong body thôi
  )
)

//viết hàm kiểm tra access_token
export const accessTokenValidator = validate(
  checkSchema(
    {
      Authorization: {
        notEmpty: {
          errorMessage: USERS_MESSAGES.ACCESS_TOKEN_IS_REQUIRED
        },
        custom: {
          options: async (value, { req }) => {
            //value này là Authorization: có cấu trúc: Bearer <access_token>
            const access_token = value.split(' ')[1]
            if (!access_token) {
              throw new ErrorWithStatus({
                status: HTTP_STATUS.UNAUTHORIZED, //401
                message: USERS_MESSAGES.ACCESS_TOKEN_IS_REQUIRED
              })
            }

            try {
              //nếu có access_token thì mình sẽ verify nó(xác thực chữ ký)
              const decode_authorization = await verifyToken({
                token: access_token,
                privateKey: process.env.JWT_SECRET_ACCESS_TOKEN as string
              })
              //decode_authorization là payload của access_token đã mã hóa
              //bên trong đó có user_id và token_type ...
              ;(req as Request).decode_authorization = decode_authorization
            } catch (error) {
              throw new ErrorWithStatus({
                status: HTTP_STATUS.UNAUTHORIZED, //401
                message: capitalize((error as JsonWebTokenError).message)
              })
            }
            //nếu oke hết
            return true
          }
        }
      }
    },
    ['headers']
  )
)

//viết hàm kiểm tra refresh_token
export const refreshTokenValidator = validate(
  checkSchema(
    {
      refresh_token: {
        notEmpty: {
          errorMessage: USERS_MESSAGES.REFRESH_TOKEN_IS_REQUIRED
        },
        custom: {
          options: async (value, { req }) => {
            //value này là refresh_token
            try {
              const decode_refresh_token = await verifyToken({
                token: value,
                privateKey: process.env.JWT_SECRET_REFRESH_TOKEN as string
              })
              ;(req as Request).decode_refresh_token = decode_refresh_token
            } catch (error) {
              throw new ErrorWithStatus({
                status: HTTP_STATUS.UNAUTHORIZED, //401
                message: capitalize((error as JsonWebTokenError).message)
              })
            }
            return true
          }
        }
      }
    },
    ['body']
  )
)
//viết hàm kiểm tra email_verify_token
export const emailVerifyTokenValidator = validate(
  checkSchema(
    {
      email_verify_token: {
        trim: true,
        notEmpty: {
          errorMessage: USERS_MESSAGES.EMAIL_VERIFY_TOKEN_IS_REQUIRED
        },
        custom: {
          options: async (value: string, { req }) => {
            //value là email_verify_token luôn, k cần tìm, kiểm tra luôn
            try {
              const decode_email_verify_token = await verifyToken({
                token: value, //value này là email_verify_token
                privateKey: process.env.JWT_SECRET_EMAIL_VERIFY_TOKEN as string
              })
              //nếu mã hóa thành công thì lưu vào req dùng ở các chỗ khác
              ;(req as Request).decode_email_verify_token = decode_email_verify_token
            } catch (error) {
              throw new ErrorWithStatus({
                status: HTTP_STATUS.UNAUTHORIZED, //401
                message: capitalize((error as JsonWebTokenError).message)
              })
            }
            return true
          }
        }
      }
    },
    ['query']
  )
)

//
export const forgotPasswordValidator = validate(
  checkSchema(
    {
      email: {
        notEmpty: {
          errorMessage: USERS_MESSAGES.EMAIL_IS_REQUIRED
        },
        isEmail: {
          errorMessage: USERS_MESSAGES.EMAIL_IS_INVALID
        },
        trim: true
      }
    },
    ['body']
  )
)
