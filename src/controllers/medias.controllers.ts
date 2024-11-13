import { NextFunction, Request, Response } from 'express'
import HTTP_STATUS from '~/constants/httpStatus'
import path from 'path'
import formidable from 'formidable'

export const uploadSingleImageController = async (req: Request, res: Response, next: NextFunction) => {
  //__dirname: đường dẫn tuyệt đối của file hiện tại
  //path.resolve('uploads'): đường dẫn mà mình mong muốn lưu file vào
  //set up tấm lưới chặn file bằng formidable
  const form = formidable({
    maxFiles: 1, //tối đa 1 file thôi
    maxFileSize: 300 * 1024, //300kb
    keepExtensions: true, //giữ lại đuôi file để biết nó định dạng là gì
    uploadDir: path.resolve('uploads')
  })
  //ép req phải đi qua cái lưới
  form.parse(req, (err, fields, files) => {
    if (err) {
      throw err
    } else {
      //xử lý file
      res.status(HTTP_STATUS.OK).json({
        message: 'Upload image successfully'
      })
    }
    //files: là object chứa thông tin của file
    //file: là key của file
  })
}
