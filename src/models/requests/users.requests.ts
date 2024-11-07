import { JwtPayload } from 'jsonwebtoken'
import { TokenType } from '~/constants/enums'
import { ParsedQs } from 'qs'
//file này lưu các định nghĩa của các Request
export interface RegisterReqBody {
  name: string
  email: string
  password: string
  confirm_password: string
  date_of_birth: string
}
export interface LoginReqBody {
  email: string
  password: string
}
export interface TokenPayLoad extends JwtPayload {
  user_id: string
  token_type: TokenType
}
export interface LogoutReqBody {
  refresh_token: string
}
export interface VerifyEmailReqQuery extends ParsedQs {
  email_verify_token: string
}
