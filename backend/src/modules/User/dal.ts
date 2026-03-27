import { PrismaClient } from "@prisma/client";
import { DBUser, PlainUser } from "./types";
import {
  AlreadyExistsError,
  NotFoundError,
  ValidationError,
} from "../../utils/errors/client";

export class UserDal {
  private model;
  private reportModel;
  constructor(prisma: PrismaClient) {
    this.model = prisma.user;
    this.reportModel = prisma.locationReport;
  }

  getAllUsers = (): Promise<DBUser[]> => this.model.findMany();

  getUserById = async (id: number): Promise<DBUser> => {
    const user = await this.model.findUnique({ where: {id} });

    if(!user) {
        throw new NotFoundError('user', id.toString());
    }

    return user;
  }

  updateUser = async ({id, fullName, phone, telegramUserId}: Partial<PlainUser> & { id: number, telegramUserId?: string}) => {
    await this.getUserById(id);

    await this.model.update({where: {id}, data: {fullName, phone, telegramUserId}});
  }

  addUser = async ({ fullName, phone }: { fullName: string; phone: string }) => {
    const existingUser = await this.model.findUnique({ where: { phone } });

    if (existingUser) {
      throw new AlreadyExistsError("User", "phone", phone);
    }

    return this.model.create({ data: { fullName, phone } });
  };

  getUserByNameAndPhone = async ({ fullName, phone }: { fullName: string; phone: string }) => {
    return await this.model.findUnique({ where: { fullName, phone } });
  };
  
  addUsersFromExcel = async (users: PlainUser[]) => {
    if (users.length === 0) {
      return { count: 0 };
    }
    return await this.model.createMany({
      data: users,
      skipDuplicates: true,
    });
  };

  deleteUser = async (id: number): Promise<void> => {
    await this.getUserById(id);

    const relatedReportsCount = await this.reportModel.count({
      where: { userId: id },
    });

    if (relatedReportsCount > 0) {
      throw new ValidationError(
        "לא ניתן למחוק משתמש שכבר קיים בדיווחים. מחק או ערוך קודם את הדיווחים המשויכים אליו."
      );
    }

    await this.model.delete({ where: { id } });
  };
}
