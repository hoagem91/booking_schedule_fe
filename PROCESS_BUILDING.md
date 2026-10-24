Để đội ngũ Frontend (FE) hiểu rõ và thiết kế giao diện sát với nghiệp vụ Backend, **`Appointment` (Lịch hẹn khám)** cần được xem là **entity trung tâm của toàn bộ hệ thống**. Mọi luồng tương tác từ Bệnh nhân, Bác sĩ, Lễ tân cho đến Thanh toán và Đánh giá đều xoay quanh bảng dữ liệu này.

Dưới đây là tài liệu phân tích chi tiết quy trình nghiệp vụ và hướng dẫn thiết kế UI/UX dành riêng cho team FE.

---

### 1. Mô hình Dữ liệu và Các mối liên kết của `Appointment`

Bản ghi `Appointment` kết nối trực tiếp 5 thành phần nghiệp vụ:
* **`patient_id`**: Hồ sơ bệnh nhân thực hiện đặt lịch.
* **`doctor_id`**: Bác sĩ phụ trách ca khám.
* **`service_id`**: Dịch vụ khám bệnh được chọn (có giá `price` và thời lượng `duration_minutes`).
* **`time_slot_id`**: Khung giờ khám cụ thể trong ca làm việc của bác sĩ.
* **`promotion_id`** *(Optional)*: Mã giảm giá được áp dụng.

---

### 2. Vòng đời Trạng thái & Quy tắc Hiển thị UI (`AppointmentStatus`)

Trạng thái của lịch hẹn quyết định các nút bấm (Actions) và màu sắc nhãn (Badge Status) hiển thị trên màn hình:

```text
[ PENDING ] ──(Xác nhận)──> [ CONFIRMED ] ──(Bắt đầu khám)──> [ IN_PROGRESS ] ──(Hoàn tất)──> [ COMPLETED ]
     │                           │
     ├──────────(Hủy)────────────┴──────────(Vắng mặt)────────────────────────────────────────> [ CANCELLED / NO_SHOW ]
```

* **`PENDING` (Chờ xác nhận - Badge Vàng)**: Lịch hẹn vừa được khởi tạo từ Client.
  * *FE Action*: Bệnh nhân hoặc Lễ tân có thể bấm **[Hủy lịch]**. Admin/Lễ tân có nút **[Xác nhận]**.
* **`CONFIRMED` (Đã xác nhận - Badge Xanh lá)**: Lịch hẹn đã được xác nhận hoặc đã thanh toán thành công.
  * *FE Action*: Lễ tân có nút **[Bắt đầu khám]** khi bệnh nhân tới phòng khám. Bệnh nhân vẫn có thể bấm **[Hủy lịch]** nếu còn trong thời hạn quy định.
* **`IN_PROGRESS` (Đang khám - Badge Xanh dương)**: Bệnh nhân đang trong phòng khám cùng bác sĩ.
  * *FE Action*: Bác sĩ hoặc Lễ tân có nút **[Hoàn thành ca khám]**.
* **`COMPLETED` (Đã hoàn thành - Badge Xanh đậm)**: Ca khám kết thúc thành công.
  * *FE Action*: Mở quyền cho bệnh nhân bấm **[Viết đánh giá (Review)]** hoặc **[Thanh toán / Xem hóa đơn]**.
* **`CANCELLED` (Đã hủy - Badge Đỏ)** / **`NO_SHOW` (Vắng mặt - Badge Xám)**: Lịch hẹn bị hủy hoặc bệnh nhân không đến.
  * *FE Action*: Khóa toàn bộ nút thao tác.

---

### 3. Thiết kế Luồng Đặt Lịch Khám cho Client (Patient Booking Wizard)

Giao diện đặt lịch nên được thiết kế dưới dạng **Wizard / Stepper 4 bước** để tối ưu trải nghiệm :

#### **Bước 1: Chọn Chuyên khoa & Dịch vụ khám**
* FE gọi API danh mục Dịch vụ. Render danh sách dạng Card bao gồm Tên dịch vụ (`name`), Giá tiền (`price`) và Thời lượng khám (`duration_minutes`).

#### **Bước 2: Chọn Bác sĩ & Ngày khám**
* FE hiển thị Datepicker chọn ngày khám (`appointment_date`) và danh sách Bác sĩ thuộc Chuyên khoa tương ứng.

#### **Bước 3: Chọn Khung giờ (`TimeSlot Grid`)**
* FE gọi API lấy danh sách `time_slots` thuộc ca làm việc (`doctor_schedules`) của bác sĩ trong ngày đã chọn.
* **Logic Render Khung giờ trên UI**:
  * Nếu `status == 'AVAILABLE'` và `booked_count < max_patients`: Render Button **Màu xanh / Cho phép chọn**.
  * Nếu `status == 'FULL'` hoặc `booked_count >= max_patients`: Render Button **Màu xám, bị khóa (Disabled) kèm nhãn "Đã kín"**.

#### **Bước 4: Nhập thông tin & Xác nhận (`POST /api/admin/appointments` hoặc Public Booking API)**
* Form hiển thị tóm tắt: Tên Bác sĩ, Dịch vụ, Ngày giờ, Giá tiền, Ô nhập Lý do khám (`reason`) và Ô nhập Mã giảm giá (`promotion_id`).
* **Xử lý Response & Lỗi tranh chấp (Concurrency)**:
  * Nếu Backend trả về thành công (`code = 1000`): Hiển thị Popup chúc mừng kèm Mã lịch hẹn (`appointment_code`). Chuyển hướng về màn hình "Lịch hẹn của tôi".
  * Nếu Backend trả về lỗi `400 Bad Request` (do ô giờ vừa bị người khác đặt kín trong vài miligiây): Alert *"Khung giờ này vừa có người đặt. Vui lòng chọn khung giờ khác!"* và tự động load lại danh sách `time_slots` ở Bước 3.

---

### 4. Thiết kế Màn hình Quản lý Lịch hẹn (Dashboard)

#### **A. Giao diện phía Bệnh nhân (`My Appointments`)**
* Thiết kế TabControl phân loại theo trạng thái: `Tất cả`, `Chờ xác nhận`, `Đã xác nhận`, `Đã hoàn thành`, `Đã hủy`.
* Mỗi Card lịch hẹn hiển thị: Mã lịch hẹn (`appointment_code`), Tên bác sĩ, Dịch vụ, Ngày giờ khám, Lý do và Nút **[Hủy lịch]** (chỉ hiện khi status là `PENDING` hoặc `CONFIRMED`).

#### **B. Giao diện phía Admin / Lễ tân (`Appointment Management`)**
* Bảng dữ liệu (Table View) tích hợp thanh lọc (Filter):
  * Lọc theo khoảng ngày (`appointment_date`), theo Bác sĩ (`doctor_id`), Bệnh nhân (`patient_id`), hoặc Trạng thái (`status`).
* **Cấu hình Nút hành động trực tiếp trên Table (Dedicated Action APIs)**:
  * Bấm **[Xác nhận]** ➔ Gọi `PATCH /api/admin/appointments/{id}/confirm`.
  * Bấm **[Hủy lịch]** ➔ Mở Modal nhập lý do ➔ Gọi `PATCH /api/admin/appointments/{id}/cancel`.
  * Bấm **[Hoàn thành]** ➔ Gọi `PATCH /api/admin/appointments/{id}/complete`.

---

### 5. Tương tác Mở rộng sau khi Đặt lịch thành công

* **Thanh toán (`Payment`)**: Mô hình 1 `Appointment` liên kết với tối đa 01 `Payment`. Khi bệnh nhân thanh toán online hoặc lễ tân thu tiền mặt, trạng thái `Payment` chuyển `PAID` và tự động cập nhật `Appointment` sang `CONFIRMED`.
* **Đánh giá (`Review`)**: Sau khi trạng thái chuyển sang `COMPLETED`, màn hình chi tiết lịch hẹn phía Bệnh nhân sẽ hiển thị form cho phép gửi Đánh giá (Rating 1-5 sao + Comment).

---

💡 Đội ngũ FE có thể dựa vào quy trình này để dựng khung Component Angular, thiết kế Form Validation và cấu hình các HTTP Interceptor cho luồng đặt lịch hẹn.

---

## 6. Nhật ký triển khai giao diện bệnh nhân — 16–17/10/2026 (Asia/Bangkok)

### 6.1. Phạm vi và kiểm tra trước khi làm

Yêu cầu: xây dựng giao diện bệnh nhân đặt lịch và các thao tác còn thiếu; chưa triển khai quản lý lễ tân/admin, thanh toán hoặc hóa đơn.

Đã đọc tài liệu này, đối chiếu frontend và backend trong `../examine`, gồm AppointmentController, AppointmentService, AppointmentReviewService, các public controller chuyên khoa/dịch vụ/lịch bác sĩ/khung giờ và DTO tương ứng. Giữ nguyên các thay đổi có trước trong workspace; không sửa backend.

Các điểm khác giữa mô tả nghiệp vụ ban đầu và API hiện có:

- Bệnh nhân đặt lịch qua `POST /api/patient/appointments`; backend xác định bệnh nhân từ phiên đăng nhập. Frontend không gửi patientId/userId và không dùng endpoint admin.
- Lịch sử bệnh nhân chỉ hỗ trợ page/size/sort. Bộ lọc trạng thái được ghi rõ **“Lọc trong trang hiện tại”**; không coi đây là bộ lọc toàn bộ lịch sử.
- Public API khung giờ hiện chỉ trả các giờ còn nhận lịch; frontend vẫn xử lý đúng trường hợp FULL/CLOSED/UNAVAILABLE nếu có trong response, nhưng không tự tạo các giờ đã kín mà backend không trả.
- Lỗi hết chỗ là nghiệp vụ `7003`, backend có thể trả HTTP 409; không coi mọi lỗi HTTP 400/409 là lỗi kín chỗ.
- Hạn hủy phụ thuộc cấu hình CANCEL_BEFORE_HOURS của backend; frontend không gán cố định 24 giờ. Backend quyết định yêu cầu hủy có hợp lệ tại thời điểm gửi hay không.
- Chưa có API public tra cứu mã ưu đãi, nên chưa đưa ô áp mã vào luồng đặt lịch; dữ liệu ưu đãi có sẵn trên lịch hẹn vẫn được hiển thị.

### 6.2. Thiết kế và triển khai luồng đặt lịch

Route `/home` được thay từ trang chờ bằng màn đặt lịch có auth guard, dùng header/màu xanh hiện có. Không thay đổi đường dẫn các nút “Đặt lịch khám” đang có.

Giao diện gồm stepper 4 bước, phần nội dung bên trái và bản tóm tắt lựa chọn bên phải; trên điện thoại bố cục chuyển thành một cột.

1. **Chuyên khoa và dịch vụ:** chọn chuyên khoa, tải dịch vụ tương ứng; thẻ dịch vụ có tên, mô tả, giá, thời lượng và trạng thái được chọn. Dịch vụ chưa có giá hợp lệ không cho chọn; giá 0 được hỗ trợ.
2. **Bác sĩ và ngày khám:** chọn ngày từ hôm nay trở đi, tải các ca khám theo chuyên khoa và ngày; mỗi lựa chọn hiển thị bác sĩ, chuyên khoa, phòng, khoảng giờ và khả năng nhận lịch.
3. **Khung giờ:** tải giờ theo scheduleId; hiển thị thời gian và số chỗ còn lại/tổng chỗ; chặn giờ đã kín, không khả dụng hoặc đã qua. Có trạng thái rỗng và nút quay lại chọn ca khác.
4. **Thông tin và xác nhận:** hiển thị người khám từ hồ sơ hiện tại, lý do khám và ghi chú không bắt buộc, mỗi trường tối đa 2.000 ký tự; tóm tắt lựa chọn/chi phí và lưu ý trước khi đến khám.

Sau khi backend xác nhận thành công, hiển thị mã lịch hẹn cùng thông tin dịch vụ/bác sĩ/ngày/giờ; người dùng chọn xem chi tiết hoặc danh sách lịch hẹn. Không tự chuyển sang thanh toán.

Các xử lý bổ sung:

- Đổi chuyên khoa, dịch vụ hoặc ngày sẽ xóa các lựa chọn phụ thuộc không còn hợp lệ.
- Hủy request đọc cũ trước khi gửi request mới; hủy subscription khi component bị đóng.
- `load...()` gọi service trực tiếp; `finalize()` kết thúc loading; `subscribe()` kiểm tra response và gán signals, theo cách tổ chức trong check1.txt.
- Chặn gửi trùng khi đang tạo lịch. Nếu backend báo thành công nhưng thiếu thông tin xác nhận, yêu cầu kiểm tra lịch sử và khóa gửi lại để tránh tạo trùng.
- Khi nhận lỗi khung giờ không còn khả dụng, quay về bước 3, bỏ giờ đã chọn và tải lại danh sách. Lỗi trùng lịch bệnh nhân có thông báo riêng, không bị xử lý nhầm thành kín chỗ.
- Có loading, lỗi, thử lại và trạng thái rỗng cho các danh mục/lịch/giờ.

### 6.3. Lịch hẹn, chi tiết, hủy và đánh giá

- `/profile/appointments`: đổi tiêu đề thành “Lịch hẹn của tôi”, giữ phân trang/sắp xếp; bổ sung lọc trong trang theo cả 6 trạng thái, thông báo khi không có kết quả phù hợp và liên kết tới trang chi tiết.
- `/profile/appointments/:id`: thêm trang chi tiết dùng layout cá nhân hiện có; hiển thị mã/trạng thái, dịch vụ, bác sĩ, người khám, ngày giờ, giá, ưu đãi, lý do, ghi chú và thời điểm tạo/cập nhật.
- Hủy lịch: mở hộp thoại xác nhận từ lịch PENDING/CONFIRMED còn ở tương lai, nhập lý do không bắt buộc, tối đa 2.000 ký tự; gửi PATCH và cập nhật theo dữ liệu backend. Nếu đã quá hạn hủy, giữ hộp thoại và thông báo lỗi để người dùng biết; không tự giả định hủy thành công.
- Đánh giá: chỉ mở khi COMPLETED và reviewEligible=true; dùng radio 1–5 sao, nhận xét không bắt buộc/tối đa 2.000 ký tự; gửi một lần và cập nhật reviewEligible=false sau thành công.
- Dialog dùng native showModal để giữ focus; hỗ trợ Escape, nút đóng, bàn phím và nhãn truy cập. Khi đang gửi, khóa đóng dialog và chặn gửi lại.
- Chỉnh màu nhãn theo tài liệu: chờ xác nhận vàng, xác nhận xanh lá, đang khám xanh dương, hoàn thành xanh đậm, hủy đỏ và vắng mặt xám.
- Route chi tiết dùng client rendering như các trang cần phiên đăng nhập khác. Không thay đổi backend hoặc quyền quản trị.

### 6.4. Tổ chức service và API

AppointmentService tiếp tục kế thừa BaseService. Dùng `get()`/`post()` đã có để khai báo endpoint, params và payload; xử lý và gán dữ liệu tại component. Không thêm phương thức vào BaseService và không sửa hành vi các phương thức hiện có trong đợt này.

Riêng hủy lịch cần PATCH, trong khi BaseService chưa có wrapper PATCH: AppointmentService dùng `http`, `apiUrl`, `joinUrl`, `handleResponse(false)` được kế thừa để gọi đúng phương thức backend, không dùng PUT/POST thay thế.

| Chức năng | API |
| --- | --- |
| Chuyên khoa | GET /api/public/specialties |
| Dịch vụ | GET /api/public/services?specialtyId=... |
| Ca bác sĩ | GET /api/public/doctor-schedules?specialtyId=...&fromDate=...&toDate=... |
| Khung giờ | GET /api/public/time-slots?scheduleId=... |
| Tạo lịch | POST /api/patient/appointments |
| Lịch sử | GET /api/patient/appointments/my-history?page=...&size=...&sort=... |
| Chi tiết của mình | GET /api/patient/appointments/{id} |
| Hủy lịch của mình | PATCH /api/patient/appointments/{id}/cancel |
| Gửi đánh giá | POST /api/patient/appointments/{id}/review |

URL gốc dùng environment.api.baseUrl; interceptor xác thực và proxy hiện có tiếp tục được sử dụng. Response hỗ trợ code/result từ backend và errorCode/result theo model dùng chung; lỗi HTTP đã được BaseService chuyển thành response success=false vẫn được hiển thị tại component. Helper dùng chung chỉ xử lý nhãn, thông báo và giải mã text an toàn cho interpolation.

### 6.5. Tệp triển khai

- `src/app/pages/appointment-booking/appointment-booking.ts`, `.html`, `.css`: luồng đặt lịch.
- `src/app/pages/appointment-booking/booking-summary.ts`, `.html`, `.css`: tóm tắt lựa chọn và xác nhận thành công; tách riêng để giữ từng component dưới budget CSS hiện có.
- `src/app/pages/appointment-detail/appointment-detail.ts`, `.html`, `.css`: chi tiết/hủy/đánh giá.
- `src/app/pages/appointment-history/appointment-history.ts`, `.html`, `.css`: lọc trạng thái trong trang và đường dẫn chi tiết.
- `src/app/models/booking.model.ts`: model dữ liệu chọn lịch, request đặt lịch và đánh giá.
- `src/app/services/appointment/appointment.service.ts`, `src/app/constants/api-constants.ts`: khai báo API bệnh nhân và danh mục public.
- `src/app/utils/appointment-ui.utils.ts`: nhãn trạng thái, thông báo lỗi và giải mã entity.
- `src/app/app.routes.ts`, `src/app/app.routes.server.ts`, `src/app/pages/profile/profile.ts`: route và tiêu đề layout.
- Các file `appointment-booking.spec.ts`, `appointment-detail.spec.ts`, cấu hình `angular.json`/`tsconfig.spec.json`: đăng ký kiểm thử.
- `docs/qa/patient-appointments.cjs`: kiểm tra trình duyệt bằng fixture; chặn toàn bộ request API để không truy cập dữ liệu thật.
- `docs/screenshots/patient-appointments/`: ảnh minh họa dùng dữ liệu giả.

### 6.6. Kết quả kiểm tra và giới hạn

- `node node_modules/@angular/cli/bin/ng.js test --watch=false`: **32/32 kiểm thử đạt** trên ChromeHeadless, gồm App, lịch sử và các test đặt lịch/chi tiết/hủy/đánh giá mới.
- Kiểm thử mới bao phủ: khởi tạo danh mục sau render, đổi lựa chọn và xóa dữ liệu phụ thuộc, hủy request ngày cũ, khóa giờ kín/đã qua, payload không gửi định danh bệnh nhân, chống gửi trùng, nội dung quá dài, hết chỗ khi xác nhận, trùng lịch, response xác nhận thiếu dữ liệu, giờ hết hạn trước lúc gửi, route chi tiết không hợp lệ, hủy theo trạng thái/thời điểm, lỗi quá hạn hủy, điều kiện đánh giá và gửi đánh giá một lần.
- Kiểm tra trình duyệt bằng `docs/qa/patient-appointments.cjs`: **PASS**, thực hiện 25 request API giả lập, tạo 1 lịch và gửi 1 đánh giá trong fixture. Không có lỗi JavaScript trên trang.
- Đã đi qua đủ 4 bước đặt lịch, kiểm tra nút giờ FULL bị khóa, xác nhận thành công, mở chi tiết, hủy lịch, đóng dialog bằng Escape, gửi đánh giá, cập nhật quyền đánh giá và lọc lịch sử. Kiểm tra thêm tình huống hết chỗ tại bước xác nhận và quay lại chọn giờ.
- Kiểm tra desktop 1440px và điện thoại 390px/320px; xác nhận không tràn ngang ở các màn đã chụp. Lưu 19 ảnh minh họa trong `docs/screenshots/patient-appointments/`, gồm các bước đặt lịch, chi tiết, dialog hủy/đánh giá, lịch sử và lỗi hết chỗ.
- Đã mở và kiểm tra trực quan ảnh desktop/mobile của đặt lịch, xác nhận, đánh giá và trạng thái xung đột khung giờ.
- Build production thành công sau khi tách component tóm tắt; còn cảnh báo bundle initial khoảng 632 kB và một số CSS vượt mức cảnh báo 4 kB. Các component mới nằm dưới mức lỗi CSS 8 kB; không nâng budget để bỏ qua lỗi.
- Chưa chạy thao tác bằng tài khoản thật/backend thật; các kiểm thử ghi dữ liệu đều chạy trên fixture và không thay đổi dữ liệu backend.

Cách chạy lại kiểm tra trình duyệt: chạy `ng serve --host 127.0.0.1 --port 4305`, sau đó chạy `node docs/qa/patient-appointments.cjs`. Script dùng Playwright, Chrome và dữ liệu giả. Có thể cấu hình đường dẫn thư viện bằng PATIENT_QA_NODE_MODULES, đường dẫn Chrome bằng PATIENT_QA_CHROME và URL bằng PATIENT_QA_URL.

Ảnh tham khảo: [Đặt lịch desktop](docs/screenshots/patient-appointments/booking-desktop.png), [Xác nhận mobile](docs/screenshots/patient-appointments/booking-confirmation-mobile.png), [Đánh giá mobile](docs/screenshots/patient-appointments/appointment-review-mobile.png).

Các phần còn phụ thuộc backend: lọc trạng thái trên toàn bộ lịch sử, tra cứu/áp mã ưu đãi từ mã nhập, cung cấp thời hạn/quyền hủy cụ thể để frontend biết trước. Không hiển thị các nút thanh toán/hóa đơn hay chức năng quản lý lễ tân/admin.

## 7. Xây dựng nền tảng giao diện quản lý — 19/10/2026

### 7.1. Phạm vi và thứ tự thực hiện

Yêu cầu: triển khai lần lượt 8 mục tiêu đã thống nhất: (1) vai trò/phạm vi, (2) menu, (3) route/layout, (4) xác thực nội bộ, (5) giao diện responsive, (6) kiểm soát quyền, (7) trạng thái và trang lịch hẹn đầu tiên, (8) kiểm tra hồi quy. Ghi nhận từng kết quả tại mục này; giữ nguyên các mục lịch sử phía trên.

- Đang thực hiện: nền tảng quản lý dùng chung Angular/backend với bệnh nhân, layout riêng tại /management.
- Không sửa backend hoặc thay đổi quy trình khám trong đợt xây layout.
- Mã nguồn hiện có nhiều thay đổi của người dùng; chỉ chỉnh các file cần thiết, không reset/stage/commit các thay đổi có sẵn.

### 7.2. Khảo sát nghiệp vụ và hợp đồng backend

Đã đọc mã backend tại ../examine (chỉ đọc): UserController, UserResponse, RoleResponse, AuthenticationResponse, SecurityConfig, AdminAppointmentController, AppointmentService.

- POST /auth/token: trả token, expiryTime, authenticated, userId, patientId; KHÔNG trả roles.
- GET /users/me: trả id, username, fullName, email, phone, status và roles[{id,name}]. Dùng API này xác minh quyền, không suy luận từ patientId hay giải mã JWT để cấp quyền.
- Vai trò hiện có: SUPER_ADMIN, ADMIN, STAFF, DOCTOR, PATIENT. Chỉ tài khoản ACTIVE có vai trò nội bộ được vào layout.
- GET /api/admin/appointments: ADMIN/SUPER_ADMIN/STAFF; hỗ trợ keyword (mã lịch/tên bệnh nhân, chưa hỗ trợ số điện thoại), doctorId, patientId, status, fromDate, toDate, page, size, sort.
- GET /api/admin/appointments/{id}: cùng quyền như danh sách.
- Chưa có trạng thái CHECKED_IN, API đổi lịch, API bác sĩ chỉ xem lịch của mình, hay phạm vi cơ sở trong /users/me. Không tạo giao diện thao tác giả cho các chức năng này.
- Các guard cũ admin-only.guard.ts/normal.guard.ts mang nghiệp vụ bán hàng và tham chiếu mã không tồn tại; không đưa vào route mới.

### 7.3. Ma trận quyền của mốc layout

| Chức năng đã triển khai | SUPER_ADMIN/ADMIN | STAFF | DOCTOR | PATIENT |
| --- | --- | --- | --- | --- |
| Không gian làm việc, tài khoản cá nhân | Có | Có | Có | Không |
| Danh sách/chi tiết lịch hẹn quản lý | Có | Có | Không | Không |
| Trang mặc định | Không gian làm việc | Lịch hẹn | Không gian làm việc | 403 |

Menu chỉ chứa chức năng có giao diện và hợp đồng backend khả dụng. Các trang danh mục, tài khoản nhân viên, lịch bác sĩ, báo cáo và nhật ký nghiệp vụ thuộc các mốc tiếp theo; không hiển thị menu rỗng hoặc số liệu giả. Backend hiện cho ADMIN/STAFF xem toàn hệ thống, chưa thể tuyên bố đã phân quyền theo cơ sở.

### 7.4. Kết quả triển khai các mục tiêu 1–7

1. **Vai trò/phạm vi:** đã khai báo policy tập trung ở management.models.ts; nhận cả SUPER_ADMIN; hỗ trợ nhiều vai trò. Tài khoản không ACTIVE hoặc không có vai trò nội bộ bị chặn. Không tự tạo quyền cơ sở khi backend chưa cung cấp.
2. **Menu:** dùng cấu hình chung có permission; ADMIN/STAFF có danh sách lịch hẹn, DOCTOR chỉ có không gian làm việc và tài khoản. Không dựng số liệu dashboard giả. Menu danh mục, phân quyền, bác sĩ cá nhân và báo cáo chưa đưa vào sử dụng.
3. **Route/layout:** lazy-load /management; login và trang lỗi xác minh nằm ngoài layout bảo vệ; layout dùng guard cha/con. Route mặc định chuyển STAFF đến lịch hẹn, ADMIN/DOCTOR đến không gian làm việc. Có 403/404; route nội bộ không tồn tại chuyển 404. /management và /management/** dùng client rendering để đọc phiên trình duyệt, không prerender dữ liệu nội bộ.
4. **Xác thực:** GET /users/me sau đăng nhập và khi vào route bảo vệ; đối chiếu id với userId của phiên. Quyền chỉ lưu trong bộ nhớ, bị vô hiệu hóa khi thay đổi phiên. Request cũ không được gán profile cho phiên mới. Giữ deep link sau đăng nhập với danh sách đường dẫn nội bộ cho phép; từ chối URL ngoài, vòng lặp login và route chưa triển khai.
5. **Giao diện:** sidebar thu gọn trên desktop; menu dialog trên mobile có focus trap/Escape; header, breadcrumb, tiêu đề, tài khoản, đăng xuất, skip link. Khi guard xác minh quyền có trạng thái tải che nội dung. Màu xanh đồng bộ khu vực bệnh nhân, bố cục tối ưu cho vận hành.
6. **Quyền:** kiểm tra menu và route theo cùng policy; DOCTOR/PATIENT không gọi API danh sách quản lý. Backend vẫn là nơi thực thi quyền. Không tái sử dụng guard nghiệp vụ bán hàng cũ. AuthService bổ sung vùng đăng nhập để hết phiên/đăng xuất nội bộ về /management/login; luồng bệnh nhân vẫn về /login.
7. **Trang đầu tiên:** danh sách lịch hẹn gọi GET /api/admin/appointments, mặc định ngày hiện tại Asia/Bangkok; lọc mã lịch/tên bệnh nhân, trạng thái, ID bác sĩ, khoảng ngày; phân trang 10/20/50. Query được lưu trong URL và giữ khi vào chi tiết/quay về/tải lại. Có tải, rỗng, lỗi, thử lại; kiểm tra ngày thực, khoảng ngày, ID nguyên dương và giới hạn từ khóa. Hủy request danh sách cũ khi đổi bộ lọc để tránh dữ liệu trả chậm ghi đè. Chi tiết chỉ đọc từ GET /api/admin/appointments/{id}; phân biệt giá trị lịch với tiền thực thu.

Đợt này CHƯA thêm nút xác nhận/hủy/đổi lịch/tiếp nhận/bắt đầu/kết thúc khám. Dù một số API chuyển trạng thái đã tồn tại, đây là mốc layout và tra cứu; việc thêm thao tác sẽ đi cùng quy tắc trạng thái, xác nhận và xử lý xung đột ở mốc nghiệp vụ tiếp theo. Chưa triển khai chỉnh hồ sơ/đổi mật khẩu trong giao diện nội bộ; tài khoản hiển thị thông tin hiện tại và hướng dẫn liên hệ quản trị viên.

### 7.5. Kiểm tra bước đầu và sửa lỗi

- Build/compile phần quản lý: không có lỗi TypeScript/template.
- Phát hiện test lịch sử cũ truyền Event cho changeSort trong khi component nhận string; chỉ sửa lời gọi test sang select.value, giữ hành vi ứng dụng và kỳ vọng lỗi hiện có.
- Toàn bộ unit test: 49/49 đạt, gồm 13 test mới cho policy/guard/profile/đăng xuất/API bộ lọc và 36 test hiện có.
- Script docs/qa/management.cjs: PASS, 55 request fixture, không lỗi JavaScript/không gọi API ngoài fixture. Bao phủ deep link đăng nhập, staff/doctor/patient/admin, phân trang, lọc trạng thái, giữ query qua trang chi tiết/tải lại, request chậm, lỗi danh sách và thử lại, ngày không hợp lệ, mobile dialog/Escape, đổi tài khoản, thu gọn sidebar, lỗi xác minh, hết phiên, chặn URL trả về ngoài và 404.
- Đã mở ảnh để kiểm tra trực quan danh sách desktop/mobile và menu mobile. Bảng cuộn ngang bên trong vùng bảng; không tràn ngang toàn trang.
- Build production ban đầu bị chặn bởi budget CSS có sẵn của src/app/pages/appointment-booking/appointment-booking.css (9,41 kB > 8 kB), file không được chỉnh trong đợt quản lý. Không tăng budget để bỏ qua. Các cảnh báo bundle/CSS cũ vẫn còn; CSS layout quản lý khoảng 4,79 kB, dưới ngưỡng lỗi 8 kB.
- Rà soát bổ sung: khi URL bộ lọc không hợp lệ phải hủy cả request trước đó; không tự reload query cũ khi điều hướng bị hủy. Đã sửa và đang chạy lại kiểm tra.

### 7.6. Kết quả cuối mốc layout và tra cứu lịch hẹn

| Mục tiêu | Trạng thái | Bằng chứng |
| --- | --- | --- |
| 1. Chốt vai trò/phạm vi | Hoàn thành trong phạm vi API hiện có | Policy tập trung, vai trò lấy từ /users/me |
| 2. Menu theo quyền | Hoàn thành cho chức năng khả dụng | ADMIN/STAFF có lịch hẹn; DOCTOR không thấy chức năng quản lý toàn hệ thống |
| 3. Route/layout riêng | Hoàn thành | Lazy load, client rendering, default route, 403/404 |
| 4. Xác thực nội bộ | Hoàn thành | Login riêng, profile server, bảo vệ deep link, hết phiên/đăng xuất đúng khu vực |
| 5. Giao diện quản lý | Hoàn thành | Sidebar desktop, menu mobile, header, breadcrumb, tài khoản |
| 6. Kiểm soát quyền | Hoàn thành cho các route mới | Chặn menu, URL trực tiếp; gọi API đúng quyền backend hiện có |
| 7. Trạng thái/trang đầu tiên | Hoàn thành | Danh sách và chi tiết thật theo API, trạng thái tải/rỗng/lỗi/thử lại |
| 8. Kiểm tra | Đã chạy; còn lỗi budget production cũ | 54/54 unit test, build development đạt, browser QA đạt; xem giới hạn bên dưới |

Kết quả kiểm tra sau các sửa lỗi cuối:

- node node_modules/@angular/cli/bin/ng.js test --watch=false: **54/54 PASS** (18 test mới, 36 test hiện có). Bổ sung kiểm tra hủy request khi URL bộ lọc không hợp lệ, request chậm, thử lại sau HTTP lỗi, không gán dữ liệu của phiên cũ và không khôi phục profile từ request trước khi reset cùng tài khoản.
- node node_modules/@angular/cli/bin/ng.js build --configuration development: **PASS**, gồm browser/server bundle và prerender các trang public. Các trang management được cấu hình Client.
- docs/qa/management.cjs: **PASS**, 55 request fixture, không lỗi JavaScript và không có request ngoài danh sách fixture. Ảnh tại docs/screenshots/management/.
- docs/qa/patient-appointments.cjs: **PASS**, 23 request fixture, 1 lần tạo lịch và 1 đánh giá trong bộ nhớ fixture, không lỗi JavaScript; kiểm tra đủ đặt lịch/chi tiết/hủy/đánh giá và mobile. Không ghi dữ liệu thật.
- git diff --check cho các file tracked được chỉnh trong đợt này: không lỗi whitespace.
- Production build: **chưa đạt** do CSS trang bệnh nhân appointment-booking.css hiện có 9,41 kB, vượt maximumError 8 kB. Đây không phải lỗi TypeScript/template của quản lý; giữ nguyên file và budget, không sửa giao diện bệnh nhân ngoài phạm vi. Cần xử lý CSS này trước khi đóng gói production.
- Chưa đăng nhập tài khoản thật để kiểm thử backend đang chạy. Đã đối chiếu hợp đồng với mã backend; mọi kiểm tra trình duyệt ghi dữ liệu dùng fixture cô lập. Chưa xác nhận phân quyền theo cơ sở vì backend chưa cung cấp.

### 7.7. Cách mở và kiểm tra lại

- Chạy npm start hoặc node node_modules/@angular/cli/bin/ng.js serve.
- Mở /management/login trên máy chủ frontend, đăng nhập bằng tài khoản nội bộ được backend cấp. STAFF vào danh sách lịch hẹn; ADMIN/SUPER_ADMIN và DOCTOR vào không gian làm việc.
- Các trang hiện có: /management/dashboard, /management/appointments, /management/appointments/:id, /management/account; /403, /404, /management/access-error.
- Không có tài khoản nội bộ mặc định hoặc mật khẩu được thêm vào frontend.
- Unit tests: node node_modules/@angular/cli/bin/ng.js test --watch=false.
- Browser QA: chạy dev server tại http://127.0.0.1:4305 rồi chạy node docs/qa/management.cjs. Script cần thư viện playwright và Chrome; cấu hình MANAGEMENT_QA_NODE_MODULES (thư mục node_modules chứa playwright), MANAGEMENT_QA_CHROME, MANAGEMENT_QA_URL nếu khác mặc định. Script chặn toàn bộ API /booking-schedule/** và trả fixture, không dùng dữ liệu backend thật.

### 7.8. Tệp liên quan và phần tiếp theo

- src/app/management/management.models.ts: ma trận quyền, menu, trang mặc định, kiểm tra returnUrl.
- src/app/management/management-access.service.ts và management.guard.ts: xác minh danh tính, cache theo phiên, guard cha/con và trạng thái lỗi.
- src/app/management/management.routes.ts: nhóm route quản lý lazy load.
- src/app/management/layout/: bố cục quản lý và menu responsive.
- src/app/management/pages/: đăng nhập, không gian làm việc, tài khoản, danh sách/chi tiết lịch và trang 403/404/lỗi xác minh.
- src/app/management/management-appointments.service.ts: danh sách/chi tiết theo hợp đồng backend và ngày vận hành Asia/Bangkok; dùng HttpClient để giữ HTTP status cho giao diện phân biệt lỗi, không sửa BaseService.
- src/app/management/management.spec.ts: 18 kiểm thử mới.
- src/app/services/auth.service.ts: thêm userId getter và ngữ cảnh đăng nhập nội bộ; lưu cùng phiên trong sessionStorage, không lưu mật khẩu.
- src/app/app.ts, app.html, app.css: trạng thái xác minh quyền khi điều hướng.
- src/app/app.routes.ts, app.routes.server.ts: nối route và chế độ render.
- angular.json, tsconfig.spec.json: đưa test mới vào bộ kiểm tra hiện tại.
- src/app/pages/appointment-history/appointment-history.spec.ts: sửa một lời gọi changeSort cho đúng chữ ký hiện có.
- docs/qa/management.cjs và docs/screenshots/management/: kiểm tra trình duyệt và ảnh dữ liệu giả.

Thứ tự mốc nghiệp vụ tiếp theo:

1. Chốt quy tắc xác nhận/hủy và thêm thao tác có dialog xác nhận, lý do, chống gửi trùng, xử lý lịch vừa đổi trạng thái.
2. Bổ sung hợp đồng tiếp nhận CHECKED_IN/checkedInAt và quyền thao tác ở backend trước khi thêm nút tiếp nhận.
3. API đổi lịch có giao dịch giữ/nhả chỗ; không mô phỏng bằng hủy rồi tạo mới riêng rẽ.
4. Quản lý ca/lịch bác sĩ và danh mục; cung cấp API danh sách bác sĩ tối thiểu cho STAFF để thay bộ lọc ID bằng chọn bác sĩ theo tên. GET /api/admin/doctors hiện chỉ cho ADMIN/SUPER_ADMIN.
5. Tài khoản nhân viên, phân quyền và chỉnh hồ sơ/đổi mật khẩu theo quy trình xác thực phù hợp.
6. API lịch bác sĩ cá nhân kiểm tra quan hệ tài khoản–bác sĩ trước khi triển khai danh sách khám của DOCTOR.
7. Báo cáo, nhật ký thao tác và thông báo theo dữ liệu vận hành thật.

## 8. Refactor BaseComponent theo hệ thống đặt lịch khám — 19/10/2026

### 8.1. Phạm vi và thay đổi

Yêu cầu: refactor src/app/components/base.component.ts cho phù hợp dự án hiện tại. Giữ BaseFormComponent/BaseListComponent và luồng màn hình đang được người dùng chỉnh; không refactor toàn bộ bảng hoặc nghiệp vụ lịch hẹn trong đợt này.

- Đổi base thành abstract @Directive(), dùng cho kế thừa thay vì một component có template rỗng.
- Bỏ model/store user-profile, UserTypeEnum, DateFormatConstants không tồn tại và logic giải mã permission AES/NgxPermissionsService của dự án bán hàng cũ.
- Dùng signal currentUser từ ManagementAccessService và helper hasRole(InternalRole), hasPermission(ManagementPermission) theo backend /users/me. Base không tự gọi API profile hoặc cấp quyền toàn cục trong ngOnInit. Guard/service tiếp tục chịu trách nhiệm xác thực và nạp profile.
- Giữ fb, errorCode/errorMessage, unsubscribe, các hook ngOnInit/ngAfterViewInit/ngOnDestroy cần cho lớp form/list hiện có. Bỏ các hook vòng đời trống không có lớp con sử dụng.
- Thêm setError()/clearError() để cập nhật trạng thái lỗi thống nhất.
- Subject<void> thay Subject<any>; DestroyRef giải phóng subscription ngay cả khi lớp con không gọi super.ngOnDestroy(). Cleanup có kiểm tra để không chạy hai lần.
- Dùng DOCUMENT, PLATFORM_ID và document.defaultView cho các tiện ích trình duyệt. Trên SSR, widthForModal trả 60%, mở tab/tải Blob không thực hiện thao tác DOM.
- openNewTab chỉ mở đường dẫn cùng origin ứng dụng, dùng noopener,noreferrer; bỏ phụ thuộc Electron không có trong frontend hiện tại.
- Giữ hợp đồng formatterVND/parserVND của nz-input-number: 10000 <-> 10,000. Dùng Intl, xử lý null/NaN/Infinity; không đổi định dạng tiền hiển thị qua pipe hiện có.
- isImageFile nhận phần mở rộng không phân biệt hoa/thường, có query/hash; bổ sung AVIF. Đây chỉ là kiểm tra tên cho UI, không thay thế xác thực file upload phía server.
- downloadFileFromBlob gắn anchor vào DOM rồi xóa, thu hồi object URL sau khi trình duyệt bắt đầu tải; giải phóng URL/timer còn lại khi đóng component.

### 8.2. Kiểm tra

- Build development: PASS, cả browser/server bundle và prerender 6 trang public. Còn cảnh báo DatePipe/RouterLink chưa dùng ở ManagementAppointments hiện có; không sửa màn hình ngoài phạm vi.
- Kiểm thử riêng BaseComponent: 8/8 PASS trên ChromeHeadless. Bao phủ thay đổi role/quyền, khóa tài khoản, hủy subscription không gọi super, định dạng/parser tiền, URL mở tab, tải Blob/cleanup, SSR không chạm browser globals, tên ảnh và xóa lỗi.
- Đã đăng ký src/app/components/base.component.spec.ts trong angular.json và tsconfig.spec.json để các lần chạy sau có test này.
- Đang chạy thêm bộ kiểm thử chung để ghi nhận tình trạng tích hợp của mã hiện tại.

Kết quả bộ kiểm thử chung: **58/62 PASS, 4 FAIL**. Cả 4 lỗi nằm trong nhóm Management appointment request lifecycle ở management.spec.ts: test chờ HTTP ngay sau new ManagementAppointments(), trong khi màn hình hiện tại đã chuyển phần khởi tạo request từ constructor sang loadData() khi kế thừa BaseListComponent. Base không tự kích hoạt loadData của lớp con. Giữ nguyên màn hình/test nghiệp vụ đang được chỉnh, không thay đổi ngoài yêu cầu refactor base.

Lưu ý tích hợp tiếp theo: BaseListComponent vẫn có logic window/đo kích thước bảng riêng và ShareTable vẫn dùng ngxPermissionsOnly. Refactor này chỉ bảo vệ SSR cho các tiện ích của BaseComponent và cung cấp nguồn quyền mới; chưa chuyển toàn bộ bảng dùng chung sang policy quản lý. Nếu dùng column.permissions, cần đồng bộ cơ chế đó tại ShareTable/service hoặc cấu hình provider thư viện phù hợp; không khôi phục giải mã permission AES trong base.

Các file chỉnh trong đợt này: base.component.ts, base.component.spec.ts, angular.json, tsconfig.spec.json và mục 8 của PROCESS_BUILDING.md. Không chỉnh BaseListComponent, BaseFormComponent, ShareTable hoặc ManagementAppointments.

## 9. Refactor cài đặt bảng theo dự án hiện tại — 21/10/2026

### 9.1. Khảo sát và phạm vi

Yêu cầu: refactor SettingTableComponent. Component đang được trang quản lý lịch hẹn dùng để cập nhật tableColumns qua tableColumnDataOutput. Mã cũ tham chiếu user-profile.store và services/indexeddb/table-setting.service không tồn tại. Drawer nâng cao cũng phụ thuộc cùng các file cũ, nên cần chỉnh đồng bộ để hoàn tất luồng lưu/khôi phục.

Giữ selector app-setting-table, tableKey, model tableColumnData và output tableColumnDataOutput để tương thích màn hình hiện tại. Không thay đổi API khám, dữ liệu bệnh nhân, hoặc logic tìm kiếm/lịch hẹn đang được người dùng phát triển.

### 9.2. Thay đổi thực hiện

- Nguồn tài khoản: ManagementAccessService.user từ /users/me, thay subscription userProfile$ cũ. Chỉ lưu khi có tài khoản ACTIVE và tableKey hợp lệ.
- Thêm TableSettingService tại services/table-settings/. Vì service IndexedDB cũ không có và dữ liệu tùy chọn rất nhỏ, dùng localStorage trình duyệt, không thêm thư viện/database/backend mới. Khóa lưu gồm booking-schedule, version, userId và tableKey. Tùy chọn của các tài khoản/bảng không dùng chung; chỉ tồn tại trên trình duyệt đó, chưa đồng bộ thiết bị.
- Chỉ lưu key, visible, width, fixed và align; không lưu dữ liệu khám, tên bệnh nhân, renderer hoặc quyền. Khi đọc lại luôn merge với schema hiện tại: bỏ cột đã xóa/khóa lạ/trùng, thêm cột mới, giữ title/render/permissions/minWidth từ code.
- Sửa lỗi align không được khôi phục ở mã cũ; kiểm tra chiều rộng theo minWidth, giới hạn tối đa thông thường 2.000px. JSON/giá trị sai không khiến giao diện hỏng; lỗi đọc/ghi storage có thông báo và vẫn dùng được trong bộ nhớ.
- Effect theo dõi tài khoản, tableKey và schema input. Có nhận diện array đã emit để tránh vòng lặp khi parent nhận output và truyền ngược vào input. Snapshot mặc định tách riêng, không bị thay bằng cấu hình đã lưu.
- Bật/tắt cột tạo bản sao, không sửa trực tiếp object input; mỗi thay đổi emit một lần. Không cho ẩn cột cuối cùng; cấu hình cũ ẩn hết cột sẽ được phục hồi ít nhất một cột.
- Drawer nâng cao chỉ chỉnh bản nháp cloneDeep và trả kết quả. Parent là nơi duy nhất lưu/xóa cấu hình. Đóng drawer không lưu; khôi phục mặc định xóa cấu hình của đúng người dùng/bảng và áp dụng schema gốc.
- Drawer có revision/scope kiểm tra trước khi nhận kết quả; kết quả từ tài khoản/bảng/schema cũ bị bỏ qua. Đóng drawer khi thay scope hoặc component bị hủy; afterClose dùng take(1) và takeUntilDestroyed để không xử lý/lưu trùng.
- Drawer rộng tối đa 720px và không vượt viewport; hàng tùy chỉnh xuống dòng trên mobile. Thêm nút lên/xuống để sắp xếp bằng bàn phím, giữ kéo thả hiện có.
- Service không đọc window/localStorage khi SSR. Không tự tải profile ở component cài đặt, không dùng cấu hình cột để thay thế kiểm soát quyền backend.

### 9.3. Kết quả kiểm tra

- Build development: PASS, browser/server bundle và prerender 6 trang public. Có cảnh báo optional chaining dư ở template ManagementAppointments hiện có, không sửa ngoài phạm vi.
- Kiểm thử riêng: 10/10 PASS trên ChromeHeadless. Bao phủ merge schema/quyền, cột mới/cột đã xóa, chiều rộng, chống ẩn hết, lưu theo tài khoản/bảng, trường được lưu, SSR, output không lặp, input bất biến, đổi người dùng và bỏ drawer cũ, nâng cao/reset, storage lỗi, destroy cleanup, và bản nháp không sửa input.
- Browser QA docs/qa/table-settings.cjs: PASS với 6 API fixture, không lỗi JavaScript. Kiểm tra trên trang quản lý lịch hẹn thực: ẩn số điện thoại, tải lại vẫn giữ cấu hình, đổi chiều rộng/hiển thị và lưu nâng cao, đóng không lưu, reset xóa storage, drawer mobile 390px không tràn ngang. Chỉ dùng dữ liệu giả, không gọi backend thật.
- Đã mở ảnh desktop và mobile để kiểm tra trực quan. Ảnh tại docs/screenshots/table-settings/: popover-desktop.png, advanced-desktop.png, advanced-mobile.png.
- Không chạy lại bộ test nghiệp vụ toàn dự án trong đợt này; kết quả ở trên là build và kiểm tra chức năng cài đặt bảng, không khẳng định các test lịch hẹn cũ đã được đồng bộ với các thay đổi API hiện tại.

### 9.4. Tệp và cách chạy lại

- src/app/components/setting-table/setting-table.component.ts/.html/.css.
- src/app/components/setting-table/advanced-setting-table/advanced-setting-table.component.ts/.html/.css.
- src/app/services/table-settings/table-setting.service.ts: lưu cấu hình và merge schema an toàn.
- src/app/components/setting-table/setting-table.component.spec.ts; thêm pattern test tương ứng vào angular.json và tsconfig.spec.json.
- docs/qa/table-settings.cjs; docs/screenshots/table-settings/.

Unit test: node node_modules/@angular/cli/bin/ng.js test --watch=false --include "src/app/components/setting-table/**/*.spec.ts".
Browser QA: chạy ng serve --host 127.0.0.1 --port 4310, rồi node docs/qa/table-settings.cjs. Cấu hình TABLE_QA_NODE_MODULES nếu playwright không được cài trong project, TABLE_QA_CHROME nếu Chrome ở vị trí khác, TABLE_QA_URL nếu đổi địa chỉ frontend.

## 10. Sửa header và ô tìm kiếm lịch hẹn — 22/10/2026

- Yêu cầu: header đã bỏ class page-header nhưng giao diện vẫn mang kiểu cũ; ô search không hiển thị.
- Kiểm tra source: header hiện tại không có page-header. Rule .page-header còn trong styles.css và management-ui.css nhưng không thể khớp phần tử đã bỏ class; không xóa style chung vì các trang khác vẫn dùng.
- Kiểm tra trình duyệt: dev server cũ tại 4310 trả DOM/template cũ không có ô input, khác source trên đĩa. Khi chạy dev server mới tại 4311, DOM hiển thị template mới. Nếu trình duyệt người dùng vẫn thấy header cũ, cần khởi động lại đúng dev server đang dùng rồi tải lại trang; không tự dừng tiến trình của người dùng.
- Import NzInputModule thay vì chỉ NzInputGroupComponent để có cả directive nz-input và các thành phần group cần thiết.
- Toolbar dùng class riêng appointments-toolbar, giữ id header để BaseList đo chiều cao. Không dùng page-header, không thêm nền gradient/viền trái/padding kiểu card.
- Gắn input vào formControlName keyword. Trước đó input dùng searchTextControl, nhưng backend AppointmentSearchRequest/API search nhận keyword; payload hiện dùng các trường searchForm cùng keyword đã trim, từ khóa trống thành null và không gửi searchText thừa.
- Dùng form ngSubmit cho Enter và nút kính lúp type submit, có aria-label; các nút tạo/tải lại/cài đặt vẫn không submit form. Giữ thứ tự ô search và nhóm nút người dùng đang xây, bố cục xuống dòng trên mobile.
- Build development: PASS. Còn cảnh báo optional chaining dư ở ô trạng thái lịch hẹn hiện có, không đổi phần đó.
- Browser QA docs/qa/appointments-toolbar.cjs: PASS trên server mới, không lỗi JavaScript, 4 request gồm tải lần đầu + 3 lần tìm. Xác minh keyword được trim, tìm theo tên, xóa từ khóa thành null; Enter và click mỗi lần 1 request; header backgroundImage none, borderLeft 0px, padding 0px và không có class page-header; input nhìn thấy trên desktop/390px/320px. Tất cả API dùng fixture, không gọi backend thật.
- Ảnh tại docs/screenshots/appointments-toolbar/: desktop.png, mobile-390.png, mobile-320.png. Đã mở kiểm tra trực quan ảnh mobile.
- Chạy lại QA: dev server tại 4311; TABLE_QA_URL=http://127.0.0.1:4311/management/appointments, TABLE_QA_NODE_MODULES trỏ node_modules chứa playwright nếu không cài trong project; node docs/qa/appointments-toolbar.cjs.

## 11. Sửa căn lề dữ liệu trong ShareTable — 22/10/2026

- Cột trạng thái có align center nhưng td của dòng dữ liệu thiếu nzAlign; trước đó chỉ gắn class text-${column.align} tạo động, phụ thuộc Tailwind có sinh class tương ứng. Header đã có nzAlign nên tiêu đề và dữ liệu có thể không đồng nhất.
- Thêm nzAlign và style.text-align theo column.align cho td dữ liệu chung (mặc định left), áp dụng cả text/custom/actions. Không ép tất cả cột căn giữa: bệnh nhân/mã vẫn left, tiền vẫn right, trạng thái center; tiếp tục tôn trọng cài đặt người dùng.
- Nhãn trạng thái của trang lịch hẹn có class appointment-status-tag với margin-inline-end 0, loại bỏ margin cuối mặc định của nz-tag khiến nhãn lệch khỏi tâm ô.
- Browser QA docs/qa/table-alignment.cjs: PASS trên dữ liệu fixture có một lịch CONFIRMED. Đo computed textAlign center, marginEnd 0px và độ lệch tâm nhãn so với tâm td chỉ 0,0078125px; xác nhận mã lịch vẫn left và có cột tiền right. Không lỗi JavaScript; không gọi backend thật.
- Ảnh kiểm tra: docs/screenshots/table-alignment/status-centered.png. Đã mở ảnh để kiểm tra trực quan.

## 12. Sửa width trong tableColumns bị cấu hình lưu ghi đè — 22/10/2026

- Yêu cầu: thay width trong tableColumns nhưng giao diện không thay đổi.
- Đã đo DOM/colgroup với fixture và trình duyệt mới: khi không có preference, width code được render đúng (bệnh nhân 180px, trạng thái 150px). Không thay CSS hoặc ép min/max-width toàn bảng khi chưa có bằng chứng lỗi layout.
- Nguyên nhân xác định ở persistence: format v1 lưu mọi width, bao gồm các mặc định chưa được người dùng sửa. Khi đổi width trong source, restore vẫn áp snapshot cũ lên schema mới.
- Format payload v2 chỉ lưu width khi nó khác defaultColumns; kèm defaultWidth gốc. Khi defaultWidth trong source thay đổi, width cũ không còn ghi đè mặc định mới. Tùy chỉnh width theo schema hiện tại vẫn được lưu và khôi phục sau reload.
- Giữ nguyên tên khóa storage để tương thích; version nằm trong payload. Khi đọc payload v1, bỏ snapshot width cũ không phân biệt được mặc định/tùy chỉnh, nhưng giữ thứ tự, ẩn/hiện, fixed và align. Người dùng từng chỉnh width bằng format cũ có thể đặt lại một lần trong Cài đặt bảng; các thay đổi mới dùng v2. Không xóa toàn bộ cài đặt hoặc dữ liệu người dùng.
- SettingTableComponent truyền defaultColumns cho service khi lưu. Schema, renderer, quyền và minWidth vẫn lấy từ source; không lưu dữ liệu lịch khám.
- Unit test riêng cài đặt bảng: 12/12 PASS. Thêm trường hợp đổi width mặc định, giữ width tùy chỉnh theo baseline và đọc snapshot v1.
- Browser QA docs/qa/table-widths.cjs: PASS, đo trạng thái lần lượt 150px (source, dù fixture v1 lưu 390px), 300px sau chỉnh trong drawer, 300px sau reload. Xác minh payload version 2 có defaultWidth 150px; không lỗi JavaScript, API dùng fixture hoàn toàn.
- Build development: PASS. Còn cảnh báo optional chaining dư trong template lịch hẹn hiện có; không chỉnh ngoài phạm vi.
- File thay đổi đợt này: services/table-settings/table-setting.service.ts; components/setting-table/setting-table.component.ts và setting-table.component.spec.ts; docs/qa/table-widths.cjs; PROCESS_BUILDING.md.

## 13. Sửa URL lịch hẹn bị lặp appointments — 22/10/2026

- Nguyên nhân: APPOINTMENT_ADMIN(path) đã thêm appointments/ nhưng API_APPOINTMENT_ADMIN_DETAIL lại truyền appointments thêm lần nữa, tạo /api/admin/appointments/appointments; service chỉ nối /{id}, không phải nơi gây lặp.
- Sửa helper nhận path tùy chọn, trả đường dẫn gốc không có dấu / thừa khi path trống. DETAIL dùng APPOINTMENT_ADMIN(), SEARCH vẫn dùng APPOINTMENT_ADMIN('search').
- Đã đối chiếu AdminAppointmentController backend: GET /api/admin/appointments/{id}, POST /api/admin/appointments và POST /api/admin/appointments/search.
- Kiểm tra thực thi constants sau transpile TypeScript: PASS cho URL chi tiết id=4, tạo mới và tìm kiếm. Không gọi API ghi dữ liệu thật.
- Kết quả GET frontend: /booking-schedule/api/admin/appointments/4. Hàm create vốn dùng chung constant DETAIL cũng được sửa URL về /api/admin/appointments.

## 14. Tích hợp thao tác xử lý lịch hẹn quản lý — 22/10/2026

### 14.1. Phạm vi và nghiệp vụ đã triển khai

- Theo yêu cầu, giữ màn danh sách và drawer chi tiết; thêm xác nhận, bắt đầu khám, hoàn thành, hủy, không đến qua 5 PATCH API backend hiện có.
- Đã đọc AdminAppointmentController, AppointmentService.transition, AppointmentLifecycle.cancel, AppointmentActionRequest và SecurityConfig. Request body là {note?: string}, tối đa 2.000 ký tự. Ghi chú trống gửi {} để giữ ghi chú hiện có.
- Backend hiện cho ADMIN/SUPER_ADMIN/STAFF dùng các endpoint quản lý; DOCTOR chưa có endpoint giới hạn lượt được phân công. Frontend dùng permission appointments:update-status khớp các vai trò hiện có, không tự mở quyền cho doctor/patient.
- Luồng PENDING -> CONFIRMED -> IN_PROGRESS -> COMPLETED; chỉ PENDING/CONFIRMED được hủy hoặc đánh dấu NO_SHOW. Bắt đầu khám phải đến giờ bắt đầu; NO_SHOW phải qua giờ kết thúc. Frontend dùng UTC+7 để hiển thị điều kiện và kiểm tra lại trước khi gửi; backend là nơi quyết định cuối cùng.
- Không thêm CHECKED_IN/đổi lịch giả vì API chưa hỗ trợ. in-progress hiển thị đúng tên Bắt đầu khám.
- Hủy cần lý do không trắng theo chính sách giao diện; mọi ghi chú tối đa 2.000 ký tự. Modal có xác nhận riêng, chống gửi trùng, khóa đóng/Escape khi đang kiểm tra/gửi, thông báo lỗi ngay trong modal.
- Đọc lại chi tiết trước PATCH, chặn khi trạng thái khác snapshot/không còn hợp lệ. Nếu backend trả xung đột, khóa gửi lại và yêu cầu tải lại dữ liệu. Không tự cập nhật trạng thái thành công khi API thất bại/thiếu result.
- Thao tác thành công tải lại danh sách; ở drawer tải lại cả chi tiết và danh sách nền qua callback. Menu Xử lý trên từng dòng thay nút Sửa chưa có API cập nhật; giữ nút Xem chi tiết. Form tạo lịch hiện có không được thay đổi trong đợt này.
- Sửa AppointmentEnumStatus.COMPLETED từ COMPLETE sang COMPLETED để thống nhất trạng thái backend và nhãn giao diện.

### 14.2. Kết quả kiểm tra

- Unit test appointment-actions.spec.ts: 17/17 PASS. Bao phủ luồng trạng thái, mốc giờ UTC+7, phân quyền, đúng 5 URL PATCH, body ghi chú, chống gửi trùng, lý do hủy, dữ liệu thay đổi, lỗi API, kết quả thiếu dữ liệu, đổi phiên/quyền và thử lại sau lỗi kết nối.
- Build development: PASS (browser/server/prerender). Còn cảnh báo optional chaining dư trong template danh sách hiện có.
- Browser QA docs/qa/appointment-workflow.js: PASS trên dev server mới tại 4313, không lỗi JavaScript và không request ngoài fixture. Kiểm tra đủ 5 thao tác, tự tải lại danh sách/chi tiết, khóa đóng khi gửi, lý do hủy đã trim, vô hiệu hóa thao tác chưa đến giờ, chặn PATCH khi trạng thái vừa thay đổi, đóng X vẫn tải lại và thử lại sau lỗi máy chủ.
- 8 PATCH fixture được xác minh: xác nhận/bắt đầu/hoàn thành trên cùng lịch; hủy kèm note; không đến; hoàn thành trong drawer; xác nhận lỗi 500 rồi thử lại thành công. Không gọi PATCH trên dữ liệu backend thật.
- Đã mở ảnh kiểm tra trực quan desktop drawer và modal hủy ở mobile 390px. Ảnh tại docs/screenshots/appointment-workflow/: confirm-desktop.png, cancel-mobile.png, stale-state.png, detail-completed.png.
- Dropdown có role menu/menuitem và aria-disabled để công cụ hỗ trợ đọc được trạng thái thao tác.
- Chạy lại unit test: node node_modules/@angular/cli/bin/ng.js test --watch=false --include "src/app/management/appointment-workflow/**/*.spec.ts". Chạy lại browser QA: node docs/qa/appointment-workflow.js; đặt WORKFLOW_QA_URL theo dev server và WORKFLOW_QA_NODE_MODULES theo thư mục node_modules chứa playwright nếu không cài trong project.
- Giới hạn: đã đối chiếu source backend và kiểm tra bằng fixture, chưa xác minh bằng tài khoản/dữ liệu thật. Hoàn thành lượt khám không đồng nghĩa đã thu tiền; chưa xây dựng nghiệp vụ thanh toán hoặc màn bác sĩ trong phạm vi này.

### 14.3. Các tệp chính

- management/appointment-workflow/: policy trạng thái, đồng hồ điều kiện thời gian, component thao tác dùng chung, modal xác nhận và unit test.
- management/services/management-appointments.service.ts: thêm transition gửi PATCH đúng endpoint.
- management/management.models.ts: permission appointments:update-status.
- management/pages/management-appointments/: tích hợp menu từng dòng và các thao tác ở drawer chi tiết, cập nhật trạng thái sau xử lý.
- enum/appointment/appointment.enum.ts: đồng bộ COMPLETED với backend.

## 15. Đối chiếu API quản lý lịch làm việc bác sĩ — 22/10/2026

### 15.1. Nguồn kiểm tra và phạm vi

- Đọc source backend tại ../examine: DoctorScheduleController, AdminTimeSlotController, TimeSlotController, PublicDoctorScheduleController; các DTO, mapper, DoctorScheduleService, TimeSlotService, TimeSlotPolicy, AppointmentLifecycle và SecurityConfig.
- Đối chiếu frontend AppointmentService, booking.model.ts và api-constants.ts. Đây là rà soát hợp đồng và nghiệp vụ trong source, chưa gọi API thật/chưa sửa backend hoặc triển khai màn mới.
- Tiền tố HTTP ứng dụng là /booking-schedule; các đường dẫn dưới đây tính từ /api, không thêm lặp doctor-schedules/time-slots khi nối URL.

### 15.2. API đã có

| Chức năng | API | Quyền hiện tại |
| --- | --- | --- |
| Tìm ca, phân trang | POST /api/admin/doctor-schedules/search?page=0&size=20&sort=workDate,asc | ADMIN, SUPER_ADMIN |
| Chi tiết ca, bao gồm toàn bộ timeSlots | GET /api/admin/doctor-schedules/{id} | ADMIN, SUPER_ADMIN |
| Tạo ca, tự sinh khung giờ | POST /api/admin/doctor-schedules | ADMIN, SUPER_ADMIN |
| Sửa ca | PUT /api/admin/doctor-schedules/{id} | ADMIN, SUPER_ADMIN |
| Đổi trạng thái ca | PATCH /api/admin/doctor-schedules/{id}/status | ADMIN, SUPER_ADMIN |
| Xóa ca hoặc hủy và giữ lịch sử | DELETE /api/admin/doctor-schedules/{id} | ADMIN, SUPER_ADMIN |
| Đóng/mở một khung giờ | PATCH /api/admin/time-slots/{id}/status | ADMIN, SUPER_ADMIN, STAFF |
| Tìm ca còn đặt được | POST /api/public/doctor-schedules/search | Public |
| Giờ còn đặt được trong ca | GET /api/public/time-slots?scheduleId={id} | Public |

- Search quản lý nhận body {doctorId?, specialtyId?, fromDate?, toDate?, status?}; result là Page<DoctorScheduleResponse>. Search public trả List, không có phân trang và chỉ trả ca OPEN, bác sĩ/tài khoản/chuyên khoa hoạt động, ngày từ hôm nay, còn khung giờ khả dụng.
- Tạo ca nhận {doctorId, roomId?, workDate, startTime, endTime, maxPatients?}; ngày yyyy-MM-dd, giờ LocalTime (nên gửi HH:mm:ss), maxPatients mặc định 20. Ca mới OPEN. Sửa nhận các trường tương ứng dạng tùy chọn.
- Response ca có doctorId/doctorCode/doctorName/specialtyName, roomId/roomCode/roomName, workDate, startTime, endTime, maxPatients, status, timeSlots, createdAt, updatedAt. Response slot có id, scheduleId, startTime, endTime, maxPatients, bookedCount, status.
- Picker bác sĩ: GET /api/admin/doctors?specialtyId=...&status=ACTIVE (ADMIN/SUPER_ADMIN). Phòng: GET /api/admin/rooms hoặc POST /api/admin/rooms/search (có STAFF đọc); lựa chọn public GET /api/public/rooms hoặc /api/public/specialties/{specialtyId}/rooms. Chuyên khoa hoạt động: GET /api/public/specialties; SecurityConfig hiện rơi vào authenticated, chưa permitAll cho đường dẫn này.

### 15.3. Nghiệp vụ cần phản ánh đúng trên giao diện

- Backend tự chia slot tối đa 30 phút, slot cuối có thể ngắn hơn; phân bổ tổng maxPatients của ca vào các slot. Chưa có trường slotDurationMinutes hoặc API sửa quota/giờ từng slot; không xây ô chọn thời lượng hoặc sức chứa từng slot khi chưa bổ sung backend.
- Có kiểm tra trùng ca của bác sĩ và trùng phòng; kiểm tra ngày không quá khứ, giờ bắt đầu trước giờ kết thúc, sức chứa dương, bác sĩ/tài khoản hoạt động và phòng AVAILABLE. Khóa dữ liệu được xử lý trong transaction backend.
- doctorId trong PUT chỉ xác nhận bác sĩ cũ, không đổi bác sĩ ca. roomId null hiện mang nghĩa giữ phòng cũ, chưa hỗ trợ bỏ gán phòng qua PUT.
- Khi ca có lịch sử đặt (kể cả lịch đã hủy), không được đổi ngày/giờ hoặc giảm sức chứa; có thể đổi phòng/tăng sức chứa theo kiểm tra backend. Không suy ra ca chưa từng có lịch chỉ vì bookedCount hiện bằng 0.
- Trạng thái ca: OPEN, FULL, CLOSED, CANCELLED. PATCH body {status}. CLOSED ngừng nhận đặt qua trạng thái các slot, không hủy các lịch hẹn hiện có. CANCELLED không thể mở lại.
- Hủy ca tự hủy các lịch PENDING/CONFIRMED, giải phóng chỗ, điều chỉnh lượt dùng khuyến mãi và tạo bản ghi thông báo cho bệnh nhân. IN_PROGRESS/COMPLETED không bị tự hủy. Không có bằng chứng gửi email/SMS; hoàn tiền chưa được xử lý trong luồng này.
- DELETE xóa thật khi chưa có lịch sử; nếu có lịch sử thì hủy ca và giữ dữ liệu. Giao diện phải giải thích tác động và ưu tiên thao tác Hủy ca rõ ràng, không diễn đạt mọi DELETE là xóa vĩnh viễn.
- Đổi trạng thái slot nhận {status: AVAILABLE | CLOSED | UNAVAILABLE}; FULL không được đặt thủ công. CLOSED/UNAVAILABLE đều đặt manuallyClosed và response được đồng bộ thành CLOSED. Slot có bookedCount > 0 hoặc lịch PENDING/CONFIRMED/IN_PROGRESS không được đóng. Mở lại chỉ khi ca khả dụng, còn sức chứa và giờ bắt đầu vẫn ở tương lai.
- Public time-slots đã lọc bỏ slot đóng/đầy/quá giờ: không dùng API này để hiển thị toàn bộ slot quản lý. Dùng timeSlots từ chi tiết ca quản lý; frontend cần model quản lý riêng thay vì dùng BookingSchedule hiện chỉ chứa một phần trường response.
- Backend dùng LocalDate.now()/LocalDateTime.now() theo múi giờ JVM; chưa thấy cấu hình múi giờ ứng dụng rõ ràng trong resources. serverTimezone=UTC trong JDBC không chứng minh múi giờ JVM. Cần thống nhất múi giờ phòng khám khi triển khai.

### 15.4. Khoảng trống và thứ tự triển khai

1. Có thể xây ngay màn lịch làm việc cho ADMIN/SUPER_ADMIN: danh sách, lọc khoảng ngày/bác sĩ/chuyên khoa/trạng thái; drawer chi tiết có tất cả slot. Giao diện ngày/tuần dùng cùng API search, cần xử lý phân trang để không bỏ sót ca.
2. Tiếp theo tạo/sửa ca, kiểm tra dữ liệu form và ánh xạ lỗi 6004–6011 (không tồn tại, giờ không hợp lệ, trùng bác sĩ/phòng, có lịch sử, ca đã hủy, sức chứa, sai bác sĩ). Picker chỉ chọn bác sĩ hoạt động/phòng khả dụng.
3. Thêm đóng/mở slot và đóng/mở/hủy ca; xác nhận tác động khi hủy, tải lại dữ liệu sau thành công, hiển thị lỗi 7001–7004 rõ ràng.
4. STAFF đang được PATCH slot nhưng không được tìm/đọc chi tiết ca hoặc danh sách bác sĩ quản lý. Nếu muốn staff dùng đầy đủ màn này, cần bổ sung quyền đọc giới hạn ở backend trước; không dùng API public để thay thế dữ liệu quản lý và không tự mở quyền frontend.
5. Chưa có API xem trước tác động hủy ca, lấy lịch hẹn theo scheduleId/timeSlotId, đổi lịch hàng loạt, sao chép/lặp lịch, điều chỉnh thời lượng/quota từng slot, lịch bác sĩ của chính mình. AppointmentSearchRequest hiện chỉ có keyword, doctorId, patientId, status, fromDate, toDate; lọc bác sĩ/ngày chưa xác định chính xác lịch thuộc ca nào khi có nhiều ca cùng ngày. Nên bổ sung bộ lọc ca/slot và API preview trả số lượng cùng danh sách lịch bị ảnh hưởng trước khi xây phần xử lý tác động.
6. Không cần API lịch tuần riêng để làm giao diện tuần cơ bản; chưa triển khai thanh toán/hoàn tiền hoặc màn DOCTOR trong phạm vi đối chiếu này.

## 16. Kiểm tra icon chức năng trang lịch bác sĩ — 22/10/2026

- Yêu cầu: các icon chức năng trong doctor-schedule.html không hiển thị.
- Kiểm tra source: DoctorSchedule đã import NzIconDirective; phiên bản NG-ZORRO hiện tại hỗ trợ cả selector nz-icon và [nz-icon]. Eye/Edit đã có trong APP_ICONS; Delete cũng được NzIconService đăng ký sẵn qua bộ icon NG-ZORRO. Không xác định thiếu đăng ký icon là nguyên nhân.
- Tái hiện trên dev server mới bằng một ca fixture: cả eye/edit/delete đều có SVG/path, kích thước 22x18px, nhìn thấy trên ảnh desktop; không lỗi JavaScript. Chưa tái hiện được hiện tượng mất icon với source hiện tại, chưa đủ bằng chứng kết luận nguyên nhân ở phiên trình duyệt người dùng.
- Phát hiện độc lập: standalone DoctorSchedule thiếu NzTooltipModule dù template có nz-tooltip. Đã thêm import, chuẩn hóa nút xóa sang nz-tooltip + nzTooltipTitle và thêm aria-label/type button cho cả ba nút. Không thay nghiệp vụ xem/sửa/xóa.
- Biên dịch dev server: PASS, còn các cảnh báo optional chaining dư có sẵn. Browser QA docs/qa/doctor-schedule-icons.js: PASS, xác minh SVG của ba icon, kích thước khác 0, tooltip sửa hiển thị khi hover và không pageerror. API được chặn bằng fixture, không gọi tạo/sửa/xóa backend thật.
- Ảnh đã mở kiểm tra trực quan: docs/screenshots/doctor-schedule-icons/desktop.png. Khi giao diện tại máy người dùng khác source đã kiểm tra, khởi động lại đúng dev server dự án và Ctrl+F5 để kiểm tra lại; đây là bước loại trừ bản giao diện cũ, chưa phải kết luận nguyên nhân.

## 17. Tái hiện lỗi mất ba nút chức năng trên server 4200 — 23/10/2026

- Người dùng xác nhận chỉ các icon Xem/Sửa/Xóa trong bảng mất, toolbar vẫn hiện. NzIconModule đã có trong imports của standalone DoctorSchedule, đăng ký icon cũng hợp lệ; không cần import đồng thời NzIconDirective hoặc NzButtonComponent khi đã dùng các module tương ứng. Đã bỏ các import dư này.
- Khác lần kiểm tra trước dùng server riêng, lần này chạy fixture trực tiếp trên http://localhost:4200/management/doctor-schedule. Tái hiện được: cột actions có render actions, nhưng actionsCellTemplate() của ShareTable trả undefined, ô chỉ có container, không có ba button/nz-icon. Không có lỗi JavaScript; icon sao chép và icon toolbar vẫn có SVG. Vì vậy mất nội dung template là nguyên nhân trực tiếp, không phải thiếu thư viện icon.
- Thêm input actionsTemplate tùy chọn vào ShareTable và bind [actionsTemplate]="actionsCell" trên trang lịch bác sĩ. Renderer ưu tiên input, vẫn hỗ trợ contentChild actionsCell cho các trang đang dùng. Không thay nghiệp vụ các nút.
- Xác minh server 4200 còn phục vụ template DoctorSchedule cũ: template runtime là phiên bản 18 declarations/17 bindings trong khi build mới có 20 declarations/18 bindings và binding actionsTemplate. Component ShareTable đã nhận input mới nhưng trang chưa nhận binding. Đây là bằng chứng code frontend đang bị cập nhật không đồng bộ trong phiên dev server.
- Đã xác định tiến trình ng serve thuộc đúng workspace/cổng 4200, khởi động lại tại cùng cổng với --no-hmr để dùng tải lại trang khi sửa thay vì cập nhật nóng component trong phiên kiểm tra này. Không đổi package.json hoặc cấu hình build; server hiện vẫn chạy để người dùng tiếp tục sử dụng.
- Sau sửa và restart: QA doctor-schedule-icons.js PASS ngay trên localhost:4200; cả content query và explicit input đều có template, ba icon eye/edit/delete có SVG/path và kích thước 22x18px, tooltip hoạt động, không pageerror. Ảnh desktop.png trong docs/screenshots/doctor-schedule-icons/ được cập nhật sau sửa.
- Build development PASS; browser regression appointment-workflow.js PASS với đủ 5 thao tác và 8 PATCH fixture, xác nhận các trang dùng contentChild cũ vẫn hoạt động. Các kiểm tra không ghi dữ liệu backend thật.

## 18. Form tạo lịch làm việc bác sĩ — 23/10/2026

- Yêu cầu: dựa theo DoctorScheduleCreateRequest, xây form với cấu trúc thẻ và logic tương tự management-appointment-form.
- Tạo DoctorScheduleForm kế thừa BaseFormComponent: form-shell, toolbar Quay lại/Hủy/Lưu, Reactive Forms, loading directive, grid 2/1 cột và nz-card/nz-form-item/nz-form-label/nz-form-control. Các nhóm gồm Thông tin bác sĩ, Phòng khám và sức chứa, Thời gian làm việc; mobile chuyển thành một cột và drawer vừa màn hình.
- Nút Tạo lịch làm việc mở drawer form mới, chỉ hiển thị/cho thao tác với ADMIN hoặc SUPER_ADMIN theo backend. Sau POST thành công đóng drawer với success true để danh sách tự tải lại. Các luồng xem/sửa cũ chưa được triển khai lại trong phạm vi tạo mới này.
- Bác sĩ lấy GET /api/admin/doctors?status=ACTIVE (DoctorResponse: id, doctorCode, fullName, specialtyName, status); phòng lấy GET /api/public/rooms và giữ các phòng AVAILABLE. Dropdown hỗ trợ tìm kiếm; roomId tùy chọn. Có lỗi tải lựa chọn và nút thử lại; không cho lưu khi dữ liệu chưa tải xong.
- Model DoctorScheduleCreateRequest chỉ gồm doctorId, roomId?, workDate, startTime, endTime, maxPatients?. Service create gửi POST /api/admin/doctor-schedules, không thêm trùng đường dẫn. Ngày gửi yyyy-MM-dd theo ngày người dùng chọn (không dùng toISOString làm lệch ngày); giờ HH:mm:00; phòng trống bỏ roomId; sức chứa form mặc định 20.
- Validation: bắt buộc bác sĩ/ngày/giờ/sức chứa; ngày từ hôm nay theo múi giờ phòng khám; giờ kết thúc sau giờ bắt đầu cùng ngày; số bệnh nhân nguyên dương trong giới hạn Integer Java; ID nguyên dương và phải có trong danh sách lựa chọn. Hiển thị nhắc backend tự chia slot tối đa 30 phút, không cho cấu hình thời lượng chưa có trong request.
- Khi lưu khóa form/nút gửi/nút Hủy; drawer tạo mới không đóng bằng mask, Escape hoặc X. Chặn gửi trùng. Lỗi bác sĩ/phòng không khả dụng, trùng ca bác sĩ/phòng, ngày giờ và sức chứa hiển thị tại form, giữ nguyên dữ liệu để sửa. Không đóng khi API báo thành công nhưng không trả bản ghi đã tạo.
- Unit test doctor-schedule-form.spec.ts: 8 trường hợp về định dạng ngày/giờ, trường bắt buộc/số nguyên, ngày quá khứ/giờ đảo/ngày không hợp lệ, payload bỏ phòng, phòng đã chọn, chống gửi/đóng khi chờ, lỗi trùng giữ dữ liệu, lỗi lookup và response thiếu result.
- Browser QA docs/qa/doctor-schedule-create.js: PASS trên localhost:4200 với fixture. Xác minh form thiếu dữ liệu/giờ đảo không POST, POST đầu không roomId báo trùng ca và giữ dữ liệu, POST sau có roomId thành công, khóa Hủy/Escape khi chờ và danh sách được tải lại. Không pageerror hoặc API ngoài fixture, không tạo ca thật trên backend.
- Đã mở kiểm tra ảnh desktop/mobile 390px tại docs/screenshots/doctor-schedule-create/. Payload quan sát: doctorId 1, workDate 2026-10-23, startTime 08:00:00, endTime 11:00:00, maxPatients 20; lần thứ hai thêm roomId 2.
- Các tệp chính: doctor-schedule/doctor-schedule-form/*; doctor-schedule.ts/.html; admin-doctor-schedule.service.ts; doctor-schedule.models.ts; api-constants.ts. Không sửa backend hoặc form lịch hẹn hiện có.
- Kết quả cuối: build development PASS; unit test 8/8 PASS. Chỉ còn các cảnh báo optional chaining dư đã có trong template danh sách. Chạy lại unit test bằng ng test --watch=false --include "src/app/management/pages/doctor-schedule/doctor-schedule-form/**/*.spec.ts"; browser bằng node docs/qa/doctor-schedule-create.js (WORKFLOW_QA_NODE_MODULES trỏ node_modules có playwright nếu cần).

## 19. Dùng chung form tạo/cập nhật và patch chi tiết ca — 23/10/2026

- Nhận id/isViewMode từ NZ_DRAWER_DATA, phân biệt chế độ tạo mới, cập nhật và xem. Có id thì GET /api/admin/doctor-schedules/{id} cùng dữ liệu lựa chọn; chỉ bật lưu khi tải thành công và id response khớp. Hàm patchDataForForm patchValue doctorId, roomId, workDate, startTime, endTime, maxPatients; ngày/giờ chuyển thành Date cho date/time picker.
- Bác sĩ hoặc phòng hiện tại không còn trong danh sách lựa chọn vẫn có option để hiển thị giá trị cũ, không bị mất thông tin khi patch. Bác sĩ ca đã tạo bị khóa; phòng không khả dụng chỉ dùng hiển thị giá trị cũ, không được chọn mới.
- Thêm DoctorScheduleUpdateRequest (các trường tùy chọn theo backend), service update(id, body) gọi PUT /api/admin/doctor-schedules/{id}; form onUpdate dùng đúng API này. Không dùng PATCH HTTP cho cập nhật: patchValue ở đây là gán dữ liệu vào Reactive Forms.
- Payload update chỉ gửi trường thay đổi, không gửi doctorId/thuộc tính response; giữ nguyên các trường không thay đổi, bao gồm ngày quá khứ và giây của khung giờ gốc. Không có thay đổi thì thông báo và không gửi request. Không hỗ trợ gửi null để bỏ phòng vì backend hiện hiểu null là giữ phòng cũ.
- Ca có bookedCount > 0: khóa ngày/giờ và đặt min sức chứa bằng giá trị gốc. Không thể suy ra toàn bộ lịch sử từ counter; nếu backend trả 6008 do lịch sử đặt đã hủy, form thông báo, trả lại ngày/giờ gốc và khóa các trường tương ứng. Backend tiếp tục kiểm tra xung đột và lịch sử khi lưu.
- Duy trì khóa form, nút đóng và Escape khi đang lưu; thất bại bật lại form nhưng giữ các trường vốn bị khóa. Thành công chỉ đóng khi response có id đúng, trả success true để danh sách tải lại. Thêm lỗi 6004/6008/6011 và sửa tiêu đề drawer, nút Lưu theo chế độ.
- Xem chi tiết dùng cùng form, chỉ tải detail, disable toàn bộ trường và ẩn nút lưu; không còn hiển thị form tạo trống khi bấm Xem/Sửa.
- Kiểm tra cuối: build development PASS; unit test doctor-schedule-form.spec.ts 16/16 PASS (8 tạo + 8 cập nhật/xem/load lỗi). Browser QA doctor-schedule-update.js PASS: patch dữ liệu đầy đủ, read-only, PUT đúng URL, payload chỉ roomId/maxPatients, lỗi trùng phòng giữ dữ liệu, thử lại thành công và reload list, tăng sức chứa ca quá khứ có lượt đặt chỉ gửi maxPatients. Chạy lại doctor-schedule-create.js PASS để xác minh tạo mới vẫn hoạt động. Không pageerror hoặc API ngoài fixture; chưa gọi PUT trên dữ liệu thật.
- Đã mở kiểm tra ảnh docs/screenshots/doctor-schedule-update/edit.png. Tệp thay đổi chính: doctor-schedule-form.ts/.html/.spec.ts; doctor-schedule.ts; admin-doctor-schedule.service.ts; doctor-schedule.models.ts; docs/qa/doctor-schedule-update.js.

## 20. Hoàn thiện dữ liệu lựa chọn và tạo lịch hẹn quản lý — 24/10/2026

### 20.1. Đối chiếu và phạm vi

- Đọc AdminAppointmentController, AppointmentCreateRequest, PatientController/PatientResponse, DoctorResponse, PublicServiceController/ServicesService, các API public schedule/slot và SecurityConfig.
- Form cũ có loadDataForPatient chưa thực hiện/ngOnInit chưa gọi, dropdown chỉ có option khi xem detail, nút lưu bị vô hiệu hóa, getDataPayLoad trả undefined, onUpdate gọi nhầm create. Đã hoàn thiện luồng tạo; giữ màn chi tiết và các thao tác trạng thái hiện có.
- Backend chưa có API cập nhật các trường của lịch hẹn; mọi lần mở với id đều là xem chi tiết, không gọi create để giả cập nhật. Không sửa backend trong đợt này.

### 20.2. Dữ liệu và quan hệ phụ thuộc

- AdminPatientService.getAllPatients trả ApiResponse<PatientProfile[]> từ GET /patients/all. Chuẩn hóa constant về /patients/all thay vì //patients/all (joinUrl trước đó đã loại dấu thừa). Dropdown dùng Patient.id làm patientId, không dùng userId; nhãn gồm mã/tên/điện thoại để tìm kiếm trên danh sách đã tải. Thẻ thông tin bệnh nhân cập nhật theo lựa chọn.
- GET /api/admin/doctors?status=ACTIVE tải bác sĩ; GET /api/public/services tải dịch vụ đang được public API cho phép đặt. Model bác sĩ có specialtyId; form lọc dịch vụ theo bác sĩ, cho dịch vụ chung specialtyId null nếu API trả về. Source getPublicServices hiện lọc chuyên khoa hoạt động, nên không tự bổ sung các dịch vụ backend không trả.
- POST /api/public/doctor-schedules/search với doctorId và fromDate/toDate bằng ngày chọn; chỉ giữ ca đúng bác sĩ/ngày/OPEN. GET /api/public/time-slots?scheduleId=... cho tất cả ca tìm được; ghép, loại trùng ID, sắp xếp giờ và lọc slot đúng ca, AVAILABLE, còn chỗ, bắt đầu ở tương lai theo UTC+7. Không giới hạn chỉ ca đầu tiên trong ngày.
- Đổi bác sĩ xóa dịch vụ và slot cũ; đổi ngày xóa slot cũ. Hủy subscription của request khung giờ trước để kết quả đến muộn không ghi đè dữ liệu mới. Có loading riêng, lỗi/retry khung giờ và thông báo không có giờ nhận đặt; hủy request khi đóng form.
- Tải dữ liệu ban đầu có loading, kiểm tra success và kiểu danh sách, báo lỗi cùng nút tải lại. Không cho lưu khi lookup chưa thành công hoặc đang tải slot.

### 20.3. Payload, lưu và giới hạn backend

- Thêm AdminAppointmentCreateRequest; POST /api/admin/appointments gửi patientId, doctorId, serviceId, timeSlotId, appointmentDate yyyy-MM-dd, reason/note đã trim và chỉ gửi khi có nội dung. Không gửi các nhãn, giá, scheduleId hoặc trạng thái trong form. Không dùng toISOString để chuyển ngày tránh lệch ngày.
- Validation ID nguyên dương, ngày hợp lệ từ hôm nay, reason/note tối đa 2.000 ký tự; kiểm tra membership bệnh nhân/bác sĩ/dịch vụ/slot và thời điểm slot lần nữa trước gửi. Backend quyết định cuối cùng về chỗ trống/trùng lịch/giá.
- Bật nút thêm mới, chống gửi trùng, khóa form/nút đóng/Escape/mask trong lúc gửi. Thành công phải có result.id, sau đó đóng drawer với success true và tải lại danh sách. API lỗi giữ lựa chọn và nội dung; lỗi slot không tồn tại/hết chỗ/sai ca xóa lựa chọn slot, tải lại danh sách giờ, không tự gửi lại POST. Lỗi trùng lịch bệnh nhân hoặc dịch vụ sai chuyên khoa có thông báo riêng.
- Giữ cách load/patch chi tiết lịch sử chỉ từ GET detail, không phụ thuộc lựa chọn đang khả dụng (slot cũ có thể đã qua giờ, khuyến mãi hết hạn). Giữ callback tải lại danh sách/chi tiết sau thao tác trạng thái.
- Quyền hiện tại: ADMIN/SUPER_ADMIN đọc được /patients/** và /api/admin/doctors/**. STAFF có quyền appointment API nhưng chưa được hai API lựa chọn này; nút tạo chỉ mở cho ADMIN/SUPER_ADMIN, form kiểm tra lại quyền. Chưa mở quyền backend hoặc dùng API không được cấp quyền để lách giới hạn; muốn STAFF đặt thay cần bổ sung quyền đọc giới hạn ở backend.
- Chưa tìm thấy controller liệt kê khuyến mãi trong backend, dù request có promotionId. Form tạo vô hiệu hóa lựa chọn này, giải thích tạo không áp khuyến mãi, không gửi ID tự nhập hoặc dữ liệu giả. Màn chi tiết vẫn hiển thị khuyến mãi lịch sử từ response. Cần API danh sách/điều kiện áp dụng trước khi bật chọn khuyến mãi mới.

### 20.4. Kiểm tra

- Build development PASS. Unit test management-appointment-form.spec.ts 12/12 PASS: patientId khác userId, lọc chuyên khoa, reset quan hệ phụ thuộc, ngày/ID/ghi chú không hợp lệ, chặn ID giả, lọc slot, hủy request cũ, lỗi lookup, chống gửi/đóng khi chờ, refresh sau conflict, không gửi promotionId chưa hỗ trợ, quyền STAFF và detail lịch sử read-only.
- Browser QA docs/qa/management-appointment-create.js PASS trên localhost:4200: lỗi tải bệnh nhân rồi thử lại; tìm bằng điện thoại; lọc dịch vụ; lấy slot của hai ca; POST đúng ID/ngày/text trim; lỗi 7003 tải lại và không còn slot cũ; chọn lại rồi thành công, khóa Hủy/Escape khi đang lưu, reload danh sách. Không pageerror hoặc request ngoài fixture.
- Regression docs/qa/appointment-workflow.js PASS với đủ 5 thao tác trạng thái/8 PATCH fixture, bao gồm hoàn thành từ drawer và cập nhật danh sách nền. Không gọi POST/PATCH trên dữ liệu thật.
- Đã mở kiểm tra ảnh desktop và mobile 390px tại docs/screenshots/management-appointment-create/. Tệp chính: management-appointment-form.ts/.html/.css/.spec.ts, management-appointments.ts/.html, management-appointments.service.ts, admin-patient.service.ts, appointment-create.models.ts và api-constants.ts.

## 21. Tập trung thay đổi trạng thái tại layout Xử lý lịch hẹn — 24/10/2026

- Theo yêu cầu sau khi đối chiếu layout appointment-review đã có, tách chức năng tra cứu/tạo lịch khỏi nơi xử lý trạng thái. Giữ nguyên đường dẫn /management/appointments/review, đổi tên hiển thị menu, tiêu đề trang và breadcrumb thành Xử lý lịch hẹn.
- Danh sách quản lý bỏ app-appointment-actions/nút đổi trạng thái trực tiếp, thay bằng nút Xử lý. Giữ nút xem chi tiết và tạo mới. Nút Xử lý kiểm tra permission appointments:update-status, điều hướng mang theo doctorId, date và appointmentCode.
- AppointmentDetailDrawerData thêm showWorkflowActions, mặc định false. Drawer mở từ quản lý đặt false: hiển thị thông tin chỉ đọc cùng nút Xử lý lịch hẹn nếu có quyền; không dựng component thao tác trạng thái. Khi bấm nút dẫn, đóng drawer rồi điều hướng đúng bác sĩ/ngày/mã lịch.
- Drawer mở từ appointment-review đặt showWorkflowActions true: giữ component workflow và callback tải lại detail, summary và danh sách sau thao tác. Hàm xử lý refresh của drawer cũng bỏ qua sự kiện khi cờ false.
- Form tạo lịch không còn footer workflow và handler đổi trạng thái cũ; nghiệp vụ tạo, validation, lựa chọn bệnh nhân/bác sĩ/dịch vụ/slot không thay đổi.
- Layout xử lý đọc queryParamMap, áp ngày vào cả bộ lọc summary và danh sách, chọn đúng bác sĩ rồi tìm theo mã lịch hẹn. Nếu bác sĩ đích không xuất hiện trong summary thì hiển thị thông báo, không âm thầm chọn bác sĩ khác. Giữ cách sử dụng mặc định khi mở từ menu không có tham số.
- safeManagementReturnUrl chấp nhận route appointments/review để tiếp tục được đúng màn/bộ lọc sau đăng nhập. Không đổi quyền backend, service transition, policy trạng thái hoặc modal xác nhận dùng chung.
- Build development PASS, còn cảnh báo template optional chaining đã có. Unit test 10/10 PASS cho trang xử lý và drawer chi tiết: giữ debounce/hủy request cũ, nhận đúng context từ URL, xử lý bác sĩ không có trong summary, bật workflow theo nơi mở và truyền dữ liệu điều hướng.
- Browser QA docs/qa/appointment-workflow-handoff.js PASS trên localhost:4200: quản lý không có component workflow, drawer quản lý chỉ có nút dẫn; điều hướng đúng bác sĩ/ngày/mã, chỉ hiện đúng lịch; xác nhận tại card rồi bắt đầu/hoàn thành trong drawer xử lý, summary/danh sách được tải lại; nút Xử lý từng dòng cũng dẫn đúng lịch. 3 PATCH fixture, 5 lần summary, không pageerror/request ngoài fixture. Đây là bài kiểm tra thay thế giả định cũ rằng các thao tác được bấm trực tiếp trong bảng quản lý.
- Regression docs/qa/management-appointment-create.js PASS sau thay đổi: tạo lịch vẫn hoạt động đầy đủ, lỗi lookup/hết chỗ và tải lại danh sách đúng. Không gọi API ghi dữ liệu thật.
- Đã mở ảnh kiểm tra docs/screenshots/appointment-workflow-handoff/processed.png. Tệp chính: management-appointments.ts/.html; management-appointment-detail.ts/.html/.spec.ts; management-appointment-form.ts/.html; appointment-review.ts/.html/.spec.ts; management.routes.ts; models/management.models.ts; docs/qa/appointment-workflow-handoff.js.

## 22. Hủy nhanh lịch hẹn từ danh sách quản lý — 24/10/2026

- Theo yêu cầu mới, bổ sung ngoại lệ hủy nhanh ngay trên quản lý lịch hẹn; các thao tác xác nhận/bắt đầu/hoàn thành/không đến tiếp tục tập trung ở layout Xử lý lịch hẹn.
- Hoàn thiện nút icon Hủy lịch hẹn người dùng đã thêm: chỉ hiển thị khi có permission appointments:update-status và policy cho phép cancel (PENDING/CONFIRMED). Có type button, aria-label theo mã lịch, khóa nút khi đã có hộp thoại mở. Lịch đang khám/hoàn thành/đã hủy/không đến không có nút hủy.
- Thay đoạn onCancel sao chép từ luồng bệnh nhân, đang tham chiếu các biến không có trong component và cancelMyAppointment, bằng AppointmentActionDialog dùng chung với action cancel. Gọi đúng service quản lý PATCH /api/admin/appointments/{id}/cancel, không dùng endpoint bệnh nhân và không xóa bản ghi.
- Giữ toàn bộ validation và cơ chế đã có: lý do bắt buộc không trắng/tối đa 2.000 ký tự, trim note, GET chi tiết kiểm tra trạng thái trước PATCH, kiểm tra phiên/quyền, khóa gửi trùng và khóa đóng khi chờ, thông báo lỗi trong modal. Nếu dữ liệu vừa đổi, không PATCH mà yêu cầu đóng/tải lại; nút X cũng chuyển kết quả refresh về danh sách.
- Sau thành công hoặc kết quả yêu cầu refresh, tải lại danh sách với bộ lọc/phân trang hiện tại; đóng modal không thay đổi thì không tải lại. Khi rời trang, hủy modal và subscription theo DestroyRef.
- Build development PASS. Unit test 21/21 PASS gồm 4 kiểm thử nút hủy nhanh và 17 kiểm thử policy/service/dialog dùng chung.
- Browser QA docs/qa/management-appointment-cancel.js PASS với STAFF fixture: nhập thiếu lý do không PATCH; trạng thái đổi trước khi hủy không PATCH, đóng X tải lại đúng; lỗi máy chủ giữ modal để thử lại; PATCH gửi note đã trim; Escape bị chặn trong lúc chờ; hủy thành công cập nhật nhãn và ẩn nút. Kiểm tra hủy hai lịch, 3 PATCH fixture (một lần lỗi, hai lần thành công), 4 lần tìm kiếm, không pageerror/request ngoài fixture. Không thay đổi lịch hẹn thật.
- Đã mở ảnh kiểm tra docs/screenshots/management-appointment-cancel/dialog.png. Tệp thay đổi: management-appointments.ts/.html; management-appointments-cancel.spec.ts; docs/qa/management-appointment-cancel.js. Không đổi API/policy chung hoặc workflow tại trang xử lý.

## 23. Đăng ký icon tool cho nút Xử lý — 24/10/2026

- Template dùng nzType tool, theme outline; NzIconModule đã import đúng nhưng APP_ICONS chưa có ToolOutline. Tool không nằm trong bộ icon mặc định của NG-ZORRO phiên bản đang cài.
- Thêm ToolOutline vào import và APP_ICONS trong src/app/app-icons.ts; app.config.ts đã có provideNzIcons(APP_ICONS), không cần thêm module hoặc đổi template.
- Chạy unit test src/app/app.spec.ts: 3/3 PASS; kiểm tra toàn bộ icon đăng ký (gồm tool) sinh SVG/path trực tiếp và không request assets bên ngoài.

## 24. Đăng ký icon của các thao tác lịch hẹn — 24/10/2026

- AppointmentActionsComponent đã import NzIconModule. ACTION_STYLE dùng play-circle cho in-progress, minus-circle cho no-show và check-square cho complete, nhưng APP_ICONS chưa đăng ký ba icon này.
- Bổ sung PlayCircleOutline, MinusCircleOutline và CheckSquareOutline vào import và APP_ICONS ở src/app/app-icons.ts. Giữ nguyên tên icon, màu sắc, điều kiện trạng thái và luồng API.
- Kiểm tra src/app/app.spec.ts: 3/3 PASS, gồm render SVG/path của mọi icon đã đăng ký và không tải file assets bên ngoài.

## 25. Sửa trang quản lý chuyên khoa không hiển thị bảng — 24/10/2026

- Đối chiếu ManagementSpecialties, template, ManagementSpecialtiesService, route /management/specialty và SpecialtyController. Backend source hiện có POST /api/admin/specialties/search trả Page<SpecialtyResponse>.
- Tái hiện trực tiếp trên localhost:4200 bằng fixture: không lỗi JavaScript, API trả code 1000, component và ShareTable đều có 1 dòng/6 cột, nhưng DOM nz-table chỉ còn nz-spin không có nội dung bảng. Đồng thời errorMessage bị gán chuỗi undefined vì String(res.message), errorCode đổi từ rỗng sang 1000 khi thành công; directive appShowOnErrorCode clear/dựng lại embedded view khi các input này thay đổi.
- Sửa loadData: clearError trước khi tải, không ghi errorCode/errorMessage ở nhánh thành công; chỉ setError với thông báo hữu ích khi thất bại hoặc payload không có content hợp lệ. Xóa dữ liệu cũ khi lỗi, hủy request trước khi tải mới, trim keyword và chỉ gửi keyword/status theo request backend.
- Search service dùng postList<SpecialtyResponseItem> đúng kiểu response phân trang, notification false để tải/tìm kiếm không hiện toast thành công. Đổi aria-label tìm kiếm và nhãn tổng số từ lịch làm việc sang chuyên khoa.
- Sau sửa source, bảng xuất hiện nhưng server 4200 vẫn phục vụ một phần template cũ (aria-label cũ, ô trạng thái/chức năng trống). Đã xác minh PID 29676 chạy ng serve của đúng workspace và khởi động lại cùng cổng với --no-hmr, không sửa package.json. Sau restart template mới đồng bộ, nhãn trạng thái và ba icon chức năng đều xuất hiện. Server tiếp tục chạy cho người dùng.
- Kiểm tra: dev server biên dịch thành công; unit test management-specialties.spec.ts 5/5 PASS (success không đổi error inputs, payload tìm kiếm, lỗi xóa stale data, response sai định dạng, hủy request cũ). Browser QA docs/qa/management-specialties.js PASS: bảng hiện CK-001, trạng thái Đang hoạt động, nút xem chi tiết, tìm kiếm trim keyword và không toast thành công; không pageerror/request ngoài fixture. Chưa gọi API ghi dữ liệu thật.
- Đã mở kiểm tra ảnh docs/screenshots/management-specialties/desktop.png.
- Phát hiện ngoài phạm vi lỗi hiển thị: onOpenDetail đang dùng DoctorScheduleDetail/DoctorScheduleForm cho chuyên khoa; service getSpecialtyDetail/delete chưa nối /{id}; tiêu đề xóa còn là Xoá Wifi. Chưa triển khai hoặc kiểm tra CRUD chuyên khoa trong lần sửa này, không xác nhận các nút đó hoạt động đúng nghiệp vụ.
- Tệp thay đổi: management-specialties.ts/.html; management-specialties.service.ts; management-specialties.spec.ts; docs/qa/management-specialties.js. Không sửa component bảng/directive lỗi dùng chung hoặc backend.

## 26. Form tạo mới, cập nhật và xem chuyên khoa — 25/10/2026

- Đối chiếu SpecialtyController, SpecialtyRequest, SpecialtyUpdateRequest, SpecialtyService và quyền backend: POST /api/admin/specialties, GET /api/admin/specialties/{id}, PUT /api/admin/specialties/{id}. ADMIN/SUPER_ADMIN được ghi; STAFF được xem. Không sửa backend.
- Hoàn thiện ManagementSpecialtiesForm theo cấu trúc form quản lý hiện có: thanh quay lại/lưu, card thông tin và trạng thái, reactive form, loading, lỗi inline và bố cục thích ứng màn hình nhỏ. Dùng chung cho tạo, sửa và xem chỉ đọc; thay các drawer đang trỏ nhầm sang lịch bác sĩ.
- Tạo mới: code tùy chọn tối đa 50 ký tự; bỏ khỏi payload khi trống/khoảng trắng để backend tự sinh. Name bắt buộc không trắng, tối đa 255 ký tự và trim khi gửi. Description tùy chọn, không áp giới hạn độ dài. Trạng thái hiển thị ACTIVE, khóa chọn và không gửi status trong POST. Backend chịu trách nhiệm chuẩn hóa mã và kiểm tra trùng không phân biệt hoa/thường.
- Cập nhật: GET theo id trước khi patch đầy đủ dữ liệu. Chỉ gửi trường thay đổi qua PUT; sửa tên/mô tả/trạng thái không gửi lại hoặc sinh lại mã cũ. Cho phép xóa mô tả bằng chuỗi rỗng. Mã/tên khi sửa không được trắng. Chưa thay đổi thì không gọi API.
- Thêm model request có kiểu, sửa endpoint chi tiết có /{id}, chuẩn hóa endpoint gốc không có slash cuối, thêm service update. Lưu thành công đóng drawer và tải lại danh sách với bộ lọc hiện tại.
- Chặn gửi trùng và đóng form khi đang lưu; kiểm tra quyền trước khi gọi API; giữ dữ liệu khi lỗi. Hiển thị lỗi mã/tên đã tồn tại, chuyên khoa không tồn tại, hết phiên/quyền và không được ngừng hoạt động khi còn ca khám OPEN/FULL từ hôm nay. Tải chi tiết thất bại có nút thử lại. Kết quả lưu không xác định yêu cầu kiểm tra danh sách trước khi thử lại.
- Build development PASS; unit test management-specialties-form.spec.ts 14/14 PASS. Còn cảnh báo optional chaining ở template danh sách có sẵn.
- Browser QA docs/qa/management-specialty-form.js PASS: chặn tên trắng; POST bỏ mã trắng/status; lỗi trùng tên giữ form; GET patch dữ liệu; PUT chỉ chứa description/status và giữ mã; chế độ xem khóa form; lưu xong tải lại danh sách (3 lần search); drawer vừa màn hình 390px. Không pageerror/request ngoài fixture, không ghi dữ liệu thật.
- Đã mở kiểm tra ảnh desktop/mobile trong docs/screenshots/management-specialty-form/. Tệp chính: management-specialties-form.ts/.html/.css/.spec.ts; management-specialties.ts; management-specialties.service.ts; specialty.model.ts; api-constants.ts; docs/qa/management-specialty-form.js.
- Chức năng xóa chuyên khoa đã ghi nhận ở mục 25 tiếp tục nằm ngoài phạm vi tạo/cập nhật lần này.

## 27. Đồng bộ thông báo lỗi nghiệp vụ chuyên khoa — 25/10/2026

- Theo bảng mã backend cung cấp, bổ sung bảng dùng chung tại src/app/utils/specialty/specialty-error.utils.ts cho đủ 8 mã: 3001, 3003, 3004, 3005, 3006, 3007, 3008, 3009. Không tự thêm mã 3002. Phân biệt chuyên khoa không tồn tại, đã ngừng hoạt động/có quan hệ, trùng mã/tên, còn ca khám tương lai và dữ liệu không hợp lệ.
- Ưu tiên mã nghiệp vụ trong body thay cho message tiếng Anh hoặc HTTP status. Helper nhận cả response đã được BaseService chuẩn hóa và HttpErrorResponse trực tiếp; giữ thông báo theo thao tác khi lỗi chưa biết, đồng thời giữ lỗi phiên đăng nhập/quyền. Không thay cơ chế HTTP dùng chung của toàn dự án.
- Áp dụng cho form tạo/cập nhật, tải chi tiết, danh sách và thông báo xóa chuyên khoa. Bỏ bảng mã cục bộ của form để tránh lệch nội dung. Sửa tiêu đề modal xóa còn sót Xoá Wifi thành Xóa chuyên khoa.
- Đồng bộ lỗi chuyên khoa trong helper thông báo lịch hẹn và form tạo lịch quản lý; mã 3004 hướng dẫn chọn chuyên khoa đang hoạt động, tránh thông báo gán phòng trong luồng đặt lịch.
- Unit test 33/33 PASS: 8 trường hợp HTTP 400/404/409 đi qua HttpClient + BaseService vẫn nhận đúng business code/message tiếng Việt; raw HTTP/string code, mã chưa biết/lỗi mạng, phiên/quyền; lỗi tải chi tiết, lỗi tìm kiếm, xóa khoa có quan hệ đã vô hiệu hóa và regression form/danh sách. Không gọi API ghi dữ liệu thật.
- Build development PASS; còn các cảnh báo optional chaining đã có trong template. git diff --check PASS.

## 28. Danh mục dịch vụ theo ADMIN_SERVICE_API — 25/10/2026

- Đọc ../examine/ADMIN_SERVICE_API.md, đối chiếu ServiceRequest/ServiceUpdateRequest và SecurityConfig của backend. Triển khai FE theo đường dẫn chuẩn /api/admin/services; không sửa backend hoặc dùng public API thay danh sách quản trị.
- Thêm trang /management/services và menu Quản lý dịch vụ. Quyền services:read cho ADMIN/SUPER_ADMIN/STAFF; DOCTOR không có menu và bị route guard chặn. Chỉ ADMIN/SUPER_ADMIN có nút và handler ghi. Bổ sung services vào URL quay lại hợp lệ sau đăng nhập.
- Danh sách dùng POST /search, gửi keyword trim/specialtyId/status trong body; page/size/sort=id,asc trong query, tổng phân trang dùng totalElements. Có bộ lọc chuyên khoa/trạng thái, tìm mã/tên, tải lại, cấu hình cột. Hiển thị mã, tên, khoa hoặc dịch vụ dùng chung, giá, thời lượng, trạng thái và thao tác. Hủy request tìm kiếm cũ; khi lỗi xóa dữ liệu stale, giữ toolbar và nút thử lại.
- Bộ lọc tải GET /api/admin/specialties không lọc trạng thái để giữ cả tên khoa ngừng hoạt động. Form tải GET cùng endpoint với status=ACTIVE, giữ lựa chọn khoa hiện tại đã ngừng hoạt động dưới dạng option bị khóa. Nếu lookup/chi tiết lỗi, chặn lưu và có nút tải lại.
- Form tạo/sửa/xem dùng cấu trúc reactive form, toolbar, card, loading, lỗi inline và drawer responsive tương tự quản lý chuyên khoa/lịch hẹn. GET /{id} patch dữ liệu trước khi sửa/xem; view khóa toàn form. Tạo mặc định ACTIVE, không gửi status; mã trống được bỏ để backend sinh, name trim/bắt buộc/tối đa 255, code tối đa 50, description không đặt giới hạn. Không giả định tên dịch vụ duy nhất.
- Giá bắt buộc là số >=0, tối đa 13 chữ số nguyên và 2 chữ số thập phân. Thời lượng tùy chọn là số nguyên dương trong phạm vi Integer backend, mặc định hiển thị 30; bỏ trống tạo dùng mặc định, bỏ trống sửa giữ cũ. Payload không chứa chuỗi tiền có dấu phân cách.
- PUT /{id} chỉ gửi trường thay đổi, giữ nguyên mã cũ nếu không sửa. Description rỗng xóa mô tả. Chọn dịch vụ dùng chung gửi clearSpecialty:true, không đồng thời gửi specialtyId. Có thể tách khỏi khoa INACTIVE và bật dịch vụ trong cùng request; chặn bật khi vẫn giữ khoa INACTIVE. UI dùng giá trị 0 nội bộ để hiển thị rõ lựa chọn dùng chung, chuyển thành null trước khi tạo payload; không gửi specialtyId=0 lên BE.
- Bật/tắt nhanh dùng PATCH /{id}/status với modal xác nhận. Xóa dùng DELETE /{id}; đọc result.action/result.message, phân biệt DELETED với DEACTIVATED, giữ lịch sử theo backend và tải lại bảng. Xóa dòng cuối một trang thì lùi về trang trước. Modal thông báo mã/tên bằng Angular interpolation, khóa Hủy/Escape và thao tác cạnh tranh khi chờ; lỗi giữ modal để xem lý do. Form khóa gửi trùng/đóng khi lưu.
- Thêm thông báo tiếng Việt dùng chung cho 5002/5003/5005/5006, dùng lại lỗi chuyên khoa 3003/3004 và lỗi phiên/quyền. HttpClient/BaseService giữ business code trong body dù HTTP 400/404. Không tạo logic lỗi trùng tên chưa được backend sử dụng. Đăng ký PoweroffOutline để icon bật/tắt hiển thị ngay.
- Unit test 38/38 PASS: form 17, danh sách/thao tác/quyền 9, API/error contract 9 và icon ứng dụng 3. Bao gồm giá/thời lượng không hợp lệ, mã trùng, giữ mã, clearSpecialty, khoa INACTIVE, chống gửi trùng, quyền STAFF/DOCTOR, HTTP lỗi và kết quả xóa dạng object.
- Build development PASS; còn cảnh báo optional chaining có sẵn ở các trang khác. git diff --check PASS. Browser QA docs/qa/management-services.js dùng fixture toàn bộ API; tạo/sửa, lọc, PATCH, DELETED/DEACTIVATED, lỗi chuyên khoa INACTIVE/xóa lại, khóa modal khi chờ, STAFF chỉ xem và drawer 390px đều PASS, không pageerror/request ngoài fixture. Không ghi dữ liệu thật hoặc xác nhận backend đang chạy đã được restart.
- Đã mở kiểm tra ảnh list.png/form.png/mobile.png tại docs/screenshots/management-services/. Tệp chính: management-services.ts/.html/.css; management-service-form.ts/.html/.css; service-form.validators.ts; service.model.ts; management-services.service.ts; service-error.utils.ts; route/menu/permission và app-icons.ts; các spec và docs/qa/management-services.js.

## 29. Danh mục phòng khám theo ADMIN_ROOM_API — 25/10/2026

- Đọc ../examine/ADMIN_ROOM_API.md, đối chiếu RoomUpdateRequest và RoomAvailabilityRequest. Thêm /management/rooms, menu Quản lý phòng khám và permission rooms:read cho ADMIN/SUPER_ADMIN/STAFF; DOCTOR bị route guard chặn. Chỉ ADMIN/SUPER_ADMIN thấy nút và được handler cho phép ghi. Bổ sung URL quay lại sau đăng nhập.
- Thêm model RoomResponse/RoomRequest/RoomUpdateRequest/RoomSearchRequest/RoomAvailabilityRequest/RoomDeleteResponse và bảng 4 trạng thái AVAILABLE (Sẵn sàng), OCCUPIED (Đang sử dụng), MAINTENANCE (Bảo trì), INACTIVE (Ngừng hoạt động). Không thêm trường sức chứa chưa được API hỗ trợ.
- Danh sách POST /api/admin/rooms/search với keyword trim, status, specialtyId, sharedOnly trong body; page/size/sort=id,asc trong query, mặc định 10 dòng, tổng dùng totalElements. Tìm mã/tên/vị trí, lọc cả chuyên khoa ngừng hoạt động, lọc phòng dùng chung, phân trang/cấu hình cột/tải lại. Lựa chọn khoa và chỉ phòng dùng chung dùng chung một dropdown nên không sinh payload sharedOnly=true và specialtyId khác null.
- Form reactive dùng drawer cùng cấu trúc quản lý dịch vụ/chuyên khoa; GET /{id} patch dữ liệu, xem khóa form. Code bắt buộc không trắng/tối đa 50, không tự sinh; name bắt buộc không trắng/tối đa 255, không giả định trùng tên bị cấm; location tùy chọn tối đa 255 và trim. Tạo gửi mã/tên/vị trí/khoa/trạng thái, mặc định AVAILABLE, cho phép chọn đủ 4 trạng thái ngay khi tạo.
- Form cập nhật sử dụng PATCH /{id}, chỉ gửi trường thay đổi. Xóa vị trí gửi clearLocation:true, bỏ khoa gửi clearSpecialty:true, không gửi trường giá trị đồng thời với cờ xóa. Sửa tên/vị trí giữ khoa INACTIVE cũ; chỉ cho chuyển sang khoa ACTIVE hoặc phòng dùng chung. Mã được giữ nếu không sửa. Service vẫn hỗ trợ PUT form đầy đủ theo contract riêng: code/name bắt buộc, null vị trí/khoa có nghĩa xóa; không dùng PUT với payload PATCH.
- Dropdown tạo/gán khoa dùng GET /api/admin/specialties?status=ACTIVE; giữ khoa hiện tại INACTIVE dưới dạng option khóa để hiển thị chính xác. Bộ lọc danh sách dùng GET không lọc trạng thái. Chi tiết/lookup lỗi có nút thử lại và chặn lưu.
- Đổi trạng thái bằng modal chọn đủ 4 giá trị và PATCH /{id}/status. Không gửi khi chưa đổi trạng thái. Hiển thị rõ AVAILABLE không bảo đảm rảnh theo giờ; OCCUPIED do quản trị đặt, không tự chuyển hoặc hủy lịch. Xóa dùng DELETE /{id}, đọc result.action/result.message để phân biệt DELETED/DEACTIVATED; thành công tải lại, xóa dòng cuối trang thì lùi trang. Khóa gửi trùng/đóng/Hủy/Escape trong lúc lưu; lỗi giữ dữ liệu/modal.
- Thêm chế độ Tìm phòng rảnh trong trang: POST /api/admin/rooms/availability/search; ngày local không quá khứ, giờ HH:mm:ss không offset/giây lẻ, kết thúc sau bắt đầu cùng ngày. Không gọi API khi ngày/giờ sai. Body không có status và không gửi excludeScheduleId trong tra cứu danh mục; service có trường tùy chọn này cho caller sửa lịch trong tương lai. Chỉ hiển thị khoa ACTIVE trong bộ lọc chế độ này, giữ lựa chọn phòng dùng chung và hỗ trợ phân trang. Hiển thị ngày/giờ của kết quả cùng nhắc nhở không giữ chỗ; không thay luồng phân công lịch bác sĩ hiện có.
- Thông báo tiếng Việt dùng chung cho 6002, 9001, 9002, 9003, 9004, lỗi khoa 3001/3004 và phiên/quyền. Phân biệt 9003 chặn bảo trì/ngừng/xóa vì còn OPEN/FULL từ hôm nay với 9004 chặn chuyển/bỏ khoa khi còn OPEN/FULL/CLOSED chưa hủy từ hôm nay. Helper cũng có thông báo 6003/6004/6007 để dùng trong nghiệp vụ tra cứu/phân công liên quan. Giữ business code khi HTTP 400/404/409.
- Unit test 39/39 PASS: form 15, danh sách/trạng thái/phân quyền/availability 13, API contract và HTTP business error 11. Bao gồm clear flags không xung đột, giữ khoa INACTIVE, mã bắt buộc, giới hạn độ dài, khóa lưu trùng, phân trang/tổng, ngày sai/quá khứ/qua đêm/giây lẻ và STAFF/DOCTOR.
- Build development PASS; còn cảnh báo optional chaining có sẵn ở các trang khác. git diff --check PASS. Browser QA docs/qa/management-rooms.js PASS: 11 lần search, 2 POST tạo (một lần lỗi mã trùng), 3 PATCH thông tin (một lần lỗi 9004), 2 PATCH trạng thái (một lần lỗi 9003), 3 DELETE (một lần lỗi 9003, một DEACTIVATED, một DELETED), 2 availability cho ADMIN/STAFF. Modal khóa Hủy/Escape khi chờ; form giữ lỗi để sửa; STAFF chỉ xem/tìm phòng rảnh, DOCTOR bị chuyển /403. Không pageerror/request ngoài fixture.
- Đã mở kiểm tra ảnh list.png/form.png/availability.png/mobile.png trong docs/screenshots/management-rooms/. Toàn bộ browser/API tests dùng fixture, không ghi phòng/lịch thật hoặc xác nhận backend triển khai đã restart. Không sửa backend, public API, component bảng dùng chung hay luồng lịch bác sĩ.
- Tệp chính: management-rooms.ts/.html/.css, management-room-form.ts/.html/.css, room.model.ts, management-rooms.service.ts, room-error.utils.ts, room-availability.utils.ts, route/menu/permission, các spec và docs/qa/management-rooms.js.
