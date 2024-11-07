import { Collection, Db, MongoClient } from 'mongodb'
import dotenv from 'dotenv'
import User from '~/models/schemas/User.schema'
import RefreshToken from '~/models/schemas/RefreshToken.schema'
//file .env không import được nên phải dùng thư viện dotenv
dotenv.config() //hành động này có nghĩa là kết nối với file .env
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@shoppingcardprojectclus.5goh7.mongodb.net/?retryWrites=true&w=majority&appName=shoppingCardProjectCluster`

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
class DatabaseServices {
  //client đang ám chỉ backend
  private client: MongoClient
  private db: Db
  constructor() {
    this.client = new MongoClient(uri)
    this.db = this.client.db(process.env.DB_NAME)
  }

  async connect() {
    try {
      // Send a ping to confirm a successful connection
      await this.db.command({ ping: 1 })
      console.log('Pinged your deployment. You successfully connected to MongoDB!')
    } catch (error) {
      console.log(error)
      throw error
    }
  }
  //dir là hệ thống báo lỗi chính
  //accessor property
  get users(): Collection<User> {
    //Nằm ở kinh nghiệm
    return this.db.collection(process.env.DB_USERS_COLLECTION as string)
    //Không được phép dùng template string vì nó sẽ bị lỗi, nếu xuất hiện undefined thì vô tình tạo ra 1 cái chuỗi undefined
  }
  get refresh_tokens(): Collection<RefreshToken> {
    return this.db.collection(process.env.DB_REFRESH_TOKENS_COLLECTION as string)
  }
}
//Không nên export cả 1 class ra mà chỉ export 1 instance của class đó
//tạo bản thể instance của class DatabaseServices
export const databaseServices = new DatabaseServices()
//đây là dependency injection design pattern
export default DatabaseServices
