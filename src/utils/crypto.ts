import { createHash } from 'crypto'
import dotenv from 'dotenv'
dotenv.config()
//Tạo hàm nhận vào content mã hóa thành SHA256
function sha256(content: string) {
  return createHash('sha256').update(content).digest('hex')
}

//Tạo hàm nhận vào password và mã hóa thành SHA256
export function hashPassword(password: string) {
  return sha256(password + process.env.PASSWORD_SECRET)
}
