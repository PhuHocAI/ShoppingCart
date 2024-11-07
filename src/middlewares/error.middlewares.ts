import { NextFunction, Response, Request } from 'express'
import { omit } from 'lodash'
import HTTP_STATUS from '~/constants/httpStatus'
import { ErrorWithStatus } from '~/models/Errorrs'

export const defaultErrorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  //lỗi của toàn bộ hệ thống sẽ đổ về đây
  //lỗi chỉ có 2 dạng là ErrorWithStatus và lỗi qua lệnh throw
  if (error instanceof ErrorWithStatus) {
    res.status(error.status).json(omit(error, ['status']))
  } else {
    //lỗi khác ErrorWithStatus nghĩa là lỗi bth, lỗi k có status
    //lỗi có tùm lum thứ stack, name, k có status (lỗi rớt mạng, tạo token bug,...)
    Object.getOwnPropertyNames(error).forEach((key) => {
      Object.defineProperty(error, key, {
        enumerable: true
      })
    })
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: error.message,
      errorInfor: omit(error, ['stack'])
    })
  }
}
//lỗi không định nghĩa được
