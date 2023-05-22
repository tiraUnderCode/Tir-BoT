import { connectToWhatsApp } from "./whatsapp";
import ytdl from 'ytdl-core';
import { ask } from './gpt3';
import { sendMessage } from './whatsapp'; // استبدال "whatsapp" بالاسم الصحيح لملف الـ "sendMessage"
import fs from 'fs';

(async () => {
  const conn = await connectToWhatsApp();
  console.log('Bot is connected to WhatsApp');

  if (conn) {
    conn.on('message', async (message) => {
      try {
        if (message.mimetype === 'application/octet-stream' && message.caption?.startsWith('!youtube')) {
          const videoUrl = message.body;
          const videoInfo = await ytdl.getInfo(videoUrl);
          const videoFormat = ytdl.chooseFormat(videoInfo.formats, { quality: 'highest' });

          if (videoFormat) {
            const videoReadableStream = ytdl.downloadFromInfo(videoInfo, { format: videoFormat });

            const filename = `${videoInfo.title}.${videoFormat.container}`;
            const path = `./videos/${filename}`; // تحديد مسار حفظ الفيديو

            videoReadableStream.pipe(fs.createWriteStream(path));

            videoReadableStream.on('end', () => {
              console.log('Video downloaded successfully');
              const replyMessage = `Video downloaded: ${filename}`;

              sendMessage(message.from, replyMessage); // إرسال رسالة الرد بعد تنزيل الفيديو
            });
          }
        }
      } catch (error) {
        console.error('Error:', error);
      }
    });
  }
})();
