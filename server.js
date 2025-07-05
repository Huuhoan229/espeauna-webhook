// Import các thư viện cần thiết
const express = require('express'); // Framework web cho Node.js
const bodyParser = require('body-parser'); // Middleware để xử lý body của request
const axios = require('axios'); // Thư viện để thực hiện HTTP requests (gọi API)
require('dotenv').config(); // Tải các biến môi trường từ file .env

// Khởi tạo ứng dụng Express
const app = express();
// Sử dụng middleware bodyParser để phân tích các request body dưới dạng JSON
app.use(bodyParser.json());

// Lấy các biến môi trường từ file .env hoặc từ cấu hình của Railway
// Đảm bảo rằng bạn đã định nghĩa các biến này trong môi trường của mình
const VERIFY_TOKEN = process.env.VERIFY_TOKEN; // Token xác minh cho webhook của Facebook
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN; // Mã truy cập trang Facebook của bạn
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Khóa API của Gemini

// ✅ Endpoint để xác minh Webhook của Facebook
// Facebook sẽ gửi một yêu cầu GET đến URL này để xác nhận server của bạn
app.get('/webhook', (req, res) => {
  // Lấy các tham số từ yêu cầu GET của Facebook
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Kiểm tra xem mode và token có khớp không
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    // Nếu khớp, in thông báo và gửi lại challenge token cho Facebook
    console.log('✅ Webhook xác minh thành công!');
    return res.status(200).send(challenge);
  } else {
    // Nếu không khớp, trả về lỗi 403 Forbidden
    console.error('❌ Xác minh webhook thất bại: Token không khớp hoặc mode sai.');
    return res.sendStatus(403);
  }
});

// 📩 Endpoint để xử lý các sự kiện (tin nhắn) từ Messenger
// Facebook sẽ gửi các sự kiện POST đến URL này
app.post('/webhook', async (req, res) => {
  const body = req.body; // Lấy toàn bộ body của yêu cầu POST

  // Kiểm tra xem sự kiện có phải từ một trang Facebook không
  if (body.object === 'page') {
    // Lặp qua từng mục nhập (entry) trong sự kiện webhook
    for (const entry of body.entry) {
      // Lấy sự kiện tin nhắn đầu tiên trong mảng messaging
      const webhook_event = entry.messaging[0];
      // Lấy PSID (Page-scoped ID) của người gửi tin nhắn
      const sender_psid = webhook_event.sender.id;

      // Kiểm tra xem sự kiện có phải là một tin nhắn văn bản không
      if (webhook_event.message && webhook_event.message.text) {
        const userMessage = webhook_event.message.text; // Lấy nội dung tin nhắn của người dùng
        console.log(`Tin nhắn từ người dùng (${sender_psid}): "${userMessage}"`);

        let geminiReplyText = "Xin lỗi, tôi không thể xử lý yêu cầu của bạn lúc này. Vui lòng thử lại sau.";

        try {
          // Xây dựng URL cho Gemini API
          // Sử dụng mô hình gemini-2.0-flash cho tốc độ phản hồi nhanh
          const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
          
          // Gửi yêu cầu POST đến Gemini API với tin nhắn của người dùng
          const geminiResponse = await axios.post(geminiApiUrl, {
            // Cấu trúc request body theo yêu cầu của Gemini API
            contents: [{ 
              role: "user", 
              parts: [{ text: userMessage }] 
            }],
            // generationConfig: {
            //   responseMimeType: "text/plain" // Có thể bỏ qua hoặc cấu hình thêm nếu cần định dạng cụ thể
            // }
          }, {
            headers: {
              'Content-Type': 'application/json' // Đặt Content-Type là JSON
            }
          });

          // Trích xuất phản hồi từ dữ liệu nhận được từ Gemini
          if (geminiResponse.data && 
              geminiResponse.data.candidates && 
              geminiResponse.data.candidates.length > 0 &&
              geminiResponse.data.candidates[0].content &&
              geminiResponse.data.candidates[0].content.parts &&
              geminiResponse.data.candidates[0].content.parts.length > 0) {
            geminiReplyText = geminiResponse.data.candidates[0].content.parts[0].text;
          } else {
            // Xử lý trường hợp cấu trúc phản hồi không mong muốn
            console.error("Cấu trúc phản hồi từ Gemini API không mong muốn:", JSON.stringify(geminiResponse.data, null, 2));
            geminiReplyText = "Đã xảy ra lỗi khi nhận phản hồi từ Gemini. Vui lòng thử lại.";
          }
          
          console.log(`Phản hồi từ Gemini: "${geminiReplyText}"`);

        } catch (error) {
          // Xử lý lỗi khi gọi Gemini API
          console.error("Lỗi khi gọi Gemini API:", error.response ? error.response.data : error.message);
          geminiReplyText = "Đã xảy ra lỗi khi kết nối với Gemini API. Vui lòng kiểm tra lại khóa API hoặc trạng thái dịch vụ.";
        }

        // Gửi lại phản hồi từ Gemini cho người dùng Messenger
        try {
          await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
            recipient: { id: sender_psid }, // Gửi đến người dùng có PSID tương ứng
            message: { text: geminiReplyText } // Nội dung tin nhắn trả lời
          });
          console.log(`Đã gửi phản hồi cho người dùng ${sender_psid}`);
        } catch (error) {
          // Xử lý lỗi khi gửi tin nhắn Messenger
          console.error("Lỗi khi gửi tin nhắn Messenger:", error.response ? error.response.data : error.message);
        }
      } else {
        // Log nếu không phải tin nhắn văn bản (ví dụ: ảnh, sticker, v.v.)
        console.log(`Nhận được sự kiện không phải tin nhắn văn bản từ ${sender_psid}:`, webhook_event);
      }
    }

    // Trả về 200 OK cho Facebook để xác nhận đã nhận và xử lý sự kiện
    res.status(200).send('EVENT_RECEIVED');
  } else {
    // Trả về 404 nếu không phải sự kiện từ một trang Facebook
    console.warn('Nhận được sự kiện không phải từ trang Facebook:', body.object);
    res.sendStatus(404);
  }
});

// 🔁 Khởi động server Express
// Server sẽ lắng nghe trên cổng được định nghĩa trong biến môi trường PORT hoặc mặc định là 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Webhook server đang chạy trên cổng ${PORT}`);
  console.log('💡 Đảm bảo bạn đã cấu hình các biến môi trường (VERIFY_TOKEN, PAGE_ACCESS_TOKEN, GEMINI_API_KEY) chính xác.');
});
