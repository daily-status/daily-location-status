import { Markup } from "telegraf";

export const mainKeyboard = () => Markup.keyboard([["הזנת סטטוס"]]).resize();

const COLUMNS_THRESHOLD = 2;

export const locationKeyboard = (locationNames: string[]) => {
  const columns = locationNames.length < COLUMNS_THRESHOLD ? 1 : 2;
  const rows: string[][] = [];
  for (let i = 0; i < locationNames.length; i += columns) {
    rows.push(locationNames.slice(i, i + columns));
  }
  return Markup.keyboard(rows).resize();
};


export const statusKeyboard = () => Markup.keyboard([["תקין", "לא תקין"]]).resize();

export const addNotesDialogueKeyboard = () => Markup.keyboard([["כן", "לא"]]).resize();