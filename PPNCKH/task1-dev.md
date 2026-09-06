**Đề thực tập Intern Tuần 1**

# QUY TẮC SUPPORT: Kẹt chỗ nào thì nhắn, nhưng trước khi nhắn cần chuẩn bị:

(1) Bạn đang muốn làm gì?

(2) Đã thử search/fix theo cách nào rồi?

(3) Chụp màn hình log lỗi cụ thể.

---

### **FE web-app — Nghiên cứu và Tùy chỉnh Giao diện**

### **Yêu cầu môi trường:**

- Môi trường làm việc: Instance ERPNext đang chạy trên localhost:8000.
- Phiên bản: Frappe + ERPNext **version-16**

**Mục tiêu:**

### Thực hiện thành công hai tùy chỉnh giao diện trên một DocType bất kỳ để thể hiện khả năng nghiên cứu và sử dụng các công cụ tùy chỉnh (Customization Tools) của Frappe.

### Hai tùy chỉnh cần thực hiện:

1. **Thêm một trường tùy chỉnh**: Tạo một trường dữ liệu mới (ví dụ: kiểu Select hoặc Small Text) và hiển thị nó trên Form View của DocType đã chọn.
2. **Tối ưu hóa bố cục**: Ẩn đi hoặc sắp xếp lại vị trí của một trường dữ liệu hiện có trên Form View (có thể sử dụng giao diện Customize Form hoặc Client Script).

### **Nộp lại:**

- Screenshot giao diện Form View của DocType đã được tùy chỉnh thành công trên localhost:8000.
- Tài liệu hóa chi tiết các bước đã thực hiện và các lỗi gặp phải cùng với cách đã fix.

next step: tạo 1 cái ui đăng nhập cho erp trên mobile. vì web frappe đã handle

### —-------------------------------------------------------------

### **BE-FE — Deploy ERPNext tại local**

*tài liệu nghiên cứu trước khi bắt đầu sudo hay install nào.*

**Môi trường staging để tham khảo (read-only):**

|  |  |
| --- | --- |
| URL | http://103.186.101.215:8000/ |
| Email | mantisdev@gmail.com |
| Password | Mantisdev#$34 |

BẢO MẬT: Staging là môi trường nội bộ. Tuyệt đối không share tài liệu cho cá nhân hay tổ chức nào không thuộc team dev. Trong trường hợp vi phạm, bạn phải chịu hình phạt theo hợp đồng.

---

**Bắt đầu setup**

**Yêu cầu môi trường:**

- OS tuỳ ý, nếu dùng Windows thì cần WSL2 hoặc có thể tải linux.
- python và nodejs chú ý version và bench yêu cầu. Recommend: py3.14 & nodejs 24

**Mục tiêu:**

Hiểu cơ bản cách Frappe framework hoạt động — để làm nền cho task customization tiếp theo (thêm Custom Field, chỉnh Form View)

**Output:**

- Login được ERPNext tại localhost:8000
- Tạo được tài khoản admin

**Nộp lại:**

- **Screenshot dashboard** sau khi login thành công hoặc có thể **present task** mình đã làm vào buổi offline thứ 4
- Ghi lại các lỗi gặp phải và cách đã fix. Nếu không biết cách fix bug đó, có thể hỏi anh Tri, anh Đăng hoặc Đức hoặc bất kì anh em nào trong team.
    
    Next step: tạo api check health
    

—----------------------------------------------------------------------------

**Tài liệu tham khảo:** https://docs.frappe.io/framework/user/en/installation

**Frappe Docs**: https://docs.frappe.io/framework

**ERPNext Docs**: https://docs.frappe.io/erpnext