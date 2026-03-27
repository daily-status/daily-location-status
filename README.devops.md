📌 סיכום מצב – הרצת המערכת ב־Docker

ניסיתי להרים את הפרויקט באמצעות Docker Compose עם ה־frontend וה־backend החדש.

✅ מה עובד כרגע
✔️ docker-compose הוגדר ועובד
✔️ frontend (React + Vite + nginx) עולה תקין
✔️ backend החדש (Node + Prisma) עולה תקין
✔️ MariaDB עולה ומתחבר
✔️ תקשורת בין containers (network) תקינה
✔️ nginx proxy ל־backend עובד
✔️ בעיות build נפתרו:
Prisma 7 (prisma.config.ts)
TypeScript build (הוצאת tests)
dotenv (עבר ל־dependencies)
config YAML לפרונט
baseURL כפול (/api/api)
❌ הבעיה הנוכחית

ה־frontend לא מצליח לעבוד מול ה־backend החדש.

שגיאות שמתקבלות:

Cannot GET /api/snapshot/today
Cannot GET /api/history/dates
🔍 ניתוח

ה־frontend מצפה ל־API עם routes כמו:

/api/snapshot/today
/api/snapshot/:date
/api/history/dates
/api/system/status
/api/people
/api/export/...

אבל ה־backend החדש חושף כרגע רק:

/users
/locations
/location-reports
/health

👉 כלומר יש חוסר התאמה בין ה־frontend ל־backend (API contract mismatch)

⚠️ מסקנה

זו כבר לא בעיית DevOps / Docker.

הבעיה היא:

ה־frontend מחובר ל־API ישן, וה־backend החדש עדיין לא מממש את אותם endpoints

❓ שאלות לצוות הפיתוח
האם ה־backend החדש אמור להחליף לגמרי את הישן?
האם מתוכנן לממש routes תואמים לפרונט הקיים (snapshot / history / people וכו׳)?
או שהכוונה היא לעדכן את ה־frontend לעבוד מול ה־API החדש (users, locations, location-reports)?
🧠 נקודה לגבי DB

כרגע משתמשים ב־MariaDB בגלל:

PrismaMariaDb adapter

אבל לא ברור אם זה:

החלטה סופית
או מצב זמני

(לא נראה שזה קשור לבעיה הנוכחית)

🚀 מצב בפועל
התשתית מוכנה
הכל רץ
הבעיה היחידה היא התאמת API בין FE ↔ BE