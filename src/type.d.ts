import { Request } from 'express'
import { TokenPayLoad } from './models/requests/users.requests'
//chức năng file type: định nghĩa lại thư viện trong hệ thống nếu cần
declare module 'express' {
  export interface Request {
    decode_authorization?: TokenPayLoad
    decode_refresh_token?: TokenPayLoad
    decode_email_verify_token?: TokenPayLoad
    decode_forgot_password_token?: TokenPayLoad
  }
}
