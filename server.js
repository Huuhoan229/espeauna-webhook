// Import các thư viện cần thiết
const express = require('express'); // Framework web cho Node.js
const bodyParser = require('body-parser'); // Middleware để xử lý body của request
const axios = require('axios'); // Thư viện để thực hiện HTTP requests (gọi API)
require('dotenv').config(); // Tải các biến môi trường từ file .env

// Import Firebase Admin SDK (để tương tác với Firestore)
// Lưu ý: Trong môi trường Canvas, bạn sẽ sử dụng các biến global __firebase_config và các hàm client-side SDK.
// Tuy nhiên, nếu triển khai trên server Node.js thông thường, bạn sẽ cần Firebase Admin SDK.
// Để đơn giản hóa cho môi trường Canvas, chúng ta sẽ giả định các biến global được cung cấp
// và tập trung vào logic.
// Trong môi trường thực tế, bạn sẽ dùng:
// const admin = require('firebase-admin');
// const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY); // Đảm bảo key được lưu an toàn
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
// });
// const db = admin.firestore();

// Để tương thích với môi trường Canvas, chúng ta sẽ mô phỏng việc sử dụng Firestore
// bằng cách truy cập các biến global được cung cấp.
// Trong môi trường Canvas, các hàm Firebase client-side SDK sẽ được tải sẵn.
// Ví dụ: import { initializeApp } from 'firebase/app';
// import { getFirestore, doc, setDoc, getDoc, collection, addDoc, query, orderBy, limit } from 'firebase/firestore';

// Khởi tạo ứng dụng Express
const app = express();
// Sử dụng middleware bodyParser để phân tích các request body dưới dạng JSON
app.use(bodyParser.json());

// Lấy các biến môi trường từ file .env hoặc từ cấu hình của Railway
const VERIFY_TOKEN = process.env.VERIFY_TOKEN; // Token xác minh cho webhook của Facebook
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN; // Mã truy cập trang Facebook của bạn
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Khóa API của Gemini

// Các biến global được cung cấp bởi môi trường Canvas cho Firebase
// Đảm bảo rằng các biến này được định nghĩa trong môi trường Railway của bạn
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Khởi tạo Firebase và Firestore (sử dụng client-side SDK syntax cho Canvas)
let firebaseApp;
let db;
let auth;

// Hàm khởi tạo Firebase (sẽ được gọi khi ứng dụng bắt đầu)
async function initializeFirebase() {
  try {
    const { initializeApp } = require('firebase/app');
    const { getAuth, signInWithCustomToken, signInAnonymously } = require('firebase/auth');
    const { getFirestore } = require('firebase/firestore');

    firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp);
    auth = getAuth(firebaseApp);

    if (initialAuthToken) {
      await signInWithCustomToken(auth, initialAuthToken);
      console.log('Firebase: Đăng nhập bằng custom token thành công.');
    } else {
      await signInAnonymously(auth);
      console.log('Firebase: Đăng nhập ẩn danh thành công.');
    }
  } catch (error) {
    console.error('Firebase: Lỗi khởi tạo hoặc đăng nhập:', error);
  }
}

// Gọi hàm khởi tạo Firebase ngay khi server bắt đầu
initializeFirebase();


// --- CƠ SỞ TRI THỨC ĐƠN GIẢN TRONG BỘ NHỚ (SIMPLIFIED IN-MEMORY KNOWLEDGE BASE) ---
const KNOWLEDGE_BASE_CHUNKS = [
  { id: 'espeauna_gioithieu_chung', text: "Espeauna là thương hiệu mỹ phẩm cao cấp chuyên về các sản phẩm chăm sóc da từ Hàn Quốc. Chúng tôi tập trung vào việc kết hợp các thành phần tự nhiên tinh túy với công nghệ khoa học tiên tiến để mang lại hiệu quả vượt trội cho làn da." },
  
  // Thông tin sản phẩm: Bọt Rửa Mặt Siêu Mịn ESPEAUNA MICROBUBBLE WHIP FOAM 480ml
  { id: 'espeauna_product_foam_480ml_name', text: "Tên sản phẩm: Bọt Rửa Mặt Siêu Mịn ESPEAUNA MICROBUBBLE WHIP FOAM 480ml. Thương hiệu: Èspeauna. Mã SKU: SRMES4ml20goi-1. Dung tích: 480mL." },
  { id: 'espeauna_product_foam_480ml_price', text: "Giá sản phẩm Bọt Rửa Mặt Siêu Mịn ESPEAUNA MICROBUBBLE WHIP FOAM 480ml là 605.000₫. Giá gốc là 756.250₫, được giảm 20%." },
  { id: 'espeauna_product_foam_480ml_rating', text: "Sản phẩm Bọt Rửa Mặt Siêu Mịn ESPEAUNA MICROBUBBLE WHIP FOAM 480ml được đánh giá 5.00 trên 5 sao dựa trên 38 đánh giá, tổng cộng có 39 đánh giá của khách hàng." },
  
  // Thông tin sản phẩm: Bọt Rửa Mặt Siêu Mịn ESPEAUNA MICROBUBBLE WHIP FOAM 4ml x 20 gói
  { id: 'espeauna_product_foam_4ml_name', text: "Tên sản phẩm: Bọt Rửa Mặt Siêu Mịn ESPEAUNA MICROBUBBLE WHIP FOAM 4ml x 20 gói. Thương hiệu: Èspeauna. Mã SKU: SRMES4ml20goi. Dung tích: 4mL x 20 gói." },
  { id: 'espeauna_product_foam_4ml_price', text: "Giá sản phẩm Bọt Rửa Mặt Siêu Mịn ESPEAUNA MICROBUBBLE WHIP FOAM 4ml x 20 gói là 390.000₫. Giá gốc là 487.500₫, được giảm 20%." },
  { id: 'espeauna_product_foam_4ml_rating', text: "Sản phẩm Bọt Rửa Mặt Siêu Mịn ESPEAUNA MICROBUBBLE WHIP FOAM 4ml x 20 gói được đánh giá 5.00 trên 5 sao dựa trên 12 đánh giá, tổng cộng có 13 đánh giá của khách hàng." },

  // Thông tin sản phẩm: Dầu Tẩy Trang ESPEAUNA MAKE UP REMOVER OIL 480ml
  { id: 'espeauna_product_makeup_remover_name', text: "Tên sản phẩm: Dầu Tẩy Trang ESPEAUNA MAKE UP REMOVER OIL 480ml. Thương hiệu: Èspeauna. Mã SKU: DTTES. Dung tích: 480mL." },
  { id: 'espeauna_product_makeup_remover_price', text: "Giá sản phẩm Dầu Tẩy Trang ESPEAUNA MAKE UP REMOVER OIL 480ml là 620.000₫. Giá gốc là 775.000₫, được giảm 20%." },
  { id: 'espeauna_product_makeup_remover_rating', text: "Sản phẩm Dầu Tẩy Trang ESPEAUNA MAKE UP REMOVER OIL 480ml được đánh giá 5.00 trên 5 sao dựa trên 13 đánh giá, tổng cộng có 14 đánh giá của khách hàng." },
  { id: 'espeauna_product_makeup_remover_thanhphan', text: "Thành phần Dầu Tẩy Trang ESPEAUNA MAKE UP REMOVER OIL 480ml: Dầu nền thực vật (Glycine Soja (Soybean) Oil – Dầu đậu nành, Macadamia Ternifolia Seed Oil – Dầu hạt mắc-ca, Pistacia Vera Seed Oil – Dầu hạt hồ trăn, Helianthus Annuus (Sunflower) Seed Oil – Dầu hạt hướng dương, Limnanthes Alba (Meadowfoam) Seed Oil – Dầu hạt xốp - dưỡng và giữ ẩm); Chất nhũ hóa và dung môi làm sạch (PEG-8 Glyceryl Isostearate, Cetyl Ethylhexanoate, Cyclopentasiloxane, Cyclohexasiloxane); Chất giữ ẩm và làm mềm (Butylene Glycol, Dipropylene Glycol, 1,2-Hexanediol); Dưỡng chất và chiết xuất đặc biệt (Tocopheryl Acetate - Vitamin E, Hydrolyzed Rye Phytoplacenta Extract - nhau thai lúa mạch, Lentinus Edodes Mycelium Extract - nấm hương); Khác (Fragrance, Water)." },
  { id: 'espeauna_product_makeup_remover_cachsudung', text: "Cách sử dụng Dầu Tẩy Trang ESPEAUNA MAKE UP REMOVER OIL 480ml: 1. Dùng tay khô, mặt khô, lấy một lượng dầu vừa đủ (2–3 lần nhấn) ra lòng bàn tay. 2. Massage nhẹ nhàng khắp mặt theo chuyển động tròn trong 30–60 giây để hòa tan lớp trang điểm và bụi bẩn. 3. Thêm một chút nước để nhũ hóa – tiếp tục massage cho đến khi dầu chuyển sang dạng sữa. 4. Rửa sạch lại với nước và tiếp tục với sữa rửa mặt nếu cần (double cleansing)." },
  { id: 'espeauna_product_makeup_remover_doituong', text: "Đối tượng sử dụng Dầu Tẩy Trang ESPEAUNA MAKE UP REMOVER OIL 480ml: Phù hợp cho mọi loại da, kể cả da nhạy cảm. Thích hợp với người thường xuyên trang điểm, dùng kem chống nắng, hoặc cần làm sạch sâu dịu nhẹ." },
  { id: 'espeauna_product_makeup_remover_luuy', text: "Lưu ý khi sử dụng Dầu Tẩy Trang ESPEAUNA MAKE UP REMOVER OIL 480ml: Tránh để dầu tiếp xúc trực tiếp với mắt – nếu vào mắt, hãy rửa lại bằng nước sạch. Không sử dụng khi da có vết thương hở hoặc đang kích ứng nghiêm trọng. Đậy kín nắp sau khi dùng và bảo quản nơi khô ráo, tránh ánh nắng trực tiếp. Ngưng sử dụng nếu xuất hiện các dấu hiệu bất thường như ngứa, nổi mẩn, đỏ da." },

  // Thông tin sản phẩm: Dung Dịch Làm Sạch Sâu ESPEAUNA PORE SOLUTION 1000ml
  { id: 'espeauna_product_pore_solution_name', text: "Tên sản phẩm: Dung Dịch Làm Sạch Sâu ESPEAUNA PORE SOLUTION 1000ml. Thương hiệu: Èspeauna. Mã SKU: DDLSSES. Dung tích: 1000mL." },
  { id: 'espeauna_product_pore_solution_price', text: "Giá sản phẩm Dung Dịch Làm Sạch Sâu ESPEAUNA PORE SOLUTION 1000ml là 610.000₫. Giá gốc là 762.500₫, được giảm 20%." },
  { id: 'espeauna_product_pore_solution_rating', text: "Sản phẩm Dung Dịch Làm Sạch Sâu ESPEAUNA PORE SOLUTION 1000ml được đánh giá 5.00 trên 5 sao dựa trên 12 đánh giá, tổng cộng có 13 đánh giá của khách hàng." },
  { id: 'espeauna_product_pore_solution_congdung', text: "Công dụng chính của Dung Dịch Làm Sạch Sâu ESPEAUNA PORE SOLUTION 1000ml: Sản phẩm chứa AHA kết hợp với chiết xuất rau sam và 15 loại siêu thực phẩm thực vật, giúp làm sạch sâu bên trong lỗ chân lông, hòa tan và loại bỏ bã nhờn, bụi bẩn, cặn mỹ phẩm. Hỗ trợ cải thiện các vấn đề về lỗ chân lông to, bít tắc. Cân bằng độ ẩm và làm dịu da." },
  { id: 'espeauna_product_pore_solution_thanhphan', text: "Thành phần nổi bật của Dung Dịch Làm Sạch Sâu ESPEAUNA PORE SOLUTION 1000ml: AHA (Acid Citric) - tẩy tế bào chết nhẹ, làm sáng và mịn da; Chiết xuất rau sam (Portulaca Oleracea Extract) - làm dịu, chống oxy hóa; Chiết xuất thực vật và hoa (Scutellaria Baicalensis Root, Sophora Flavescens Root, Morinda Citrifolia Fruit, Paeonia Suffruticosa Root, Eclipta Prostrata, Anise, Jasmine, Peppermint, Rosemary, Chamomile, Mentha Piperita); Cacao Seed Extract, Lavender Oil, Xanthan Gum - dưỡng ẩm và làm mềm da; Các dung môi làm sạch & giữ ẩm (Water, Butylene Glycol, Dipropylene Glycol, Glycerin, Caprylyl Glycol, Sodium Lauroyl Sarcosinate)." },
  { id: 'espeauna_product_pore_solution_cachsudung', text: "Cách sử dụng Dung Dịch Làm Sạch Sâu ESPEAUNA PORE SOLUTION 1000ml: 1. Sau bước làm sạch bằng sữa rửa mặt, đổ một lượng vừa đủ dung dịch ra bông tẩy trang. 2. Lau nhẹ nhàng khắp mặt, tập trung ở vùng chữ T hoặc những vùng có lỗ chân lông to. 3. Dùng hàng ngày sáng và tối hoặc theo nhu cầu da. 4. Có thể sử dụng như toner hoặc làm lotion mask." },
  { id: 'espeauna_product_pore_solution_doituong', text: "Đối tượng sử dụng Dung Dịch Làm Sạch Sâu ESPEAUNA PORE SOLUTION 1000ml: Phù hợp cho da dầu, da hỗn hợp, da có lỗ chân lông to, da dễ nổi mụn do bít tắc. Người đang tìm giải pháp làm sạch sâu lỗ chân lông, tẩy tế bào chết dịu nhẹ, dưỡng da bằng thảo mộc thiên nhiên." },
  { id: 'espeauna_product_pore_solution_luuy', text: "Lưu ý khi sử dụng Dung Dịch Làm Sạch Sâu ESPEAUNA PORE SOLUTION 1000ml: Tránh tiếp xúc trực tiếp với mắt. Nếu sản phẩm dính vào mắt, rửa sạch ngay bằng nước. Ngưng sử dụng nếu da có dấu hiệu kích ứng, mẩn đỏ. Bảo quản nơi thoáng mát, tránh ánh nắng trực tiếp và nhiệt độ cao." },

  // Thông tin sản phẩm: Gel Dưỡng Làm Dịu Và Dưỡng Ẩm ESPEAUNA FRESH AZULENE GEL 30ml
  { id: 'espeauna_product_azulene_gel_30ml_name', text: "Tên sản phẩm: Gel Dưỡng Làm Dịu Và Dưỡng Ẩm ESPEAUNA FRESH AZULENE GEL 30ml. Thương hiệu: Èspeauna. Mã SKU: GELDA30ml. Dung tích: 30ml." },
  { id: 'espeauna_product_azulene_gel_30ml_price', text: "Giá sản phẩm Gel Dưỡng Làm Dịu Và Dưỡng Ẩm ESPEAUNA FRESH AZULENE GEL 30ml là 310.000₫. Giá gốc là 387.500₫, được giảm 20%." },
  { id: 'espeauna_product_azulene_gel_30ml_rating', text: "Sản phẩm Gel Dưỡng Làm Dịu Và Dưỡng Ẩm ESPEAUNA FRESH AZULENE GEL 30ml được đánh giá 5.00 trên 5 sao (chưa có đánh giá cụ thể trên trang nhưng tổng quan là 5 sao)." },
  { id: 'espeauna_product_azulene_gel_30ml_congdung', text: "Công dụng chính của Gel Dưỡng Làm Dịu Và Dưỡng Ẩm ESPEAUNA FRESH AZULENE GEL 30ml: Chứa hỗn hợp dưỡng chất làm dịu mạnh mẽ như Guaiazulene, Beta-Glucan, và các hợp chất từ rau má, giúp làm dịu da kích ứng, mẩn đỏ, sau mụn hoặc cháy nắng. Cấp nước tức thì và giữ ẩm cho da mềm mại, khỏe mạnh. Hỗ trợ phục hồi hàng rào bảo vệ da, cải thiện tình trạng da yếu, dễ kích ứng. Mang lại cảm giác mát lạnh và tươi mới khi thoa lên da." },
  { id: 'espeauna_product_azulene_gel_30ml_thanhphan', text: "Thành phần nổi bật của Gel Dưỡng Làm Dịu Và Dưỡng Ẩm ESPEAUNA FRESH AZULENE GEL 30ml: Guaiazulene (hoạt chất màu xanh dương từ cúc La Mã, làm dịu mạnh và chống viêm); Beta-Glucan (Tăng cường miễn dịch da, phục hồi tổn thương, dưỡng ẩm sâu); Niacinamide (Vitamin B3) - Làm sáng da, phục hồi tổn thương và điều tiết dầu; Chiết xuất rau má (Centella Asiatica) - làm dịu da, giảm kích ứng; Chiết xuất tảo biển & thực vật (Spirulina, Fucus Vesiculosus, Chlorella, Corallina, Turmeric, Ocimum Sanctum, Aloe Vera – chống oxy hóa, cấp ẩm và kháng khuẩn); Panthenol, Allantoin, Trehalose (Dưỡng ẩm sâu và giúp da mềm mại tức thì)." },
  { id: 'espeauna_product_azulene_gel_30ml_cachsudung', text: "Cách sử dụng Gel Dưỡng Làm Dịu Và Dưỡng Ẩm ESPEAUNA FRESH AZULENE GEL 30ml: Sau bước làm sạch và toner, lấy một lượng vừa đủ gel thoa đều lên mặt hoặc vùng da cần làm dịu. Massage nhẹ nhàng để dưỡng chất thẩm thấu sâu. Sử dụng 1–2 lần/ngày, sáng và tối hoặc khi cần thiết (sau nắng, sau mụn...)." },
  { id: 'espeauna_product_azulene_gel_30ml_doituong', text: "Đối tượng sử dụng Gel Dưỡng Làm Dịu Và Dưỡng Ẩm ESPEAUNA FRESH AZULENE GEL 30ml: Da nhạy cảm, da bị kích ứng, mẩn đỏ, da sau điều trị (nặn mụn, laser, peel...); Da thiếu ẩm, mất nước, hoặc cần làm dịu tức thì; Phù hợp cho cả da dầu mụn do kết cấu gel nhẹ và không gây bí da." },
  { id: 'espeauna_product_azulene_gel_30ml_luuy', text: "Lưu ý khi sử dụng Gel Dưỡng Làm Dịu Và Dưỡng Ẩm ESPEAUNA FRESH AZULENE GEL 30ml: Không dùng trên vùng da có vết thương hở lớn. Ngưng sử dụng nếu thấy mẩn đỏ, ngứa hoặc kích ứng bất thường. Bảo quản nơi mát, tránh ánh nắng trực tiếp để duy trì chất lượng gel." },

  // Thông tin sản phẩm: Gel Dưỡng Làm Dịu Và Dưỡng Ẩm ESPEAUNA FRESH AZULENE GEL 480ml
  { id: 'espeauna_product_azulene_gel_480ml_name', text: "Tên sản phẩm: Gel Dưỡng Làm Dịu Và Dưỡng Ẩm ESPEAUNA FRESH AZULENE GEL 480ml. Thương hiệu: Èspeauna. Mã SKU: GELDA480ml. Dung tích: 480ml." },
  { id: 'espeauna_product_azulene_gel_480ml_price', text: "Giá sản phẩm Gel Dưỡng Làm Dịu Và Dưỡng Ẩm ESPEAUNA FRESH AZULENE GEL 480ml là 620.000₫. Giá gốc là 775.000₫, được giảm 20%." },
  { id: 'espeauna_product_azulene_gel_480ml_rating', text: "Sản phẩm Gel Dưỡng Làm Dịu Và Dưỡng Ẩm ESPEAUNA FRESH AZULENE GEL 480ml chưa có đánh giá cụ thể trên trang nhưng tổng quan là 5.00 trên 5 sao." },
  { id: 'espeauna_product_azulene_gel_480ml_congdung', text: "Công dụng chính của Gel Dưỡng Làm Dịu Và Dưỡng Ẩm ESPEAUNA FRESH AZULENE GEL 480ml: Chứa hỗn hợp dưỡng chất làm dịu mạnh mẽ như Guaiazulene, Beta-Glucan, và các hợp chất từ rau má, giúp làm dịu da kích ứng, mẩn đỏ, sau mụn hoặc cháy nắng. Cấp nước tức thì và giữ ẩm cho da mềm mại, khỏe mạnh. Hỗ trợ phục hồi hàng rào bảo vệ da, cải thiện tình trạng da yếu, dễ kích ứng. Mang lại cảm giác mát lạnh và tươi mới khi thoa lên da." },
  { id: 'espeauna_product_azulene_gel_480ml_thanhphan', text: "Thành phần nổi bật của Gel Dưỡng Làm Dịu Và Dưỡng Ẩm ESPEAUNA FRESH AZULENE GEL 480ml: Guaiazulene (hoạt chất màu xanh dương từ cúc La Mã, làm dịu mạnh và chống viêm); Beta-Glucan (Tăng cường miễn dịch da, phục hồi tổn thương, dưỡng ẩm sâu); Niacinamide (Vitamin B3) - Làm sáng da, phục hồi tổn thương và điều tiết dầu; Chiết xuất rau má (Centella Asiatica) - làm dịu da, giảm kích ứng; Chiết xuất tảo biển & thực vật (Spirulina, Fucus Vesiculosus, Chlorella, Corallina, Turmeric, Ocimum Sanctum, Aloe Vera – chống oxy hóa, cấp ẩm và kháng khuẩn); Panthenol, Allantoin, Trehalose (Dưỡng ẩm sâu và giúp da mềm mại tức thì)." },
  { id: 'espeauna_product_azulene_gel_480ml_cachsudung', text: "Cách sử dụng Gel Dưỡng Làm Dịu Và Dưỡng Ẩm ESPEAUNA FRESH AZULENE GEL 480ml: Sau bước làm sạch và toner, lấy một lượng vừa đủ gel thoa đều lên mặt hoặc vùng da cần làm dịu. Massage nhẹ nhàng để dưỡng chất thẩm thấu sâu. Sử dụng 1–2 lần/ngày, sáng và tối hoặc khi cần thiết (sau nắng, sau mụn...)." },
  { id: 'espeauna_product_azulene_gel_480ml_doituong', text: "Đối tượng sử dụng Gel Dưỡng Làm Dịu Và Dưỡng Ẩm ESPEAUNA FRESH AZULENE GEL 480ml: Da nhạy cảm, da bị kích ứng, mẩn đỏ, da sau điều trị (nặn mụn, laser, peel...); Da thiếu ẩm, mất nước, hoặc cần làm dịu tức thì; Phù hợp cho cả da dầu mụn do kết cấu gel nhẹ và không gây bí da." },
  { id: 'espeauna_product_azulene_gel_480ml_luuy', text: "Lưu ý khi sử dụng Gel Dưỡng Làm Dịu Và Dưỡng Ẩm ESPEAUNA FRESH AZULENE GEL 480ml: Không dùng trên vùng da có vết thương hở lớn. Ngưng sử dụng nếu thấy mẩn đỏ, ngứa hoặc kích ứng bất thường. Bảo quản nơi mát, tránh ánh nắng trực tiếp để duy trì chất lượng gel." },

  // Thông tin sản phẩm: Kem Dưỡng Sáng Da Tự Nhiên ESPEAUNA NATURAL SHINE TONE-UP CREAM 40ml
  { id: 'espeauna_product_tone_up_cream_40ml_name', text: "Tên sản phẩm: Kem Dưỡng Sáng Da Tự Nhiên ESPEAUNA NATURAL SHINE TONE-UP CREAM 40ml. Thương hiệu: Èspeauna. Mã SKU: KDSDA40ml. Dung tích: 40mL." },
  { id: 'espeauna_product_tone_up_cream_40ml_price', text: "Giá sản phẩm Kem Dưỡng Sáng Da Tự Nhiên ESPEAUNA NATURAL SHINE TONE-UP CREAM 40ml là 330.000₫. Giá gốc là 412.500₫, được giảm 20%." },
  { id: 'espeauna_product_tone_up_cream_40ml_rating', text: "Sản phẩm Kem Dưỡng Sáng Da Tự Nhiên ESPEAUNA NATURAL SHINE TONE-UP CREAM 40ml được đánh giá 5.00 trên 5 sao dựa trên 2 đánh giá." },
  { id: 'espeauna_product_tone_up_cream_40ml_congdung', text: "Công dụng chính của Kem Dưỡng Sáng Da Tự Nhiên ESPEAUNA NATURAL SHINE TONE-UP CREAM 40ml: Làm sáng đều màu da tức thì, mang lại vẻ rạng rỡ tự nhiên mà không bết trắng. Cấp ẩm và làm mềm da, duy trì độ căng bóng suốt ngày. Tái tạo làn da với chiết xuất tế bào gốc thực vật, thúc đẩy sản sinh collagen. Bảo vệ da khỏi tác nhân oxy hóa, tăng cường hàng rào bảo vệ tự nhiên." },
  { id: 'espeauna_product_tone_up_cream_40ml_thanhphan', text: "Thành phần nổi bật của Kem Dưỡng Sáng Da Tự Nhiên ESPEAUNA NATURAL SHINE TONE-UP CREAM 40ml: Niacinamide (Vitamin B3) - Làm sáng da, mờ thâm, đều màu da; Beta-Glucan, Panthenol - cấp nước và làm dịu da hiệu quả; Ceramide NP - phục hồi hàng rào bảo vệ da, khóa ẩm; Chiết xuất rau má (Centella Asiatica) - làm dịu da, giảm kích ứng; Chiết xuất nấm Lentinus Edodes & tế bào gốc thực vật - tái tạo da, chống oxy hóa; Adenosine - chống lão hóa, cải thiện độ đàn hồi da. Kết cấu kem nhẹ mịn, dễ tán, không gây bí da hay bết dính." },
  { id: 'espeauna_product_tone_up_cream_40ml_cachsudung', text: "Cách sử dụng Kem Dưỡng Sáng Da Tự Nhiên ESPEAUNA NATURAL SHINE TONE-UP CREAM 40ml: Sử dụng ở bước cuối cùng trong chu trình chăm sóc da buổi sáng. Lấy một lượng vừa đủ, chấm lên 5 điểm trên mặt và tán đều. Có thể dùng thay kem nền nhẹ khi trang điểm tự nhiên." },
  { id: 'espeauna_product_tone_up_cream_40ml_doituong', text: "Đối tượng sử dụng Kem Dưỡng Sáng Da Tự Nhiên ESPEAUNA NATURAL SHINE TONE-UP CREAM 40ml: Da xỉn màu, thiếu sức sống; Người muốn nâng tông da nhẹ nhàng mỗi ngày mà không dùng makeup; Da khô hoặc hỗn hợp thiên khô cần dưỡng sáng + ẩm." },
  { id: 'espeauna_product_tone_up_cream_40ml_luuy', text: "Lưu ý khi sử dụng Kem Dưỡng Sáng Da Tự Nhiên ESPEAUNA NATURAL SHINE TONE-UP CREAM 40ml: Không dùng lên vùng da đang bị viêm nặng, trầy xước. Đậy kín nắp sau khi sử dụng, bảo quản nơi thoáng mát. Ngưng dùng nếu thấy kích ứng bất thường." },

  // Thông tin sản phẩm: Tinh Chất Cấp Ẩm Và Phục Hồi Da ESPEAUNA HYDRATING AMPOULE 50ml
  { id: 'espeauna_product_hydrating_ampoule_50ml_name', text: "Tên sản phẩm: Tinh Chât Cấp Ẩm Và Phục Hồi Da ESPEAUNA HYDRATING AMPOULE 50ml. Thương hiệu: Èspeauna. Mã SKU: TCHAFHDA50ml. Dung tích: 50mL." },
  { id: 'espeauna_product_hydrating_ampoule_50ml_price', text: "Giá sản phẩm Tinh Chât Cấp Ẩm Và Phục Hồi Da ESPEAUNA HYDRATING AMPOULE 50ml là 410.000₫. Giá gốc là 512.500₫, được giảm 20%." },
  { id: 'espeauna_product_hydrating_ampoule_50ml_rating', text: "Sản phẩm Tinh Chât Cấp Ẩm Và Phục Hồi Da ESPEAUNA HYDRATING AMPOULE 50ml được đánh giá 5.00 trên 5 sao dựa trên 10 đánh giá." },
  { id: 'espeauna_product_hydrating_ampoule_50ml_congdung', text: "Công dụng nổi bật của Tinh Chât Cấp Ẩm Và Phục Hồi Da ESPEAUNA HYDRATING AMPOULE 50ml: Cung cấp dưỡng chất đậm đặc giúp phục hồi độ ẩm tức thì cho làn da khô, mất nước. Tạo và củng cố hàng rào giữ ẩm tự nhiên giúp da duy trì độ ẩm lâu dài. Làm dịu nhanh tình trạng kích ứng, đỏ rát và tái tạo kết cấu da mềm mịn, đàn hồi. Giúp da khỏe mạnh, tươi sáng và rạng rỡ hơn sau một thời gian sử dụng." },
  { id: 'espeauna_product_hydrating_ampoule_50ml_thanhphan', text: "Thành phần nổi bật của Tinh Chât Cấp Ẩm Và Phục Hồi Da ESPEAUNA HYDRATING AMPOULE 50ml: Betaine, Trehalose, Glycerin, Butylene Glycol, Sodium Hyaluronate (Dưỡng ẩm sâu và lâu dài); Centella Asiatica Extract, Aloe Vera, Coptis Japonica Extract (Làm dịu và phục hồi da nhạy cảm); Allantoin, Panthenol, Madecassoside, Asiaticoside (Chống viêm, tái tạo tế bào); Chiết xuất từ nghệ, hoa sen, hoa nhài, rau má, quả cà tím… (Làm sáng da và bảo vệ khỏi oxy hóa)." },
  { id: 'espeauna_product_hydrating_ampoule_50ml_cachsudung', text: "Cách sử dụng Tinh Chât Cấp Ẩm Và Phục Hồi Da ESPEAUNA HYDRATING AMPOULE 50ml: Dùng sau toner, lấy 2–3 giọt ampoule thoa đều toàn mặt. Massage nhẹ nhàng để dưỡng chất thẩm thấu sâu. Nên dùng sáng và tối mỗi ngày." },
  { id: 'espeauna_product_hydrating_ampoule_50ml_doituong', text: "Đối tượng sử dụng Tinh Chât Cấp Ẩm Và Phục Hồi Da ESPEAUNA HYDRATING AMPOULE 50ml: Da khô, bong tróc, thiếu nước; Da nhạy cảm, dễ kích ứng; Da mất cân bằng độ ẩm – dầu." },
  { id: 'espeauna_product_hydrating_ampoule_50ml_luuy', text: "Lưu ý khi sử dụng Tinh Chât Cấp Ẩm Và Phục Hồi Da ESPEAUNA HYDRATING AMPOULE 50ml: Tránh vùng mắt. Ngưng dùng nếu có dấu hiệu kích ứng. Kết hợp kem dưỡng khóa ẩm để tăng hiệu quả. Bảo quản nơi mát, tránh ánh nắng và nhiệt độ cao." },

  // Thông tin sản phẩm: Tinh Chất Collagen Tái Tạo Da ESPEAUNA REVITALIZING AMPOULE 50ml
  { id: 'espeauna_product_revitalizing_ampoule_50ml_name', text: "Tên sản phẩm: Tinh Chất Collagen Tái Tạo Da ESPEAUNA REVITALIZING AMPOULE 50ml. Thương hiệu: Èspeauna. Mã SKU: TCCRTDA50ml. Dung tích: 50mL." },
  { id: 'espeauna_product_revitalizing_ampoule_50ml_price', text: "Giá sản phẩm Tinh Chất Collagen Tái Tạo Da ESPEAUNA REVITALIZING AMPOULE 50ml là 410.000₫. Giá gốc là 512.500₫, được giảm 20%." },
  { id: 'espeauna_product_revitalizing_ampoule_50ml_rating', text: "Sản phẩm Tinh Chất Collagen Tái Tạo Da ESPEAUNA REVITALIZING AMPOULE 50ml được đánh giá 5.00 trên 5 sao dựa trên 8 đánh giá, tổng cộng có 9 đánh giá của khách hàng." },
  { id: 'espeauna_product_revitalizing_ampoule_50ml_congdung', text: "Công dụng nổi bật của Tinh Chất Collagen Tái Tạo Da ESPEAUNA REVITALIZING AMPOULE 50ml: Cung cấp dưỡng chất cô đặc, bao gồm collagen cá thủy phân phân tử thấp 4,000Da từ Pháp, thẩm thấu sâu giúp tái tạo và củng cố cấu trúc da. Chứa chiết xuất lựu đỏ giúp chống oxy hóa, thúc đẩy sản sinh tế bào mới. Giúp làm đầy các rãnh nhăn nhỏ, tăng cường độ đàn hồi và săn chắc cho làn da. Tạo hiệu ứng da khỏe, mềm mịn, đầy sức sống từ bên trong." },
  { id: 'espeauna_product_revitalizing_ampoule_50ml_thanhphan', text: "Thành phần nổi bật của Tinh Chất Collagen Tái Tạo Da ESPEAUNA REVITALIZING AMPOULE 50ml: Hydrolyzed Collagen (4,000Da) – Cấp ẩm sâu, cải thiện cấu trúc da; Chiết xuất lựu (Punica Granatum) – Chống oxy hóa mạnh mẽ, tái tạo lớp trung bì; Adenosine, Glutamic Acid, Sodium Hyaluronate – Làm mờ nếp nhăn, cấp nước và làm mềm mịn da; Amino Acid Complex (Leucine, Valine, Lysine, etc.) – Nuôi dưỡng và tái tạo tế bào; Chiết xuất Coptis Japonica, Theobroma Cacao Seed, Beta-Glucan – Làm dịu và chống viêm." },
  { id: 'espeauna_product_revitalizing_ampoule_50ml_cachsudung', text: "Cách sử dụng Tinh Chất Collagen Tái Tạo Da ESPEAUNA REVITALIZING AMPOULE 50ml: Sau toner, lấy 2–3 giọt ampoule thoa đều toàn mặt. Massage nhẹ nhàng để dưỡng chất hấp thụ sâu. Dùng hàng ngày, sáng và tối." },
  { id: 'espeauna_product_revitalizing_ampoule_50ml_doituong', text: "Đối tượng sử dụng Tinh Chất Collagen Tái Tạo Da ESPEAUNA REVITALIZING AMPOULE 50ml: Da khô, thiếu săn chắc, lão hóa sớm; Da yếu, cần phục hồi sau điều trị, stress hoặc môi trường độc hại; Người có nhu cầu chống lão hóa & tái tạo chuyên sâu." },
  { id: 'espeauna_product_revitalizing_ampoule_50ml_luuy', text: "Lưu ý khi sử dụng Tinh Chất Collagen Tái Tạo Da ESPEAUNA REVITALIZING AMPOULE 50ml: Nên kết hợp cùng kem dưỡng để khóa ẩm tối ưu. Tránh vùng mắt, không sử dụng lên vùng da có vết thương hở. Bảo quản nơi khô ráo, tránh ánh sáng trực tiếp." },

  // Thông tin sản phẩm: Tinh Chất Dưỡng Trắng Và Mờ Thâm Nám ESPEAUNA BRIGHTENING AMPOULE 50ml
  { id: 'espeauna_product_brightening_ampoule_50ml_name', text: "Tên sản phẩm: Tinh Chất Dưỡng Trắng Và Mờ Thâm Nám ESPEAUNA BRIGHTENING AMPOULE 50ml. Thương hiệu: Èspeauna. Mã SKU: TCDTNM50ml. Dung tích: 50mL." },
  { id: 'espeauna_product_brightening_ampoule_50ml_price', text: "Giá sản phẩm Tinh Chất Dưỡng Trắng Và Mờ Thâm Nám ESPEAUNA BRIGHTENING AMPOULE 50ml là 410.000₫. Giá gốc là 512.500₫, được giảm 20%." },
  { id: 'espeauna_product_brightening_ampoule_50ml_rating', text: "Sản phẩm Tinh Chất Dưỡng Trắng Và Mờ Thâm Nám ESPEAUNA BRIGHTENING AMPOULE 50ml được đánh giá 5.00 trên 5 sao dựa trên 13 đánh giá, tổng cộng có 14 đánh giá của khách hàng." },
  { id: 'espeauna_product_brightening_ampoule_50ml_congdung', text: "Công dụng nổi bật của Tinh Chất Dưỡng Trắng Và Mờ Thâm Nám ESPEAUNA BRIGHTENING AMPOULE 50ml: Cung cấp dưỡng chất cô đặc giúp làm sáng và cải thiện sắc tố da; Giảm thâm, nám, tàn nhang, hỗ trợ ngăn ngừa tình trạng tăng sắc tố; Cải thiện độ đều màu da, mang lại làn da rạng rỡ, sáng khỏe; Tăng cường sức sống và khả năng bảo vệ tự nhiên cho làn da." },
  { id: 'espeauna_product_brightening_ampoule_50ml_thanhphan', text: "Thành phần nổi bật của Tinh Chất Dưỡng Trắng Và Mờ Thâm Nám ESPEAUNA BRIGHTENING AMPOULE 50ml: Niacinamide, Ascorbyl Glucoside, Sodium Ascorbyl Phosphate (Làm sáng và chống oxy hóa mạnh mẽ); Chiết xuất ngọc trai, nghệ, trà xanh, rau má, tía tô, hoa nhài, hạt ca cao, hoa sen… (Làm sáng, làm dịu và dưỡng ẩm); Sodium Hyaluronate, Glycerin, Propanediol (Cấp nước, dưỡng ẩm sâu); Allantoin, Propolis, Coptis Japonica Extract (Làm dịu và tăng cường phục hồi da)." },
  { id: 'espeauna_product_brightening_ampoule_50ml_cachsudung', text: "Cách sử dụng Tinh Chất Dưỡng Trắng Và Mờ Thâm Nám ESPEAUNA BRIGHTENING AMPOULE 50ml: Sau toner, lấy 2–3 giọt ampoule thoa đều lên mặt. Massage nhẹ nhàng đến khi sản phẩm thẩm thấu. Nên dùng kết hợp kem chống nắng ban ngày để tối ưu hiệu quả làm sáng." },
  { id: 'espeauna_product_brightening_ampoule_50ml_doituong', text: "Đối tượng sử dụng Tinh Chất Dưỡng Trắng Và Mờ Thâm Nám ESPEAUNA BRIGHTENING AMPOULE 50ml: Da thâm sạm, nám, không đều màu; Người đang điều trị nám – da có sắc tố tăng cao; Da thiếu sức sống, xỉn màu do stress, môi trường." },
  { id: 'espeauna_product_brightening_ampoule_50ml_luuy', text: "Lưu ý khi sử dụng Tinh Chất Dưỡng Trắng Và Mờ Thâm Nám ESPEAUNA BRIGHTENING AMPOULE 50ml: Sử dụng kiên trì mỗi ngày để thấy kết quả rõ rệt. Tránh vùng mắt. Ngưng dùng nếu kích ứng. Bảo quản nơi thoáng mát, tránh ánh nắng trực tiếp." },

  // Thông tin sản phẩm: Tinh Chất Khoáng Biển Sâu ESPEAUNA ACTIVE SEA WATER 1000ml
  { id: 'espeauna_product_sea_water_1000ml_name', text: "Tên sản phẩm: Tinh Chất Khoáng Biển Sâu ESPEAUNA ACTIVE SEA WATER 1000ml. Thương hiệu: Èspeauna. Mã SKU: TCKBSEA1000ml. Dung tích: 1000mL." },
  { id: 'espeauna_product_sea_water_1000ml_price', text: "Giá sản phẩm Tinh Chất Khoáng Biển Sâu ESPEAUNA ACTIVE SEA WATER 1000ml là 476.000₫. Giá gốc là 595.000₫, được giảm 20%." },
  { id: 'espeauna_product_sea_water_1000ml_rating', text: "Sản phẩm Tinh Chất Khoáng Biển Sâu ESPEAUNA ACTIVE SEA WATER 1000ml chưa có đánh giá cụ thể trên trang nhưng tổng quan là 5.00 trên 5 sao." },
  { id: 'espeauna_product_sea_water_1000ml_congdung', text: "Công dụng chính của Tinh Chất Khoáng Biển Sâu ESPEAUNA ACTIVE SEA WATER 1000ml: Nước khoáng biển hoạt tính ESPEAUNA sử dụng nước biển sâu từ vùng Đông Hải – Hàn Quốc, được ion hóa giàu khoáng chất thiên nhiên. Sản phẩm có khả năng: Trung hòa các gốc tự do gây hại; Làm dịu nhanh các vùng da kích ứng, tổn thương; Phục hồi da bị hư tổn và tăng cường sức đề kháng; Mang lại cảm giác tươi mát, dễ chịu cho làn da." },
  { id: 'espeauna_product_sea_water_1000ml_thanhphan', text: "Thành phần nổi bật của Tinh Chất Khoáng Biển Sâu ESPEAUNA ACTIVE SEA WATER 1000ml: Nước biển sâu (Sea Water): Giàu khoáng chất như magie, canxi, giúp thanh lọc và cấp khoáng cho da; Chiết xuất rong biển và tảo biển (Laminaria Digitata, Porphyra Yezoensis, Ecklonia Cava, Enteromorpha Compressa, Agarum Cribrosum, Undaria Pinnatifida, Codium Fragile, Ulva Lactuca, Codium Tomentosum) – Chống oxy hóa, làm dịu da, phục hồi da hư tổn; Ceramide NP, Panthenol, Allantoin: Dưỡng ẩm và phục hồi hàng rào bảo vệ da; Hyaluronic Acid, Hydrolyzed Collagen: Cấp nước sâu, tăng độ đàn hồi cho da; Peptide Complex (Copper Tripeptide-1, Palmitoyl Tripeptide-1, Hexapeptide-9...) – Tái tạo và làm săn chắc da." },
  { id: 'espeauna_product_sea_water_1000ml_cachsudung', text: "Cách sử dụng Tinh Chất Khoáng Biển Sâu ESPEAUNA ACTIVE SEA WATER 1000ml: 1. Dùng như nước cân bằng: sau bước làm sạch, thấm dung dịch ra bông tẩy trang rồi lau nhẹ nhàng khắp mặt. 2. Dùng như xịt khoáng: cho vào chai dạng mist để xịt trực tiếp làm dịu da mọi lúc. 3. Dùng làm lotion mask: thấm vào bông cotton và đắp lên vùng da cần làm dịu 5–10 phút." },
  { id: 'espeauna_product_sea_water_1000ml_doituong', text: "Đối tượng sử dụng Tinh Chất Khoáng Biển Sâu ESPEAUNA ACTIVE SEA WATER 1000ml: Thích hợp cho mọi loại da, đặc biệt là da nhạy cảm, da mụn, da đang trong quá trình phục hồi. Người thường xuyên bị kích ứng, da thiếu nước, hoặc tiếp xúc môi trường khắc nghiệt." },
  { id: 'espeauna_product_sea_water_1000ml_luuy', text: "Lưu ý khi sử dụng Tinh Chất Khoáng Biển Sâu ESPEAUNA ACTIVE SEA WATER 1000ml: Ngưng sử dụng nếu có dấu hiệu kích ứng bất thường. Không sử dụng trên vùng da có vết thương hở nặng. Bảo quản nơi khô ráo, thoáng mát, tránh ánh nắng trực tiếp." },

  // Thông tin sản phẩm: Tinh Chất Làm Dịu Da Và Giảm Nhờn ESPEAUNA REFRESHING AMPOULE 50ml
  { id: 'espeauna_product_refreshing_ampoule_50ml_name', text: "Tên sản phẩm: Tinh Chất Làm Dịu Da Và Giảm Nhờn ESPEAUNA REFRESHING AMPOULE 50ml. Thương hiệu: Èspeauna. Mã SKU: TCLDGNDA50ml. Dung tích: 50mL." },
  { id: 'espeauna_product_refreshing_ampoule_50ml_price', text: "Giá sản phẩm Tinh Chất Làm Dịu Và Giảm Nhờn ESPEAUNA REFRESHING AMPOULE 50ml là 410.000₫. Giá gốc là 512.500₫, được giảm 20%." },
  { id: 'espeauna_product_refreshing_ampoule_50ml_rating', text: "Sản phẩm Tinh Chất Làm Dịu Và Giảm Nhờn ESPEAUNA REFRESHING AMPOULE 50ml được đánh giá 5.00 trên 5 sao dựa trên 17 đánh giá, tổng cộng có 18 đánh giá của khách hàng." },
  { id: 'espeauna_product_refreshing_ampoule_50ml_congdung', text: "Công dụng nổi bật của Tinh Chất Làm Dịu Và Giảm Nhờn ESPEAUNA REFRESHING AMPOULE 50ml: Cung cấp dưỡng chất cô đặc giúp nuôi dưỡng sâu và khôi phục cân bằng da; Điều tiết bã nhờn, hỗ trợ kiểm soát dầu – giảm nguy cơ bít tắc lỗ chân lông; Cân bằng dầu – nước, cải thiện lưu thông dưới da; Hỗ trợ phục hồi vùng da bị mụn, viêm hoặc lỗ chân lông to; Làm dịu nhanh vùng da kích ứng, tăng cường sức đề kháng tự nhiên." },
  { id: 'espeauna_product_refreshing_ampoule_50ml_thanhphan', text: "Thành phần nổi bật của Tinh Chất Làm Dịu Và Giảm Nhờn ESPEAUNA REFRESHING AMPOULE 50ml: Chiết xuất trà xanh, rau má, lá diếp cá, lá tía tô, hạt ca cao, nha đam… (Làm dịu, kháng viêm và cấp ẩm); Niacinamide, Adenosine, PHA (Gluconolactone) (Làm sáng và chống lão hóa); Hyaluronic Acid, Sodium PCA (Cấp nước sâu, giữ ẩm dài lâu); Chiết xuất men lên men (Bifida, Lactobacillus, Saccharomyces) (Tăng cường sức sống cho da); Salicylic Acid (BHA), Citric/Malic/Lactic/Glycolic Acid (AHA) (Hỗ trợ làm sạch và tẩy tế bào chết dịu nhẹ)." },
  { id: 'espeauna_product_refreshing_ampoule_50ml_cachsudung', text: "Cách sử dụng Tinh Chất Làm Dịu Và Giảm Nhờn ESPEAUNA REFRESHING AMPOULE 50ml: Sau bước toner, lấy 2–3 giọt ampoule thoa đều lên mặt. Massage nhẹ đến khi thẩm thấu hoàn toàn. Dùng mỗi ngày sáng và tối." },
  { id: 'espeauna_product_refreshing_ampoule_50ml_doituong', text: "Đối tượng sử dụng Tinh Chất Làm Dịu Và Giảm Nhờn ESPEAUNA REFRESHING AMPOULE 50ml: Da dầu, da hỗn hợp thiên dầu; Da mụn, da nhạy cảm, lỗ chân lông to; Da mất cân bằng, thường xuyên kích ứng hoặc bị bít tắc." },
  { id: 'espeauna_product_refreshing_ampoule_50ml_luuy', text: "Lưu ý khi sử dụng Tinh Chất Làm Dịu Và Giảm Nhờn ESPEAUNA REFRESHING AMPOULE 50ml: Không dùng trên da có vết thương hở lớn. Tránh vùng mắt. Ngưng dùng nếu có dấu hiệu kích ứng. Bảo quản nơi thoáng mát, tránh ánh nắng trực tiếp." },

  // Chính sách chung
  { id: 'espeauna_chinhsach_chung', text: "Chính sách của Espeauna: Cam kết hàng chính hãng. Miễn phí giao hàng tối đa 30K. Đổi trả hàng trong vòng 7 ngày." },
  // Thông tin liên hệ
  { id: 'espeauna_lienhe', text: "Để được tư vấn hoặc đặt hàng sản phẩm Espeauna, quý khách vui lòng liên hệ qua số điện thoại 096.128.6399 hoặc gửi email về địa chỉ vngenmart@gmail.com. Địa chỉ: Khúc Thuỷ, Cự Khê, Thanh Oai, Hà Nội. Hotline kỹ thuật: 096.128.6399." },
  // Thông tin kết nối khác
  { id: 'espeauna_thongtin_khac', text: "Espeauna cũng có các kênh kết nối khác như Fanpage Facebook (espeauna.official), Shopee, Lazada. Bạn có thể theo dõi website và fanpage để cập nhật các chương trình khuyến mãi hấp dẫn."}
];

// Hàm chuẩn hóa tiếng Việt không dấu (đặt ở global scope)
const normalizeVietnamese = (text) => {
  text = text.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Loại bỏ dấu
  text = text.replace(/đ/g, "d").replace(/Đ/g, "D"); // Xử lý chữ đ/d
  return text.toLowerCase();
};

/**
 * Hàm để lưu tin nhắn vào Firestore.
 * @param {string} senderId - ID của người gửi (PSID của Messenger).
 * @param {string} role - Vai trò (user hoặc bot).
 * @param {string} text - Nội dung tin nhắn.
 * @param {string} [productContextId] - ID của sản phẩm đang được thảo luận (nếu có).
 */
async function saveMessage(senderId, role, text, productContextId = null) {
  if (!db) {
    console.error('Firestore chưa được khởi tạo.');
    return;
  }
  try {
    const { collection, addDoc } = require('firebase/firestore');
    await addDoc(collection(db, `artifacts/${appId}/users/${senderId}/messages`), {
      role,
      text,
      timestamp: new Date(),
      productContext: productContextId,
    });
    console.log(`Đã lưu tin nhắn từ ${role} (${senderId}) vào Firestore.`);
  } catch (error) {
    console.error('Lỗi khi lưu tin nhắn vào Firestore:', error);
  }
}

/**
 * Hàm để lấy ngữ cảnh sản phẩm hiện tại của người dùng từ Firestore.
 * @param {string} senderId - ID của người gửi.
 * @returns {Promise<string|null>} - ID của sản phẩm hoặc null nếu không có.
 */
async function getProductContext(senderId) {
  if (!db) {
    console.error('Firestore chưa được khởi tạo.');
    return null;
  }
  try {
    const { doc, getDoc } = require('firebase/firestore');
    const userDocRef = doc(db, `artifacts/${appId}/users/${senderId}`);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      return userDocSnap.data().currentProductContext || null;
    }
    return null;
  } catch (error) {
    console.error('Lỗi khi lấy ngữ cảnh sản phẩm từ Firestore:', error);
    return null;
  }
}

/**
 * Hàm để đặt ngữ cảnh sản phẩm hiện tại cho người dùng vào Firestore.
 * @param {string} senderId - ID của người gửi.
 * @param {string|null} productContextId - ID của sản phẩm hoặc null để xóa ngữ cảnh.
 */
async function setProductContext(senderId, productContextId) {
  if (!db) {
    console.error('Firestore chưa được khởi tạo.');
    return;
  }
  try {
    const { doc, setDoc } = require('firebase/firestore');
    const userDocRef = doc(db, `artifacts/${appId}/users/${senderId}`);
    await setDoc(userDocRef, { currentProductContext: productContextId }, { merge: true });
    console.log(`Đã đặt ngữ cảnh sản phẩm cho ${senderId}: ${productContextId}`);
  } catch (error) {
    console.error('Lỗi khi đặt ngữ cảnh sản phẩm vào Firestore:', error);
  }
}


/**
 * Hàm đơn giản để truy xuất các đoạn văn bản liên quan dựa trên từ khóa.
 * Trong một hệ thống RAG thực tế, hàm này sẽ sử dụng embeddings và cơ sở dữ liệu vector.
 * @param {string} query - Câu hỏi của người dùng.
 * @param {Array<Object>} knowledgeBase - Mảng các đối tượng chứa nội dung văn bản.
 * @param {number} numChunks - Số lượng đoạn văn bản tối đa muốn truy xuất.
 * @returns {Array<string>} - Mảng các đoạn văn bản liên quan.
 */
function retrieveRelevantChunks(query, knowledgeBase, numChunks = 3) {
  const lowerCaseQuery = query.toLowerCase();
  const relevantChunks = [];
  // Danh sách từ dừng tiếng Việt mở rộng để cải thiện khả năng lọc
  const stopWords = new Set([
    'là', 'gì', 'có', 'không', 'và', 'của', 'tôi', 'bạn', 'sản', 'phẩm', 'này', 'cho', 'từ', 'với', 'như', 'để', 'hay', 'về', 'nào', 'thế', 'nào', 'sao', 'muốn', 'biết',
    'em', 'chị', 'shop', 'mình', 'cần', 'tìm', 'hỏi', 'giá', 'bao', 'nhiêu', 'công', 'dụng', 'thành', 'phần', 'cách', 'sử', 'dụng', 'đối', 'tượng', 'lưu', 'ý', 'thương', 'hiệu',
    'ở', 'đâu', 'liên', 'hệ', 'số', 'điện', 'thoại', 'email', 'website', 'facebook', 'shopee', 'lazada', 'chính', 'sách', 'giao', 'hàng', 'đổi', 'trả', 'hàng', 'tồn', 'kho',
    'nước', 'gel', 'kem', 'tinh', 'chất', 'bọt', 'rửa', 'mặt', 'dầu', 'tẩy', 'trang', 'dung', 'dịch', 'làm', 'sạch', 'sâu', 'dịu', 'giảm', 'nhờn', 'phục', 'hồi', 'ẩm', 'trắng', 'mờ', 'thâm', 'nám', 'collagen', 'tái', 'tạo', 'da', 'khoáng', 'biển'
  ]);
  
  const normalizedQuery = normalizeVietnamese(query);
  const keywords = normalizedQuery.split(/\s+/)
                               .filter(word => word.length > 2 && !stopWords.has(word));

  // Nếu không có từ khóa nào sau khi lọc, sử dụng toàn bộ truy vấn đã chuẩn hóa
  const searchTerms = keywords.length > 0 ? keywords : [normalizedQuery];

  // Duyệt qua từng chunk và kiểm tra sự xuất hiện của từ khóa
  for (const chunk of knowledgeBase) {
    let score = 0;
    const lowerCaseChunkText = normalizeVietnamese(chunk.text); // Chuẩn hóa cả văn bản trong chunk

    for (const term of searchTerms) {
      if (lowerCaseChunkText.includes(term)) {
        score++; // Tăng điểm nếu chunk chứa từ khóa
      }
    }

    if (score > 0) {
      relevantChunks.push({ text: chunk.text, score: score });
    }
  }

  // Sắp xếp các chunk theo điểm số giảm dần và lấy số lượng mong muốn
  relevantChunks.sort((a, b) => b.score - a.score);
  return relevantChunks.slice(0, numChunks).map(item => item.text);
}

// ✅ Endpoint để xác minh Webhook của Facebook
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook xác minh thành công!');
    return res.status(200).send(challenge);
  } else {
    console.error('❌ Xác minh webhook thất bại: Token không khớp hoặc mode sai.');
    return res.sendStatus(403);
  }
});

// 📩 Endpoint để xử lý các sự kiện (tin nhắn) từ Messenger
app.post('/webhook', async (req, res) => {
  const body = req.body;

  if (body.object === 'page') {
    for (const entry of body.entry) {
      const webhook_event = entry.messaging[0];
      const sender_psid = webhook_event.sender.id;

      if (webhook_event.message && webhook_event.message.text) {
        const userMessage = webhook_event.message.text;
        console.log(`Tin nhắn từ người dùng (${sender_psid}): "${userMessage}"`);

        let geminiReplyText = "Xin lỗi, tôi không thể xử lý yêu cầu của bạn lúc này. Vui lòng thử lại sau.";
        let isProductRelatedQuery = false;
        let currentProductContext = null;

        // Lấy ngữ cảnh sản phẩm hiện tại từ Firestore
        currentProductContext = await getProductContext(sender_psid);
        console.log(`Ngữ cảnh sản phẩm hiện tại cho ${sender_psid}: ${currentProductContext}`);

        // Xác định xem câu hỏi có liên quan đến sản phẩm hay không
        const productKeywords = ['sản phẩm', 'giá', 'công dụng', 'thành phần', 'sử dụng', 'đối tượng', 'lưu ý', 'mua', 'đặt hàng', 'ship', 'thanh toán', 'đổi trả', 'bảo hành'];
        const normalizedUserMessage = normalizeVietnamese(userMessage);
        for (const keyword of productKeywords) {
            if (normalizedUserMessage.includes(normalizeVietnamese(keyword))) {
                isProductRelatedQuery = true;
                break;
            }
        }
        
        // Lưu tin nhắn của người dùng vào Firestore
        await saveMessage(sender_psid, 'user', userMessage, currentProductContext);

        try {
          // --- TRUY XUẤT THÔNG TIN LIÊN QUAN ---
          let relevantChunks = retrieveRelevantChunks(userMessage, KNOWLEDGE_BASE_CHUNKS, 3);

          // Nếu có ngữ cảnh sản phẩm, ưu tiên các chunk liên quan đến sản phẩm đó
          if (currentProductContext && !normalizedUserMessage.includes(normalizeVietnamese('sản phẩm khác'))) {
            const productSpecificChunks = KNOWLEDGE_BASE_CHUNKS.filter(chunk => chunk.id.includes(currentProductContext));
            // Kết hợp các chunk chung và các chunk cụ thể của sản phẩm, ưu tiên sản phẩm cụ thể
            relevantChunks = [...new Set([...productSpecificChunks.map(c => c.text), ...relevantChunks])];
            console.log(`Đã thêm chunk từ ngữ cảnh sản phẩm: ${currentProductContext}`);
          }

          let promptForGemini;
          if (relevantChunks.length > 0) {
            // Xây dựng prompt để hướng dẫn Gemini chỉ trả lời dựa trên thông tin được cung cấp
            // và yêu cầu rõ ràng khi không đủ thông tin.
            promptForGemini = `Dựa vào thông tin sau đây về Espeauna, hãy trả lời câu hỏi của người dùng bằng tiếng Việt. Nếu thông tin được cung cấp không đủ để trả lời câu hỏi, hãy nói rõ rằng bạn không có đủ thông tin và mời người dùng để lại số điện thoại để được tư vấn chi tiết hơn.
            
            Thông tin tham khảo từ Espeauna:
            """
            ${relevantChunks.join('\n\n')}
            """
            
            Câu hỏi của người dùng: "${userMessage}"`;
          } else {
            // Cho phép Gemini "chém gió" cho các câu hỏi không liên quan đến sản phẩm
            // hoặc khi không tìm thấy thông tin liên quan trong RAG
            promptForGemini = userMessage; 
          }

          // Xây dựng URL cho Gemini API
          const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
          
          // Gửi yêu cầu POST đến Gemini API
          const geminiResponse = await axios.post(geminiApiUrl, {
            contents: [{ 
              role: "user", 
              parts: [{ text: promptForGemini }] 
            }],
          }, {
            headers: {
              'Content-Type': 'application/json'
            }
          });

          // Trích xuất phản hồi từ Gemini
          if (geminiResponse.data && 
              geminiResponse.data.candidates && 
              geminiResponse.data.candidates.length > 0 &&
              geminiResponse.data.candidates[0].content &&
              geminiResponse.data.candidates[0].content.parts &&
              geminiResponse.data.candidates[0].content.parts.length > 0) {
            const rawGeminiText = geminiResponse.data.candidates[0].content.parts[0].text;
            
            // Kiểm tra xem phản hồi có phải là JSON string không (ví dụ: nếu model trả về structured data)
            try {
                const parsedJson = JSON.parse(rawGeminiText);
                // Nếu là JSON, bạn có thể định dạng lại nó thành chuỗi thân thiện với người dùng
                if (typeof parsedJson === 'object') {
                    geminiReplyText = JSON.stringify(parsedJson, null, 2); // Hoặc định dạng tùy chỉnh
                } else {
                    geminiReplyText = rawGeminiText;
                }
            } catch (e) {
                geminiReplyText = rawGeminiText; // Nếu không phải JSON, sử dụng nguyên văn
            }

            // Cập nhật ngữ cảnh sản phẩm nếu một sản phẩm mới được nhắc đến
            const productNames = KNOWLEDGE_BASE_CHUNKS.filter(c => c.id.startsWith('espeauna_product_') && c.id.endsWith('_name')).map(c => normalizeVietnamese(c.text));
            let newProductIdentified = null;
            for (const pName of productNames) {
                if (normalizedUserMessage.includes(pName)) {
                    // Tìm ID sản phẩm tương ứng
                    const foundProductChunk = KNOWLEDGE_BASE_CHUNKS.find(c => normalizeVietnamese(c.text) === pName);
                    if (foundProductChunk) {
                        newProductIdentified = foundProductChunk.id.replace('_name', ''); // Lấy ID sản phẩm
                        break;
                    }
                }
            }
            // Nếu người dùng hỏi về một sản phẩm cụ thể, cập nhật ngữ cảnh
            if (newProductIdentified) {
                await setProductContext(sender_psid, newProductIdentified);
            } else if (normalizedUserMessage.includes(normalizeVietnamese('sản phẩm khác')) || normalizedUserMessage.includes(normalizeVietnamese('tôi muốn hỏi về cái khác'))) {
                // Nếu người dùng muốn hỏi về sản phẩm khác hoặc chủ đề khác, xóa ngữ cảnh
                await setProductContext(sender_psid, null);
            }


            // Thêm logic kiểm tra "chém gió" và yêu cầu số điện thoại cho các câu hỏi liên quan đến sản phẩm
            if (isProductRelatedQuery) {
                const normalizedGeminiReply = normalizeVietnamese(geminiReplyText);
                // Các cụm từ khóa cho thấy Gemini không có đủ thông tin hoặc đang "chém gió"
                const fallbackKeywords = [
                    'tôi không có đủ thông tin',
                    'tôi không tìm thấy thông tin',
                    'tôi không thể tìm thấy thông tin',
                    'xin lỗi tôi không có thông tin',
                    'tôi không biết',
                    'tôi không thể trả lời câu hỏi này'
                ];
                let shouldFallbackToPhoneNumber = false;
                for (const keyword of fallbackKeywords) {
                    if (normalizedGeminiReply.includes(normalizeVietnamese(keyword))) {
                        shouldFallbackToPhoneNumber = true;
                        break;
                    }
                }

                if (shouldFallbackToPhoneNumber) {
                    geminiReplyText = `Xin lỗi, tôi không có đủ thông tin để trả lời câu hỏi này một cách chi tiết. Vui lòng để lại số điện thoại, chúng tôi sẽ liên hệ tư vấn kỹ càng hơn cho bạn.`;
                }
            }

          } else {
            console.error("Cấu trúc phản hồi từ Gemini API không mong muốn:", JSON.stringify(geminiResponse.data, null, 2));
            geminiReplyText = "Đã xảy ra lỗi khi nhận phản hồi từ Gemini. Vui lòng thử lại.";
          }
          
          console.log(`Phản hồi từ Gemini: "${geminiReplyText}"`);
          // Lưu phản hồi của bot vào Firestore
          await saveMessage(sender_psid, 'bot', geminiReplyText, currentProductContext);

        } catch (error) {
          console.error("Lỗi khi gọi Gemini API:", error.response ? error.response.data : error.message);
          geminiReplyText = "Đã xảy ra lỗi khi kết nối với Gemini API. Vui lòng kiểm tra lại khóa API hoặc trạng thái dịch vụ.";
          // Lưu phản hồi lỗi của bot vào Firestore
          await saveMessage(sender_psid, 'bot', geminiReplyText, currentProductContext);
        }

        // Gửi lại phản hồi từ Gemini cho người dùng Messenger
        try {
          await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
            recipient: { id: sender_psid },
            message: { text: geminiReplyText }
          });
          console.log(`Đã gửi phản hồi cho người dùng ${sender_psid}`);
        } catch (error) {
          console.error("Lỗi khi gửi tin nhắn Messenger:", error.response ? error.response.data : error.message);
        }
      } else {
        console.log(`Nhận được sự kiện không phải tin nhắn văn bản từ ${sender_psid}:`, webhook_event);
      }
    }

    res.status(200).send('EVENT_RECEIVED');
  } else {
    console.warn('Nhận được sự kiện không phải từ trang Facebook:', body.object);
    res.sendStatus(404);
  }
});

// 🔁 Khởi động server Express
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Webhook server đang chạy trên cổng ${PORT}`);
  console.log('💡 Đảm bảo bạn đã cấu hình các biến môi trường (VERIFY_TOKEN, PAGE_ACCESS_TOKEN, GEMINI_API_KEY) chính xác.');
  console.log('💡 KNOWLEDGE_BASE_CHUNKS đã được cập nhật với thông tin từ trang sản phẩm Espeauna.');
});
