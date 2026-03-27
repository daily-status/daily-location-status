import { LocationDal } from "../../modules/Location/dal";
import { LocationReportDal } from "../../modules/LocationReport/dal";
import { UserDal } from "../../modules/User/dal";
import { Context, Telegraf, session } from "telegraf";
import { reportHandler } from "./handlers/report.handler";
import { registerHandler } from "./handlers/register.handler";

type MyBotSession = {
  step?: string;
  fullName?: string;
  userId?: number;
  phone?: string;
  locationId?: number;
  notes?: string | null;
  isStatusOk?: boolean;
};

export type MyBotContext = Context & { session: MyBotSession };

export class TelegramBot {
  private bot: Telegraf<MyBotContext>;

  constructor(
    private userDal: UserDal,
    private locationDal: LocationDal,
    private locationReportDal: LocationReportDal,
    token: string,
  ) {
    this.bot = new Telegraf(token);
    this.bot.use(session({
      defaultSession: (): MyBotSession => ({}),
    }));

    registerHandler(this.bot, this.userDal);
    reportHandler(this.bot, this.userDal, this.locationDal, this.locationReportDal);
  }
  public async launch() {
    await this.bot.launch();
  };

  public async stop() {
    await this.bot.stop();
  };

  public async restart() {
    await this.stop();
    await this.launch();
  };
}
