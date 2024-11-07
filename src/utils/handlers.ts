//file này lưu hàm WrapAsync
//WrapAsync nhận vào 'Req Handler A'
//sau đó trả ra 'Req Handler B' có cấu trúc try catch next

import { NextFunction, Request, RequestHandler, Response } from 'express'

//và chạy 'Req Handler A' trong try
export const wrapAsync = <P, T>(func: RequestHandler<P, any, any, T>) => {
  return async (req: Request<P, any, any, T>, res: Response, next: NextFunction) => {
    try {
      await func(req, res, next)
    } catch (error) {
      next(error)
    }
  }
}
