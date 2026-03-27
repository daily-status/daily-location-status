export const outputs = {
  whatIsYourLocation: (name: string) => `שלום! ${name} \n איפה אתה נמצא?`,
  whatIsYourStatus: "מה הסטטוס שלך?",
  doYouWantToAddAnotherStatus: "רוצה לעדכן שוב?",
  reportStatus: "הזנת סטטוס",
  whatIsYourName: "שלום! מה השם שלך?",
  whatIsYourPhoneNumber: "מה המספר טלפון שלך?",
  userWasNotFound: "משתמש לא נמצא, נסה נשנית.",
  successfullyRegistered: "ההרשמה בוצעה בהצלחה!",
  doYouHaveAnyNotes: "יש לך הערות להוסיף?",
  writeYourNote: "הזן את ההערה שלך:",
  invalidLocation: "נא לבחור מיקום מהרשימה.",
  invalidStatus: "נא לבחור בסטטוס מבין שתי האפשרויות.",
  invalidReportInitialization: "בשביל להתחיל אנא ללחוץ על ה\"הזנת סטטוס\".",
  chooseYesOrNo: "נא לבחור בכן או לא.",
  reportSummary: (name: string, location: string, status: string, notes?: string | null) => 
  `ההזנה נקלטה בהצלחה!\nשם: ${name}.\nמיקום: ${location}.\nסטטוס: ${status ? "תקין" : "לא תקין"}.\nהערות: ${notes ?? "ללא"}.`,
}