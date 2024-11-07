import User from '~/models/schemas/User.schema'
import { databaseServices } from './database.services'
import { LoginReqBody, RegisterReqBody } from '~/models/requests/users.requests'
import { hashPassword } from '~/utils/crypto'
import { signToken } from '~/utils/jwt'
import { TokenType, UserVerifyStatus } from '~/constants/enums'
import dotenv from 'dotenv'
import { ErrorWithStatus } from '~/models/Errorrs'
import HTTP_STATUS from '~/constants/httpStatus'
import { USERS_MESSAGES } from '~/constants/messages'
import RefreshToken from '~/models/schemas/RefreshToken.schema'
import { ObjectId } from 'mongodb'
dotenv.config()

class UsersServices {
  private signAccessToken(user_id: string) {
    return signToken({
      payload: { user_id, token_type: TokenType.AccessToken },
      privateKey: process.env.JWT_SECRET_ACCESS_TOKEN as string,
      options: { expiresIn: process.env.ACCESS_TOKEN_EXPIRE_IN }
    })
  }
  private signRefreshToken(user_id: string) {
    return signToken({
      payload: { user_id, token_type: TokenType.RefreshToken },
      privateKey: process.env.JWT_SECRET_REFRESH_TOKEN as string,
      options: { expiresIn: process.env.REFRESH_TOKEN_EXPIRE_IN }
    })
  }
  private signEmailVerifyToken(user_id: string) {
    return signToken({
      payload: { user_id, token_type: TokenType.EmailVerificationToken },
      privateKey: process.env.JWT_SECRET_EMAIL_VERIFY_TOKEN as string,
      options: { expiresIn: process.env.EMAIL_VERIFY_TOKEN_EXPIRE_IN }
    })
  }
  private signForgotPasswordToken(user_id: string) {
    return signToken({
      payload: { user_id, token_type: TokenType.ForgotPasswordToken },
      privateKey: process.env.JWT_SECRET_FORGOT_PASSWORD_TOKEN as string,
      options: { expiresIn: process.env.FORGOT_PASSWORD_TOKEN_EXPIRE_IN }
    })
  }
  async checkEmailExist(email: string) {
    //không có chơi kiểu kéo database về để kiểm tra vì sẽ bị lộ user
    //dùng email lên database kiểm tra xem email đã tồn tại chưa
    const user = await databaseServices.users.findOne({ email })
    return Boolean(user)
  }
  async checkRefreshToken({ user_id, refresh_token }: { user_id: string; refresh_token: string }) {
    const refreshToken = await databaseServices.refresh_tokens.findOne({
      user_id: new ObjectId(user_id),
      token: refresh_token
    })
    if (!refreshToken) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNAUTHORIZED,
        message: USERS_MESSAGES.REFRESH_TOKEN_IS_INVALID
      })
    }
    return refreshToken
  }
  async checkEmailVerifyToken({
    user_id,
    email_verify_token
  }: {
    user_id: string //
    email_verify_token: string
  }) {
    //tìm user bằng user_id và email_verify_token
    const user = await databaseServices.users.findOne({
      _id: new ObjectId(user_id),
      email_verify_token
    })
    if (!user) {
      throw new ErrorWithStatus({
        //thường nên chửi ở controller
        //Lý do thứ 2: Hàm tên là CHECK... (Kiểm tra)
        status: HTTP_STATUS.NOT_FOUND, //404
        message: USERS_MESSAGES.USER_NOT_FOUND
      })
    }
    return user
  }

  async findUserById(user_id: string) {
    return await databaseServices.users.findOne({ _id: new ObjectId(user_id) })
  }
  async findUserByEmail(email: string) {
    return await databaseServices.users.findOne({ email })
  }

  async register(payLoad: RegisterReqBody) {
    const user_id = new ObjectId()
    const email_verify_token = await this.signEmailVerifyToken(user_id.toString())
    //code logic here
    const result = await databaseServices.users.insertOne(
      new User({
        _id: user_id,
        email_verify_token,
        ...payLoad,
        password: hashPassword(payLoad.password),
        date_of_birth: new Date(payLoad.date_of_birth)
      })
    )
    //Tạo as và rf token
    const [access_token, refresh_token] = await Promise.all([
      this.signAccessToken(user_id.toString()),
      this.signRefreshToken(user_id.toString())
    ])
    //gửi qua email
    console.log(`
        Nội dung Email xác thực Email gồm: 
        http://localhost:3000/users/verify-email/?email_verify_token=${email_verify_token}
      `)

    //lưu refresh token vào database
    await databaseServices.refresh_tokens.insertOne(
      new RefreshToken({
        token: refresh_token,
        user_id: new ObjectId(user_id)
      })
    )

    return {
      access_token,
      refresh_token
    }
  }
  async login({ email, password }: LoginReqBody) {
    //dùng email và password để tìm user
    const user = await databaseServices.users.findOne({ email, password: hashPassword(password) })
    if (!user) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY, //422
        message: USERS_MESSAGES.EMAIL_OR_PASSWORD_IS_INCORRECT
      })
    }
    //nếu có user thì tạo as và rf token
    const user_id = user._id.toString()
    const [access_token, refresh_token] = await Promise.all([
      this.signAccessToken(user_id),
      this.signRefreshToken(user_id)
    ])
    //lưu refresh token vào database
    await databaseServices.refresh_tokens.insertOne(
      new RefreshToken({
        token: refresh_token,
        user_id: new ObjectId(user_id)
      })
    )
    return {
      access_token,
      refresh_token
    }
  }
  async logout(refresh_token: string) {
    await databaseServices.refresh_tokens.deleteOne({ token: refresh_token })
  }
  async verifyEmail(user_id: string) {
    //dùng user_id để tìm và cập nhật
    await databaseServices.users.updateOne({ _id: new ObjectId(user_id) }, [
      {
        $set: {
          verify: UserVerifyStatus.Verified,
          email_verify_token: '',
          updated_at: '$$NOW'
        }
      }
    ])
    //tạo as và rf token
    const [access_token, refresh_token] = await Promise.all([
      this.signAccessToken(user_id),
      this.signRefreshToken(user_id)
    ])
    //lưu refresh token vào database
    await databaseServices.refresh_tokens.insertOne(
      new RefreshToken({
        token: refresh_token,
        user_id: new ObjectId(user_id)
      })
    )
    return {
      access_token,
      refresh_token
    }
  }
  async resendEmailVerify(user_id: string) {
    //ký
    const email_verify_token = await this.signEmailVerifyToken(user_id)
    //lưu
    await databaseServices.users.updateOne({ _id: new ObjectId(user_id) }, [
      {
        $set: {
          email_verify_token,
          updated_at: '$$NOW'
        }
      }
    ])
    //gửi qua email
    console.log(`
        Nội dung Email xác thực Email gồm: 
        http://localhost:3000/users/verify-email/?email_verify_token=${email_verify_token}
    `)
  }
  async forgotPassword(email: string) {
    const user = await databaseServices.users.findOne({ email }) //dùng email để tìm user
    if (user) {
      const user_id = user._id
      const forgot_password_token = await this.signForgotPasswordToken(user_id.toString())
      //lưu
      await databaseServices.users.updateOne({ _id: user_id }, [
        {
          $set: {
            forgot_password_token: forgot_password_token,
            updated_at: '$$NOW'
          }
        }
      ])

      //gửi qua email
      console.log(`
        Bấm vô đây để đổi mật khẩu: 
          http://localhost:8000/reset-password/?forgot_password_token=${forgot_password_token}
      `)
    }
  }
}
const usersServices = new UsersServices()
export default usersServices
