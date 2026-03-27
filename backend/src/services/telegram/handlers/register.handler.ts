import { Telegraf } from "telegraf";
import { MyBotContext } from "../TelegramBot";
import { UserDal } from "../../../modules/User/dal";
import { mainKeyboard } from "../keyboards";
import { steps } from "../consts/step.consts";
import { outputs } from "../consts/output.consts";

export const registerHandler = (bot: Telegraf<MyBotContext>, userDal: UserDal) => {

    bot.start((ctx) => {
        ctx.session.step = steps.WAITING_FOR_FULL_NAME;
        return ctx.reply(outputs.whatIsYourName);
    });

    bot.on("text", async (ctx, next) => {
        console.log("text");
        const step = ctx.session.step;

        if (!ctx.session.step) return next();
        
        if(step === steps.WAITING_FOR_FULL_NAME) {
            ctx.session.fullName = ctx.message.text;
            ctx.session.step = steps.WAITING_FOR_PHONE_NUMBER;
            return ctx.reply(outputs.whatIsYourPhoneNumber)
        }

        if(step === steps.WAITING_FOR_PHONE_NUMBER) {
            ctx.session.phone = ctx.message.text;

            const user = await userDal.getUserByNameAndPhone( {fullName: ctx.session.fullName!, phone: ctx.session.phone!});

            if(!user){
                ctx.session.step = steps.WAITING_FOR_FULL_NAME;
                ctx.reply(outputs.userWasNotFound);
                ctx.reply(outputs.whatIsYourName);
                return;
            }

            ctx.session.userId = user.id;

            await userDal.updateUser({id: user.id, telegramUserId: ctx.message.from.id.toString()});

            ctx.session.step = steps.WAITING_FOR_STATUS_REPORT;

            return ctx.reply(outputs.successfullyRegistered, mainKeyboard());
        }

        return next();
    });

};