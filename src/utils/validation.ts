//Viết hàm validate nhận vào checkSchema và trả về 1 middleware xử lý lỗi
//Ai gọi validate(checkSchema) thì sẽ nhận được 1 middleware

import { ValidationChain, validationResult } from 'express-validator'
import { RunnableValidationChains } from 'express-validator/lib/middlewares/schema'
import { Request, Response, NextFunction } from 'express'
import { EntityError, ErrorWithStatus } from '~/models/Errorrs'
import HTTP_STATUS from '~/constants/httpStatus'
//Viết hàm
export const validate = (validation: RunnableValidationChains<ValidationChain>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await validation.run(req) //ghi lỗi vào req
    const errors = validationResult(req) //lấy lỗi từ req
    if (errors.isEmpty()) {
      return next()
    } else {
      const errorObject = errors.mapped()
      const entityError = new EntityError({ errors: {} })
      for (const key in errorObject) {
        //xử lý trong 1 đám lỗi 422 thì có 1 lỗi đặc biệt khác 422
        const { msg } = errorObject[key]
        if (msg instanceof ErrorWithStatus && msg.status != HTTP_STATUS.UNPROCESSABLE_ENTITY) {
          return next(msg)
        }
        entityError.errors[key] = msg
      }
      next(entityError)
    }
  }
}
