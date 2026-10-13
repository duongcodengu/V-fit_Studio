# 📘 TÀI LIỆU GIẢI THÍCH CHI TIẾT DỰ ÁN V-FIT (AI VIRTUAL TRY-ON)
> Dành cho người mới bắt đầu lập trình (Beginner-friendly Guide)

---

## 1. Vấn đề ban đầu & Tại sao phải chuyển đổi từ `main.py`?

### File `Demo_Run/main.py` của bạn làm gì?
File ban đầu của bạn là một **script chạy bằng dòng lệnh (CLI - Command Line Interface)**:
1. Bạn chạy lệnh: `python main.py`.
2. Script mở cố định (hardcode) 1 ảnh người mẫu `anh2.png` và 1 ảnh váy `vay1.png` từ ổ cứng.
3. Gửi 2 ảnh này sang AI của Replicate bằng lệnh `replicate.run(...)`.
4. Nhận ảnh kết quả và lưu cố định vào file `my-image.png`.
5. Script kết thúc và **tắt luôn**.

### Vấn đề gặp phải:
- Người dùng cuối sử dụng **trình duyệt web** (Frontend với giao diện HTML/CSS/JS). Trình duyệt của họ không thể tự bấm chuột chạy lệnh `python main.py` trên máy tính được.
- Người dùng muốn bấm **tải ảnh của chính họ** lên, hoặc bấm chọn các mẫu áo quần khác nhau trên web, chứ không phải lúc nào cũng cố định `anh2.png` và `vay1.png`.
- Vì vậy, ta cần một **"Người phục vụ" (Web Server Backend)** luôn luôn túc trực 24/7 để:
  - Chờ trình duyệt gửi yêu cầu (Request): *"Tôi muốn thử chiếc áo này lên người mẫu này!"*.
  - Backend nhận ảnh, gọi Replicate AI xử lý.
  - Backend trả kết quả (Response) về cho trình duyệt hiển thị ngay lập tức lên màn hình.

---

## 2. Các thư viện mới được thêm vào và vai trò của từng thư viện

Trong file môi trường ảo `.venv`, các thư viện sau đã được cài đặt:

| Tên thư viện | Vai trò (Giải thích dễ hiểu) |
| :--- | :--- |
| **`fastapi`** | Là bộ khung (Framework) giúp viết Web Server bằng Python một cách nhanh chóng. Nó tạo ra các cổng nhận dữ liệu gọi là **API Endpoints** (như `/api/try-on`, `/api/catalog`). |
| **`uvicorn`** | Là "cỗ máy" đứng sau vận hành FastAPI, giúp mở cổng mạng (port `8000`) trên máy tính để trình duyệt có thể truy cập vào `http://localhost:8000`. |
| **`python-multipart`** | Thư viện hỗ trợ nhận file tải lên từ form web (khi người dùng bấm nút Upload ảnh từ máy tính gửi lên server). |
| **`replicate`** | *(Đã có từ trước)* Thư viện chính thức của nền tảng Replicate, dùng để gọi model AI `prunaai/p-image-try-on`. |
| **`python-dotenv`** | *(Đã có từ trước)* Đọc file ẩn `.env` để lấy mã bí mật `REPLICATE_API_TOKEN` mà không cần viết lộ token trong code. |

---

## 3. So sánh trực quan: `main.py` cũ vs `backend/server.py` mới

Hãy xem các đoạn code tương ứng được chuyển đổi như thế nào:

### A. Đọc Token & Cấu hình môi trường
* **Code cũ (`main.py`):**
  ```python
  from dotenv import load_dotenv
  load_dotenv()
  import replicate
  ```
* **Code mới (`backend/server.py`):**
  ```python
  from dotenv import load_dotenv
  from fastapi import FastAPI, UploadFile, File, Form
  from fastapi.middleware.cors import CORSMiddleware
  import replicate

  # Load file .env ở thư mục gốc
  BASE_DIR = Path(__file__).resolve().parent.parent
  load_dotenv(BASE_DIR / ".env")

  # Khởi tạo Web Server
  app = FastAPI(title="V-Fit AI Virtual Try-On API")
  ```
  👉 **Khác biệt**: Ngoài việc load token, ta tạo ra ứng dụng web `app` và cấu hình **CORS** (cho phép trình duyệt gửi dữ liệu đến server mà không bị trình duyệt chặn bảo mật).

---

### B. Cách lấy ảnh Người mẫu & Trang phục
* **Code cũ (`main.py` - Cố định 1 ảnh):**
  ```python
  person_image = open("./Image/Person_image/anh2.png", "rb")
  garment_image1 = open("./Image/Garment_image/vay1.png", "rb")
  ```
* **Code mới (`backend/server.py` - Linh hoạt theo người dùng):**
  ```python
  @app.post("/api/try-on")
  async def process_try_on(
      person_sample: Optional[str] = Form(None),      # Nếu chọn ảnh mẫu có sẵn
      person_file: Optional[UploadFile] = File(None), # Hoặc nếu tự upload ảnh
      garment_samples: Optional[str] = Form(None),
      garment_files: Optional[List[UploadFile]] = File(None),
      turbo: bool = Form(False)                       # Tùy chọn tốc độ nhanh
  ):
      # Nếu người dùng tự upload: đọc file tải lên
      # Nếu người dùng chọn mẫu: mở file mẫu từ thư mục ./Image/
  ```
  👉 **Khác biệt**: Server không fix cứng ảnh nữa. Người dùng chọn ảnh nào trên web thì server xử lý đúng ảnh đó!

---

### C. Gọi AI Replicate
* **Code cũ (`main.py`):**
  ```python
  output = replicate.run(
      "prunaai/p-image-try-on",
      input={
          "no_op": False,
          "turbo": False,
          "person_image": person_image,
          "garment_images": [garment_image1, garment_image2],
          "output_quality": 95,
          "preserve_input_size": True
      }
  )
  ```
* **Code mới (`backend/server.py`):**
  Code gọi model AI giữ **nguyên vẹn logic của bạn**, nhưng các giá trị như `turbo`, `output_format`, danh sách ảnh trang phục được nhận trực tiếp từ lựa chọn của người dùng trên web.

---

### D. Trả về kết quả
* **Code cũ (`main.py` - Lưu đè vào 1 file duy nhất):**
  ```python
  with open("my-image.png", "wb") as file:
      file.write(output.read())
  ```
* **Code mới (`backend/server.py` - Lưu riêng từng lần và trả link về web):**
  ```python
  # Tạo tên file riêng cho mỗi lần thử đồ (ví dụ: output_a1b2c3d4.jpg)
  output_filename = f"output_{uuid.uuid4().hex[:8]}.{output_format}"
  output_filepath = OUTPUT_DIR / output_filename

  with open(output_filepath, "wb") as out_f:
      out_f.write(output.read())

  # Trả đường link ảnh về cho Frontend hiển thị
  return {
      "success": True,
      "output_url": f"/static/images/Output_image/{output_filename}",
      "processing_time": f"{elapsed}s"
  }
  ```

---

## 4. Frontend đã được liên kết như thế nào? (`app.js`)

Trước đây, giao diện web trong `ai-tryon-platform/app.js` chỉ là các nút bấm tĩnh không có chức năng. Ta đã thêm logic để nó "nói chuyện" với server:

1. **Lấy danh mục sản phẩm từ server (`/api/catalog`)**:
   Khi mở trang web, Javascript tự động hỏi server: *"Trong kho có những mẫu người và quần áo nào?"*. Server trả về danh sách, Javascript vẽ các thẻ ảnh lên giao diện.

2. **Gửi lệnh thử đồ (`handleRunTryOn`)**:
   Khi bạn nhấn nút **"✨ Generate Virtual Try-On"**:
   - Javascript gom ảnh đã chọn vào một đối tượng `FormData`.
   - Gửi yêu cầu HTTP POST đến `http://localhost:8000/api/try-on`:
     ```javascript
     const response = await fetch('http://localhost:8000/api/try-on', {
         method: 'POST',
         body: formData
     });
     const data = await response.json();
     ```
   - Bật vòng xoay chờ (Spinner) và dòng chữ thông báo tiến trình.

3. **Hiển thị kết quả**:
   - Khi server xử lý xong và trả về `output_url`, Javascript cập nhật giao diện, hiển thị ảnh gốc bên cạnh ảnh kết quả thử đồ (Before / After) cùng nút tải ảnh về máy.

---

## 5. Luồng hoạt động hoàn chỉnh từ A đến Z (Flowchart)

```text
[ Người dùng trên Trình duyệt ]
          │
          ├─ 1. Bấm chọn Ảnh người mẫu + Chọn Trang phục (hoặc Upload)
          ├─ 2. Bấm nút "Generate Virtual Try-On"
          │
          ▼  (Gửi HTTP POST kèm file ảnh)
[ FastAPI Server (backend/server.py) ]
          │
          ├─ 3. Nhận ảnh, kiểm tra hợp lệ
          ├─ 4. Đọc token từ .env
          │
          ▼  (Gọi API qua Internet)
[ Replicate AI Cloud (prunaai/p-image-try-on) ]
          │
          ├─ 5. GPU AI tính toán, ghép quần áo vào người mẫu
          │
          ▼  (Trả về dữ liệu ảnh mới)
[ FastAPI Server (backend/server.py) ]
          │
          ├─ 6. Lưu ảnh vào thư mục Image/Output_image/
          ├─ 7. Ghi nhật ký vào lịch sử (Dashboard)
          │
          ▼  (Trả về JSON: { "output_url": "/static/images/..." })
[ Người dùng trên Trình duyệt ]
          │
          └─ 8. Giao diện nhận được ảnh, hiển thị kết quả & nút Download
```

---

## 6. Cách vận hành dự án

Để chạy toàn bộ hệ thống (cả Backend và Frontend) chỉ bằng **1 câu lệnh duy nhất**:

```bash
./.venv/bin/python run_server.py
```

Sau đó mở trình duyệt:
- 🌐 **Giao diện người dùng**: [http://localhost:8000/static/frontend/index.html](http://localhost:8000/static/frontend/index.html)
- 📋 **Tài liệu API tự động (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
