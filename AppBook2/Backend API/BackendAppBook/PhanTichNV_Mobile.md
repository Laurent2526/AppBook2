TÀI LIỆU MÔ TẢ NGHIỆP VỤ
HỆ THỐNG QUẢN LÝ SÁCH/TRUYỆN TRỰC TUYẾN – APPBOOK
Mobile App (Người dùng) • Web Admin (ReactJS) • Backend (Node.js)
Thông tin Nội dung
Phiên bản 1.0 – bản mở rộng chi tiết
Nền tảng Mobile App (Android/iOS) + Web Admin
Công nghệ Frontend ReactJS (Web Admin), React Native/Flutter (Mobile App)
Công nghệ Backend Node.js (Express), REST API
Phạm vi tài liệu Đặc tả nghiệp vụ chi tiết, quy trình xử lý, mô hình dữ liệu, yêu cầu phi chức năng

 

1. Tổng quan hệ thống
   1.1. Giới thiệu
   APPBOOK là nền tảng đọc và đăng tải sách/truyện trực tuyến, cho phép người dùng vừa đọc nội dung vừa có thể trở thành tác giả đăng tải nội dung của riêng mình. Hệ thống có mô hình kinh doanh dựa trên nội dung trả phí theo chương hoặc combo, với cơ chế chia sẻ doanh thu giữa nền tảng và người đăng.
   Hệ thống gồm hai giao diện chính:
   • Mobile App: dành cho Người đọc và Người đăng, chạy trên Android/iOS.
   • Web Admin: dành cho Quản trị viên, xây dựng bằng ReactJS, quản lý toàn bộ dữ liệu, tài chính và kiểm duyệt nội dung.
   • Backend: xây dựng bằng Node.js, cung cấp REST API dùng chung cho cả hai giao diện trên.
   1.2. Vai trò người dùng
   Vai trò Mô tả
   Người đọc (Reader) Tìm kiếm, theo dõi, lưu và đọc sách/truyện; nạp tiền, mua chương/combo trả phí.
   Người đăng (Author) Đăng tải sách/truyện, quản lý nội dung của mình, theo dõi lượt đọc và doanh thu, rút tiền.
   Quản trị viên (Admin) Quản lý toàn bộ sách/truyện, tài khoản, giao dịch tài chính, kiểm duyệt nội dung và thống kê hệ thống.
   Lưu ý: Một tài khoản có thể đồng thời giữ vai trò Người đọc và Người đăng; hệ thống không yêu cầu tạo hai tài khoản riêng biệt. Vai trò Admin là tài khoản nội bộ, chỉ được Admin cấp cao tạo/cấp quyền, không tự đăng ký qua Mobile App.
   1.3. Phạm vi tài liệu
   Tài liệu mô tả chi tiết nghiệp vụ theo ba nhóm: (1) Xác thực & tài khoản, (2) Nghiệp vụ Web Admin, (3) Nghiệp vụ Mobile App, kèm theo nghiệp vụ tài chính, kiểm duyệt nội dung, mô hình dữ liệu và yêu cầu phi chức năng — là các phần được bổ sung so với bản mô tả sơ khởi ban đầu.
2. Phân quyền người dùng
   Ma trận quyền dưới đây tổng hợp các nhóm chức năng chính và quyền truy cập tương ứng của từng vai trò.
   Chức năng Người đọc Người đăng Admin
   Đọc sách/truyện miễn phí ✔ ✔ ✔ (xem trước)
   Mua chương/combo trả phí ✔ ✔ —
   Nạp tiền / Rút tiền Chỉ nạp Nạp & rút —
   Đăng sách/truyện mới — ✔ ✔ (thay mặt kiểm duyệt)
   Sửa/xóa nội dung của mình — ✔ (sửa tự do, xóa cần duyệt) ✔ toàn quyền
   Duyệt nội dung đăng mới — — ✔
   Duyệt yêu cầu xóa sách/rút tiền — — ✔
   Quản lý tài khoản người dùng — — ✔
   Xem thống kê hệ thống — Chỉ số liệu của mình ✔ toàn hệ thống
3. Nghiệp vụ xác thực & tài khoản
   3.1. Đăng ký tài khoản
   Người dùng truy cập Tài khoản → Đăng ký, nhập: Email/SĐT, Username, Password, Confirm Password.
   • Hệ thống kiểm tra email/SĐT chưa tồn tại và mật khẩu đạt độ phức tạp tối thiểu (≥ 8 ký tự, có chữ và số).
   • Hệ thống gửi mã OTP qua email hoặc SMS để xác thực; tài khoản ở trạng thái Chờ xác thực cho đến khi người dùng nhập đúng OTP trong thời hạn hiệu lực (ví dụ 5 phút).
   • Sau khi xác thực thành công, tài khoản chuyển sang trạng thái Active và được lưu vào hệ thống.
   Lưu ý: Bản mô tả gốc chưa có bước xác thực OTP — đây là bước bắt buộc để hạn chế tài khoản ảo, spam nạp/rút tiền và gian lận doanh thu.
   3.2. Đăng nhập
   Luồng xử lý: Người dùng nhập Email/SĐT + Mật khẩu → Backend kiểm tra thông tin → Nếu hợp lệ, tạo cặp Access Token (thời hạn ngắn, ví dụ 15 phút) và Refresh Token (thời hạn dài, ví dụ 30 ngày) → Trả về client → Đăng nhập thành công.
   • Access Token dùng để xác thực mỗi request API; hết hạn thì dùng Refresh Token để cấp lại mà không cần đăng nhập lại.
   • Hỗ trợ đăng nhập nhiều thiết bị; người dùng có thể xem và thu hồi (đăng xuất) từng phiên trong mục Tài khoản → Thiết bị đăng nhập.
   • Giới hạn số lần đăng nhập sai liên tiếp (ví dụ 5 lần) trước khi tạm khóa đăng nhập trong một khoảng thời gian, chống brute-force.
   3.3. Quên mật khẩu / đặt lại mật khẩu
   Người dùng chọn Quên mật khẩu → nhập Email/SĐT → Hệ thống gửi OTP hoặc liên kết đặt lại mật khẩu có thời hạn → Người dùng nhập mật khẩu mới → Hệ thống mã hóa và cập nhật mật khẩu → Vô hiệu hóa toàn bộ token đăng nhập cũ để đảm bảo an toàn.
   3.4. Quản lý phiên đăng nhập
   • Mật khẩu được băm bằng thuật toán bcrypt/argon2, không lưu dạng plain text.
   • Access Token dùng chuẩn JWT, ký bằng khóa bí mật lưu ở backend.
   • Khi Admin khóa tài khoản, toàn bộ token hiện có của tài khoản đó bị vô hiệu hóa ngay lập tức.
4. Nghiệp vụ dành cho Admin (Web Admin)
   4.1. Quản trị sách/truyện
   Admin có quyền quản lý toàn bộ sách/truyện trên hệ thống với các chức năng: tìm kiếm, xem danh sách, xem chi tiết, thêm, sửa, xóa, quản lý chương, xem người đăng, xem trạng thái.
   4.1.1. Vòng đời trạng thái nội dung
   Đây là phần bổ sung quan trọng: bản mô tả gốc chưa định nghĩa các trạng thái nội dung, dẫn đến sách/truyện có thể hiển thị công khai mà không qua kiểm duyệt.
   Trạng thái Ý nghĩa
   Chờ duyệt (Pending) Nội dung vừa đăng/sửa, chưa hiển thị công khai, chờ Admin kiểm duyệt.
   Đã duyệt / Công khai (Published) Nội dung hợp lệ, hiển thị trên nền tảng.
   Bị từ chối (Rejected) Vi phạm quy định, không được công khai; người đăng nhận thông báo kèm lý do.
   Bị ẩn (Hidden) Nội dung từng công khai nhưng bị Admin tạm ẩn do vi phạm hoặc đang bị report.
   Chờ xóa (Pending Delete) Đã được người đăng yêu cầu xóa, chờ Admin xét duyệt.
   4.1.2. Quy trình đăng truyện & kiểm duyệt
   • Người đăng nhập thông tin sách/truyện và nội dung → Hệ thống lưu ở trạng thái Chờ duyệt → Admin xem xét → Duyệt (chuyển Công khai) hoặc Từ chối (kèm lý do, trả về người đăng để chỉnh sửa).
   • Việc sửa chương đã công khai (đặc biệt chương đã có người mua) cần được ghi log lịch sử chỉnh sửa, không cho xóa nội dung gốc — phục vụ giải quyết tranh chấp (xem mục 7.3).
   4.1.3. Quy trình xóa sách/truyện
   Backend không cho phép người đăng gọi trực tiếp API xóa (DELETE). Thay vào đó áp dụng cơ chế Yêu cầu – Xét duyệt:
   • Người đăng chọn Yêu cầu xóa → Hệ thống tạo bản ghi yêu cầu ở trạng thái Chờ xét duyệt, sách chuyển sang trạng thái Chờ xóa (tạm ẩn khỏi tìm kiếm công khai nhưng người đã mua vẫn đọc được).
   • Admin xét duyệt: Đồng ý → xóa mềm (soft delete) sách khỏi hệ thống, giữ lại dữ liệu giao dịch liên quan; Từ chối → khôi phục trạng thái Công khai.
   4.2. Quản trị tài khoản
   Chức năng: tìm kiếm, xem danh sách, xem chi tiết, thêm tài khoản (nội bộ, ví dụ tạo thêm tài khoản Admin/Nhân viên hỗ trợ), sửa thông tin, khóa, mở khóa, xóa tài khoản.
   4.2.1. Khóa / mở khóa tài khoản
   • Khóa: trạng thái chuyển Active → Locked; tài khoản không thể đăng nhập; toàn bộ token hiện có bị thu hồi.
   • Sách/truyện do tài khoản này đăng vẫn hiển thị bình thường trừ khi Admin chủ động ẩn kèm theo, để không ảnh hưởng người đọc đã mua nội dung.
   • Mở khóa: trạng thái chuyển Locked → Active, người dùng đăng nhập lại bình thường.
   4.2.2. Xóa tài khoản
   • Áp dụng xóa mềm (soft delete): đánh dấu trạng thái Deleted, ẩn thông tin cá nhân nhưng vẫn giữ lịch sử giao dịch để phục vụ đối soát tài chính và nghĩa vụ thuế.
   • Nếu tài khoản là Người đăng còn sách đang công khai, Admin phải xử lý sách liên quan (ẩn hoặc chuyển quyền sở hữu) trước khi xóa.
   4.3. Quản trị tài chính
   Hệ thống quản lý dòng tiền theo mô hình: Người đọc (mua chương) → Người đăng (nhận doanh thu) → Hệ thống (giữ phí giao dịch). Phí giao dịch mặc định là 5%.
   Ví dụ: người đọc mua 1 chương giá 10.000đ → người đăng nhận 9.500đ (95%) → hệ thống giữ 500đ (5%) phí nền tảng.
   4.3.1. Cấu trúc dữ liệu giao dịch
   Trường Mô tả
   transaction_id Mã giao dịch, khóa chính
   buyer_id Người mua
   seller_id Người bán / người đăng
   book_id / chapter_id Sách/chương hoặc combo liên quan
   amount Số tiền giao dịch
   platform_fee Phí nền tảng (5%)
   seller_amount Số tiền người đăng nhận (95%)
   currency Đơn vị tiền tệ (VNĐ)
   payment_method Phương thức thanh toán (ví nội bộ, VNPay, Momo, ZaloPay...)
   transaction_type Loại: nạp tiền / mua chương / rút tiền / hoàn tiền
   status Trạng thái: Pending / Success / Failed / Refunded
   created_at Thời gian tạo giao dịch
   Lưu ý: Bổ sung so với bản gốc: trường currency, payment_method và trạng thái Refunded — cần thiết khi tích hợp cổng thanh toán thật và xử lý tranh chấp.
   4.4. Xét duyệt yêu cầu rút tiền
   • Admin xem danh sách yêu cầu rút tiền đang chờ xử lý, kiểm tra số dư và thông tin nhận tiền của người đăng.
   • Đồng ý → hệ thống chuyển tiền qua kênh đã chọn (chuyển khoản ngân hàng) và cập nhật trạng thái Đã xử lý.
   • Từ chối → hoàn lại số dư vào ví người đăng, kèm lý do.
   4.5. Thống kê
   4.5.1. Thống kê người dùng
   Theo mốc thời gian: ngày / tháng / quý. Chỉ số: số người đăng ký mới, số người truy cập, số người đọc hoạt động, số người đăng hoạt động.
   4.5.2. Thống kê sách/truyện
   Sách/truyện hot, số lượt đọc, số chương được bán, doanh thu, số người theo dõi.
   4.5.3. Thống kê người đăng
   Xếp hạng người đăng theo: lượt đọc, số lượng sách/truyện, số chương bán, doanh thu, số người theo dõi.
5. Nghiệp vụ dành cho người dùng (Mobile App)
   5.1. Trang chủ
   • Sách/truyện mới: nội dung mới được đăng tải và đã qua kiểm duyệt.
   • Sách/truyện hot: xếp hạng theo lượt đọc, lượt mua, lượt theo dõi.
   • Người đăng nổi bật: xếp hạng theo lượt theo dõi, lượt đọc, số lượng truyện, doanh thu.
   5.2. Trang đề xuất
   Hệ thống đề xuất nội dung dựa trên thể loại người dùng thường đọc (ví dụ: Trinh thám, Tâm lý, Tiểu thuyết) thông qua phân tích lịch sử đọc. Mục Theo dõi gồm hai phần: Tài khoản đang theo dõi và Sách/truyện đang theo dõi.
   5.3. Trang thư viện
   Mục Mô tả
   Lịch sử Sách/truyện đang đọc hoặc đã đọc; lưu Tên truyện, Chương đang đọc, Tiến độ, Thời gian đọc gần nhất.
   Tủ truyện Sách/truyện người dùng đã lưu (bookmark).
   Đã mua Các chương/combo người dùng đã mua, có thể đọc lại bất kỳ lúc nào không giới hạn.
   Lưu ý: Nên bổ sung tính năng đọc offline (tải trước nội dung đã mua) — tính năng phổ biến của app đọc truyện, giúp giữ chân người dùng khi mất kết nối mạng.
   5.4. Trang tin nhắn
   • Tin nhắn hệ thống: thông báo tự động (giao dịch, kiểm duyệt, khuyến mãi).
   • Tin nhắn cá nhân: nhắn tin trực tiếp giữa hai tài khoản, triển khai qua kết nối thời gian thực (WebSocket/Socket.IO) để tin nhắn đến ngay lập tức.
   • Có cơ chế report/chặn người dùng gửi tin nhắn spam hoặc quấy rối.
   5.5. Trang tài khoản
   Gồm: Thông tin cá nhân, Đăng truyện, Quản lý truyện, Bình luận, Nạp tiền, Rút tiền, Lịch sử giao dịch, Thiết bị đăng nhập, Đăng xuất (khi đã đăng nhập) / Đăng nhập, Đăng ký (khi chưa đăng nhập).
   5.6. Nghiệp vụ đăng truyện (Người đăng)
   Người đăng chọn Tài khoản → Đăng truyện → nhập: Tên truyện, Tác giả, Thể loại, Ảnh bìa, Mô tả, Trạng thái. Sau khi tạo truyện, người đăng thêm từng chương; mỗi chương thiết lập: miễn phí, trả phí kèm giá bán, hoặc thuộc một combo.
   • Truyện/chương mới đăng ở trạng thái Chờ duyệt cho đến khi Admin kiểm duyệt (xem mục 4.1.1).
   • Nên cho phép người đăng đặt 1–3 chương đầu ở chế độ đọc thử miễn phí để thu hút người đọc mới, dù các chương sau đó trả phí.
   5.7. Quản lý truyện của người đăng
   • Người đăng chỉ quản lý được những truyện thuộc quyền sở hữu của mình (xác định qua owner_id).
   • Có thể: xem truyện, sửa thông tin, thêm chương, sửa chương, xem lượt đọc, xem lượt bán, xem doanh thu.
   • Riêng xóa truyện phải qua xét duyệt của Admin (mục 4.1.3).
   5.8. Nghiệp vụ đọc & mua chương trả phí
   Các bước xử lý khi người đọc mở một chương trả phí:
   Bước Xử lý
   1 Người đọc chọn chương cần đọc.
   2 Hệ thống kiểm tra chương đã được mua trước đó chưa.
   2.1 Đã mua → cho đọc ngay, không tính phí lại.
   2.2 Chưa mua → chuyển sang bước 3.
   3 Hệ thống kiểm tra số dư ví của người đọc.
   3.1 Đủ tiền → tiến hành thanh toán.
   3.2 Không đủ tiền → hiển thị yêu cầu nạp tiền, dừng luồng.
   4 Trừ tiền trong ví người đọc theo giá chương/combo.
   5 Chia doanh thu: 95% ghi có cho người đăng, 5% ghi nhận là phí nền tảng.
   6 Cấp quyền đọc vĩnh viễn cho người đọc; chương được ghi vào mục Đã mua.
   5.9. Đọc thử / Preview miễn phí
   Đối với chương trả phí, hệ thống có thể hiển thị 1 đoạn preview ngắn (ví dụ vài trăm từ đầu chương) trước khi yêu cầu mua, giúp người đọc quyết định có mua hay không mà không lộ toàn bộ nội dung.
6. Nghiệp vụ tài chính chi tiết
   6.1. Nạp tiền
   Luồng: Người dùng vào Tài khoản → Nạp tiền → chọn số tiền muốn nạp → chọn cổng thanh toán (ví nội bộ liên kết VNPay/Momo/ZaloPay hoặc thẻ) → Thanh toán → Cổng thanh toán gửi webhook xác nhận về Backend → Hệ thống đối chiếu và cộng tiền vào ví.
   • Giao dịch nạp tiền ở trạng thái Pending cho đến khi nhận webhook xác nhận thành công từ cổng thanh toán, tránh cộng tiền sai khi giao dịch chưa hoàn tất.
   • Nếu giao dịch thất bại hoặc quá thời gian chờ (timeout), hệ thống tự động đánh dấu Failed và thông báo cho người dùng.
   • Hệ thống ghi nhận lịch sử nạp tiền, có thể tra cứu lại theo thời gian.
   6.2. Mua chương/combo
   Chi tiết luồng xử lý đã mô tả tại mục 5.8. Toàn bộ giao dịch mua đều là giao dịch nội bộ trừ trực tiếp từ ví, không qua cổng thanh toán ngoài, nên xử lý tức thời.
   6.3. Rút tiền
   Luồng: Người đăng → chọn Rút tiền → nhập số tiền → hệ thống kiểm tra số dư khả dụng → tạo yêu cầu rút tiền (trạng thái Chờ duyệt) → Admin xét duyệt (mục 4.4) → nếu đồng ý, trừ số dư và chuyển tiền.
   • Quy định số tiền rút tối thiểu (ví dụ 100.000đ) để giảm chi phí xử lý giao dịch ngân hàng.
   • Với các khoản rút lớn hoặc rút lần đầu, yêu cầu xác minh danh tính (KYC) — ví dụ ảnh CCCD/CMND — để tuân thủ quy định phòng chống rửa tiền.
   • Thời gian xử lý rút tiền cần công bố rõ (ví dụ 1–3 ngày làm việc).
   6.4. Hoàn tiền / xử lý tranh chấp
   Bổ sung so với bản mô tả gốc — bản gốc chưa có cơ chế hoàn tiền:
   • Người đọc có thể gửi yêu cầu khiếu nại nếu chương mua bị lỗi hiển thị, trùng nội dung, hoặc bị gỡ do vi phạm sau khi đã mua.
   • Admin xem xét và có thể hoàn tiền vào ví người đọc (trạng thái giao dịch chuyển Refunded); khoản đã chia cho người đăng trước đó có thể bị thu hồi tương ứng.
7. Nghiệp vụ kiểm duyệt nội dung
   Đây là nhóm nghiệp vụ được bổ sung hoàn toàn mới nhằm khắc phục lỗ hổng lớn nhất của bản mô tả gốc: hệ thống cho phép người dùng tự do đăng nội dung UGC (User Generated Content) nhưng chưa có quy trình kiểm soát chất lượng và tính hợp pháp của nội dung.
   7.1. Vòng đời trạng thái nội dung
   Xem bảng trạng thái tại mục 4.1.1. Mọi nội dung mới đăng hoặc chỉnh sửa quan trọng (đổi nội dung chương, đổi giá) đều quay lại trạng thái Chờ duyệt trước khi hiển thị công khai.
   7.2. Report vi phạm
   • Người đọc có thể report một sách/truyện hoặc bình luận với lý do: vi phạm bản quyền, nội dung nhạy cảm/18+ không gắn nhãn, spam, ngôn từ kích động.
   • Report được đưa vào hàng chờ xử lý của Admin; nếu một nội dung nhận đủ số lượng report trong thời gian ngắn, hệ thống tự động tạm ẩn (Hidden) để chờ Admin xác minh.
   7.3. Lịch sử chỉnh sửa chương
   Mỗi lần người đăng chỉnh sửa nội dung một chương đã công khai và đã có người mua, hệ thống lưu lại phiên bản trước đó (versioning). Điều này phục vụ việc đối chiếu khi có khiếu nại từ người đọc đã mua chương trước khi bị chỉnh sửa.
8. Thông báo & tin nhắn
   Hệ thống gửi 4 nhóm thông báo tới cả Người đọc và Người đăng:
   • Thông báo tài khoản (khóa/mở khóa, đổi mật khẩu...)
   • Thông báo giao dịch (nạp tiền, mua chương, rút tiền thành công/thất bại)
   • Thông báo xét duyệt (duyệt/từ chối nội dung, duyệt/từ chối rút tiền)
   • Thông báo hệ thống (bảo trì, khuyến mãi, cập nhật chính sách)
   Thông báo được đẩy tới Mobile App theo thời gian thực qua dịch vụ push notification (Firebase Cloud Messaging cho Android/iOS), đồng thời lưu lại trong mục Tin nhắn hệ thống để tra cứu.
9. Mô hình dữ liệu tổng quát
   Danh sách các thực thể chính trong hệ thống (không bao gồm toàn bộ thuộc tính chi tiết):
   Thực thể Mô tả / thuộc tính chính
   Account id, username, email/sđt, password_hash, avatar, role, status, wallet_balance, created_at
   Book book_id, title, author, category, cover, description, owner_id, status
   Chapter chapter_id, book_id, title, content, price, is_free, status, version_history
   Transaction transaction_id, buyer_id, seller_id, book_id, chapter_id, amount, platform_fee, seller_amount, currency, payment_method, transaction_type, status, created_at
   Wallet / TopUp id, account_id, amount, payment_method, status, created_at
   WithdrawRequest id, account_id, amount, bank_info, status, reviewed_by, created_at
   Follow id, follower_id, target_type (account/book), target_id
   ReadingHistory id, account_id, book_id, chapter_id, progress, last_read_at
   Comment id, account_id, book_id/chapter_id, content, status, created_at
   Message id, sender_id, receiver_id, content, created_at, is_read
   Notification id, account_id, type, content, is_read, created_at
   Report id, reporter_id, target_type, target_id, reason, status
10. Yêu cầu phi chức năng
    10.1. Bảo mật
    • Mã hóa mật khẩu bằng bcrypt/argon2; không lưu thông tin nhạy cảm dạng plain text.
    • Xác thực API bằng JWT, áp dụng HTTPS cho toàn bộ giao tiếp client–server.
    • Chống các lỗ hổng phổ biến: SQL Injection, XSS, CSRF; validate dữ liệu đầu vào ở cả client và server.
    • Rate limiting cho các API nhạy cảm (đăng nhập, nạp/rút tiền, đăng ký) để chống spam và brute-force.
    10.2. Hiệu năng & khả năng mở rộng
    • Sử dụng cơ chế cache (Redis) cho các danh sách hay truy cập: sách hot, trang chủ, đề xuất.
    • Tích hợp search engine (Elasticsearch hoặc tương đương) để tìm kiếm sách/truyện theo tên, tác giả, thể loại với tốc độ cao.
    • Thiết kế API và cơ sở dữ liệu có khả năng mở rộng theo chiều ngang (horizontal scaling) khi lượng người dùng tăng.
    10.3. Lưu trữ & hạ tầng
    • Ảnh bìa và nội dung chương lưu trên dịch vụ lưu trữ đám mây (ví dụ Amazon S3/Cloudinary), phân phối qua CDN để tải nhanh trên Mobile App.
    • Sao lưu (backup) cơ sở dữ liệu định kỳ, đặc biệt với dữ liệu giao dịch tài chính.
    10.4. Giám sát & vận hành
    • Ghi log tập trung cho các thao tác quan trọng: giao dịch tài chính, duyệt/từ chối nội dung, khóa/mở khóa tài khoản — phục vụ truy vết khi có sự cố hoặc tranh chấp.
    • Giám sát lỗi hệ thống theo thời gian thực (ví dụ Sentry) để phát hiện và xử lý sự cố kịp thời.

— Hết tài liệu —
