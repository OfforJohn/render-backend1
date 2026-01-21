npx prisma init
clear
npx prisma init
{   "type": "module",;   "engines": {;     "node": "18.x";   },;   "scripts": {;     "start": "nodemon server.mjs";   },;   "dependencies": {;     "@prisma/client": "^4.14.0",;     "cors": "^2.8.5",;     "crypto": "^1.0.1",;     "dotenv": "^16.0.3",;     "express": "^4.18.2",;     "multer": "^1.4.5-lts.1",;     "nodemon": "^2.0.20",;     "prisma": "^4.14.0",;     "socket.io": "^4.6.1",;     "ts-node": "^10.9.1",;     "typescript": "^4.8.4";   }
}
{   "type": "module",;   "engines": {;     "node": "18.x";   },;   "scripts": {;     "start": "nodemon server.mjs";   },;   "dependencies": {;     "@prisma/client": "^4.14.0",;     "cors": "^2.8.5",;     "crypto": "^1.0.1",;     "dotenv": "^16.0.3",;     "express": "^4.18.2",;     "multer": "^1.4.5-lts.1",;     "nodemon": "^2.0.20",;     "prisma": "^4.14.0",;     "socket.io": "^4.6.1",;     "ts-node": "^10.9.1",;     "typescript": "^4.8.4";   }
}
npx prisma init
npx prisma init
npx prisma init
npx prisma init
npm set engine-strict false
npx prisma init
npm install prisma --no-engine-strict
npx prisma init
npx prisma init
npx prisma generate
nvm install 18
nvm use 18
npx prisma generate
npm install @prisma/client@5.13.0 prisma@5.13.0
npm install @prisma/client@5.13.0 prisma@5.13.0
npx prisma generate
npx prisma init   
npx prisma generate
npx prisma generate
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema
generator client {
  provider = "prisma-client-js"
}
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
model User {
  id Int @id @default(autoincrement()) 
  email String @unique
  name String
  profilePicture String @default("")
  about String @default("")
  sentMessages Messages[] @relation("sentMessages")
  recievedMessages Messages[] @relation("recievedMessages")
}
model Messages {
  id Int @id @default(autoincrement())
  sender User @relation("sentMessages",fields:[senderId],references: [id])
  senderId Int
  reciever User @relation("recievedMessages", fields: [recieverId],references: [id])
  recieverId Int
  type String @default("text")
  message String
  messageStatus String @default("sent")
  createdAt DateTime @default(now())
}
 npx prisma generate
npx prisma db push
npx prisma db push
npx prisma db push
npx prisma generate
npx prisma db push
npx prisma studio
mysql -h mysql-299ea3db-offorchukwuebuka3-13f8.f.aivencloud.com -P 15561 -u  avnadmin-p defaultdb
mysql -h mysql-299ea3db-offorchukwuebuka3-13f8.f.aivencloud.com -P 15561 -u  avnadmin-p defaultdb
mysql -h mysql-299ea3db-offorchukwuebuka3-13f8.f.aivencloud.com -P 15561 -u avnadmin -p defaultdb
mysql -h mysql-299ea3db-offorchukwuebuka3-13f8.f.aivencloud.com -P 15561 -u avnadmin -p defaultdb
mysql -h mysql-299ea3db-offorchukwuebuka3-13f8.f.aivencloud.com       -P 15561       -u avnadmin       -p       --ssl-mode=REQUIRED       defaultdb
mysql -h mysql-299ea3db-offorchukwuebuka3-13f8.f.aivencloud.com       -P 15561       -u avnadmin       -p       --ssl-mode=REQUIRED       defaultdb
npx prisma migrate dev --name remove-auto-increment
npx prisma migrate dev --name remove-auto-increment
npx prisma migrate dev --name remove-auto-increment
npx prisma migrate dev --name remove-auto-increment
npx prisma migrate dev --name remove-auto-increment
npx prisma migrate dev --name add-auto-increment-to-user-id
npx prisma migrate dev --name add-auto-increment-to-user-id
npx prisma migrate reset
npx prisma migrate reset
npx prisma migrate reset
npx prisma migrate dev --name make-profilePicture-text
npx prisma migrate dev --name make-profilePicture-text
npx prisma migrate dev --name make-profilePicture-text
npx prisma migrate reset
npx prisma migrate reset
npx prisma migrate reset --force
npx prisma migrate dev --name update_profilePicture_column
npx prisma migrate resolve --applied "20250507222907_remove_auto_increment"
npx prisma migrate dev
ALTER TABLE Messages DROP FOREIGN KEY Messages_senderId_fkey;
npx prisma migrate dev --name add-auto-increment-to-user-id
npx prisma migrate reset
npx prisma migrate reset
mysql -h mysql-299ea3db-offorchukwuebuka3-13f8.f.aivencloud.com       -P 15561       -u avnadmin       -p       --ssl-mode=REQUIRED       defaultdb
mysql -h mysql-299ea3db-offorchukwuebuka3-13f8.f.aivencloud.com       -P 15561       -u avnadmin       -p       --ssl-mode=REQUIRED       defaultdb
npx prisma migrate dev --name init
mysql -h mysql-299ea3db-offorchukwuebuka3-13f8.f.aivencloud.com       -P 15561       -u avnadmin       -p       --ssl-mode=REQUIRED       defaultdb
npx prisma db push
npx prisma migrate dev --name init
cd prisma/migrations
ls
rm -rf 20250507222907_remove_auto_increment
npx prisma migrate dev --name init
cd..
npx prisma migrate dev --name init
npx prisma migrate dev --name init
rm -rf prisma/migrations
rm -rf prisma/migrations
npx prisma migrate reset
npx prisma migrate reset
npx prisma db push
npx prisma migrate dev --name init
npx prisma migrate dev --name init
npm install @faker‑js/faker
npx prisma studio
npx prisma studio
npx prisma migrate reset
npx prisma migrate reset
npx prisma migrate dev --name change-profilePicture-to-text
npx prisma migrate dev --name fix-profile-picture-text-default
rm -rf prisma/migrations/20250519150018_change_profile_picture_to_text
rm -rf prisma/migrations/20250519150018_change_profile_picture_to_text
rm -rf prisma/migrations/20250519150018_change_profile_picture_to_text
npx prisma migrate dev --name profile-picture-to-text
npx prisma migrate dev --name profile-picture-to-text
npx prisma db push
npx prisma migrate reset
npx prisma migrate reset
npx prisma migrate reset
npx prisma migrate reset
npx prisma migrate reset
npx prisma migrate dev --name add_bot_replies
npx prisma db reset
npx prisma db reset
npx prisma migrate reset
npx prisma migrate reset
npx prisma migrate reset
npx prisma migrate reset
npx prisma migrate reset
npx prisma migrate reset
npx prisma migrate dev --name addPhoneNumberToUser
npx prisma migrate reset
npx prisma migrate reset
npx prisma migrate dev --name add_bot_reply
npx prisma generate
npx prisma generate
npx prisma migrate dev --name add-bot-reply
npx prisma generate
npx prisma migrate dev --name add-bot-reply
npx prisma db push
npx prisma migrate reset
npx prisma migrate reset
npx prisma db push
npx prisma generate
