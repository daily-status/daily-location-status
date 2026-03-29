import { apiRequest } from "./base";

export type BotInfo = {
    username: string;
}

export const getBotInfo = () => apiRequest<BotInfo>('/bot-info')
