import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
  ) {}

  /**
   * Create a new user in the database
   */
  public async createUser(userData: Partial<User>): Promise<User> {
    const newUser = new this.userModel(userData);
    return await newUser.save();
  }

  /**
   * Find a user by their unique email address
   */
  public async findOneByEmail(email: string): Promise<User | null> {
    return await this.userModel.findOne({ email: email.toLowerCase() });
  }

  /**
   * Find a single user by MongoDB _id
   */
  public async findOneById(id: string): Promise<User | null> {
    return await this.userModel.findById(id);
  }

  /**
   * Find a user by ID or throw NotFoundException
   */
  public async findOneByIdOrThrow(id: string): Promise<User> {
    const user = await this.findOneById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} was not found.`);
    }
    return user;
  }

  /**
   * Update an existing user by ID
   */
  public async updateUser(
    id: string,
    updateData: Partial<User>,
  ): Promise<User | null> {
    return await this.userModel.findByIdAndUpdate(id, updateData, { new: true });
  }

  /**
   * Get paginated list of users
   */
  public async findAll(limit: number = 10, page: number = 1) {
    const skip = (page - 1) * limit;

    const [users, totalCount] = await Promise.all([
      this.userModel
        .find()
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      this.userModel.countDocuments(),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: users,
      meta: {
        totalItems: totalCount,
        itemCount: users.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
      },
    };
  }
}
