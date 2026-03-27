import { Telegraf } from "telegraf";
import { MyBotContext } from "../TelegramBot";
import { UserDal } from "../../../modules/User/dal";
import { LocationDal } from "../../../modules/Location/dal";
import { LocationReportDal } from "../../../modules/LocationReport/dal";
import { addNotesDialogueKeyboard, locationKeyboard, mainKeyboard, statusKeyboard } from "../keyboards";
import { outputs } from "../consts/output.consts";
import { inputs } from "../consts/inputs.consts";
import { steps } from "../consts/step.consts";


export const reportHandler = async (bot: Telegraf<MyBotContext>, userDal: UserDal, locationDal: LocationDal, locationReportDal: LocationReportDal) => {
    bot.hears(outputs.reportStatus, async (ctx) => {
        ctx.session.step = steps.WAITING_FOR_LOCATION;
        const locations = await locationDal.getAllLocations();
        const locationNames = locations.map((l) => l.name);
        return ctx.reply(outputs.whatIsYourLocation(ctx.session.fullName!), locationKeyboard(locationNames));
    });

    bot.hears([inputs.ok, inputs.notOk], async (ctx) => {
        if(ctx.session.step !== steps.WAITING_FOR_STATUS) return;

        ctx.session.isStatusOk = ctx.message.text === inputs.ok;

        ctx.session.step = steps.WAITING_FOR_NOTES;

        return ctx.reply(outputs.doYouHaveAnyNotes, addNotesDialogueKeyboard());
    });

    bot.hears([inputs.yes, inputs.no], async (ctx) => {
        if (ctx.session.step !== steps.WAITING_FOR_NOTES) return;

        if (ctx.message.text === inputs.yes) {
            ctx.session.step = steps.WAITING_FOR_NOTES_TEXT;
            return ctx.reply(outputs.writeYourNote, {reply_markup: {remove_keyboard: true}});
        }

        ctx.session.notes = undefined;
        await locationReportDal.addReport({
            userId: ctx.session.userId!,
            locationId: ctx.session.locationId!,
            occurredAt: new Date(),
            isStatusOk: ctx.session.isStatusOk!,
            notes: null,
            source: "bot",
        });

        ctx.session.step = steps.WAITING_FOR_STATUS_REPORT;
        const location = await locationDal.getLocationById(ctx.session.locationId!);
        await ctx.reply(outputs.reportSummary(ctx.session.fullName!, location?.name, (ctx.session.isStatusOk ? inputs.ok : inputs.notOk), ctx.session.notes))
        return ctx.reply(outputs.doYouWantToAddAnotherStatus, mainKeyboard());
    });


    bot.on("text", async (ctx) => {
        if (ctx.session.step === steps.WAITING_FOR_LOCATION) {
            const locations = await locationDal.getAllLocations();
            const locationNames = locations.map((l) => l.name);
            const location = locations.find((l) => l.name === ctx.message.text);
            if (!location) {
            return ctx.reply(outputs.invalidLocation, locationKeyboard(locationNames));
            }
            ctx.session.locationId = location.id;
            ctx.session.step = steps.WAITING_FOR_STATUS;
            return ctx.reply(outputs.whatIsYourStatus, statusKeyboard());
        }

        if (ctx.session.step === steps.WAITING_FOR_NOTES) {
            if (ctx.message.text !== inputs.yes && ctx.message.text !== inputs.no) {
                await ctx.reply(outputs.chooseYesOrNo)
                ctx.reply(outputs.doYouHaveAnyNotes, addNotesDialogueKeyboard());
            }
        }

        if (ctx.session.step === steps.WAITING_FOR_STATUS_REPORT) {
            if (ctx.message.text !== outputs.reportStatus) {
                ctx.reply(outputs.invalidReportInitialization, mainKeyboard());
            }
        }

        if (ctx.session.step === steps.WAITING_FOR_STATUS) {
            if (ctx.message.text !== inputs.ok && ctx.message.text !== inputs.notOk) {
                await ctx.reply(outputs.invalidStatus)
                ctx.reply(outputs.whatIsYourStatus, statusKeyboard());
            }
        }

        if (ctx.session.step === steps.WAITING_FOR_NOTES_TEXT) {
            ctx.session.notes = ctx.message.text;
            await locationReportDal.addReport({
            userId: ctx.session.userId!,
            locationId: ctx.session.locationId!,
            occurredAt: new Date(),
            isStatusOk: ctx.session.isStatusOk!,
            notes: ctx.session.notes,
            source: "bot",
        });
        ctx.session.step = steps.WAITING_FOR_STATUS_REPORT;
        const location = await locationDal.getLocationById(ctx.session.locationId!);
        await ctx.reply(outputs.reportSummary(ctx.session.fullName!, location?.name, (ctx.session.isStatusOk ? inputs.ok : inputs.notOk), ctx.session.notes))
        return ctx.reply(outputs.doYouWantToAddAnotherStatus, mainKeyboard());
    }
});
}