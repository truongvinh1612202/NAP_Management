# BÀI TEST FRESHER BUSINESS ANALYST — BIZITRIP
## Quản lý & Mapping dữ liệu thô TA Hotel

**Ứng viên:** Trương Trung Vĩnh  
**Vị trí:** Fresher Business Analyst 

---

Việc đầu tiên tôi làm là mở hai file mẫu ra xem thật kỹ, thay vì đọc lướt đề rồi trả lời theo lý thuyết. File Excel chỉ có 5 dòng, file rate plan của Emerald Bay chỉ 2 trang, vậy mà ngồi soi một lúc tôi đếm được gần 20 lỗi khác nhau. Nhiều lỗi trong đó khá tinh vi, nhìn qua tưởng bình thường.

Nên toàn bộ ví dụ trong bài này tôi lấy từ chính hai file đó.

---

## Câu 1. Khó khăn và rủi ro chính khi xử lý dữ liệu TA Hotel

**1. Không biết đâu là một khách sạn.** Trong file Excel có `PARIS DELI HOTEL` và `PARIS DELI RESORT`, hai cái tên gần giống nhau, cùng nằm trên đường Võ Nguyên Giáp. Nếu chuẩn hoá tên mạnh tay, bỏ luôn hậu tố Hotel/Resort, thì hai property bị gộp làm một. Còn nếu để nguyên thì có khả năng một khách sạn bị tách thành hai bản ghi trùng. Cả hai hướng đều dẫn tới cùng một hậu quả: khách đặt phòng ở nơi này nhưng đến check-in ở nơi khác.

**2. Cùng một tên, hai địa chỉ.** `PARIS DELI RESORT` xuất hiện hai dòng. Dòng đầu ghi "Võ Nguyên Giáp, Đà Nẵng", dòng sau ghi "Võ Nguyên Giáp, Sơn Trà, Đà Nẵng". Đây là một khách sạn ghi thiếu quận, hay là hai cơ sở khác nhau của cùng chuỗi? Tôi nghĩ không thể tự động kết luận được, vì thông tin để phân biệt vốn không có trong file.

**3. Địa chỉ không đủ để định vị.** Cả 5 dòng đều không có số nhà, không có toạ độ. Có một cái bẫy nữa mà tôi để ý được khi so hai file: đường Võ Nguyên Giáp chạy qua cả Sơn Trà lẫn Ngũ Hành Sơn. File PDF ghi Ngũ Hành Sơn, file Excel ghi Sơn Trà. Nếu hệ thống so khớp theo kiểu "tên đường + quận" thì rất dễ ra kết quả sai mà nhìn vẫn hợp lý.

**4. Thủng lịch giá.** CHICLAND và PARIS DELI RESORT chỉ có giá đến 31/05/2025. Từ tháng 6 trở đi không có giá nào. Hoặc là khách sạn biến mất khỏi kết quả tìm kiếm suốt nửa cuối năm, hoặc tệ hơn, hệ thống tự kéo dài giá cũ và bán giá tháng 5 cho mùa cao điểm cuối năm. Loại lỗi này lỗ tiền thật nhưng không phát ra tín hiệu gì.

**5. Chính sách huỷ viết tự do nên không tính được tiền.** Một dòng ghi "huỷ miễn phí trước 7 ngày, sau đó phạt 50–100%". Vậy hệ thống lấy 50 hay 100? Bốn khách sạn trong file có bốn mốc khác nhau: 72 giờ, 3 ngày, 5 ngày, 7 ngày. Cách diễn đạt cũng lệch nhau, "trước 7 ngày" với "trong vòng 7 ngày" gần như ngược nghĩa. Đến lúc khách khiếu nại đòi hoàn tiền thì công ty là bên phải giải thích.

**6. Phụ thu Lễ Tết vừa mâu thuẫn vừa không thực thi được.** Excel có dòng ghi "Lễ Tết phụ thu 200.000", dòng khác lại ghi "giá không áp dụng Lễ Tết", mà tôi không rõ ý thứ hai là chặn bán hay là thoả thuận giá riêng sau. File PDF thì rõ hơn, phụ thu 300.000/phòng/đêm cho Tết và ngày lễ. Nhưng bảng "Holidays List" ngay bên dưới lại không có ngày Tết nào cả. Điều khoản thì có, dữ liệu để áp dụng thì không, và nó rơi trúng giai đoạn doanh thu cao nhất năm.

**7. Hợp đồng dùng lại template của thương hiệu khác.** File rate plan đề tên Emerald Bay Hotel Da Nang, nhưng toàn bộ hạng phòng lại là Wink Lite, Wink Luxe, Wink Live. Gần như chắc chắn được copy từ template của chuỗi Wink. Chính sách trẻ em trong đó còn áp cho "Signature Wink Family Room", một hạng phòng không hề có trong bảng giá 5 loại phòng phía trên. Chỗ này nguy hiểm ở chỗ nếu hệ thống dùng tên hạng phòng làm một tín hiệu để mapping, nó sẽ map rate của Emerald Bay sang property của Wink, và map với độ tự tin rất cao.

**8. Thiếu mã, cùng đủ loại lỗi format.** Không có mã khách sạn, không có mã phòng, không có sức chứa tối đa, cột Extra Bed không ghi đơn vị tiền. `Superior King/TWN` nhét hai cấu hình giường vào một dòng với một mức giá duy nhất. `"Deluxe "` thừa một dấu cách ở cuối. Ô rỗng thì chỗ điền dấu `–`, chỗ để trống hẳn. Cột giai đoạn `01/01–31/12/2025` là một chuỗi text, dùng dấu en-dash chứ không phải gạch ngang thường, và không tách ngày bắt đầu với ngày kết thúc.

Nếu phải chọn ra nhóm đáng lo nhất, tôi không chọn nhóm lỗi làm hệ thống báo lỗi. Những lỗi đó dễ thấy nên sớm muộn cũng được sửa. Đáng sợ hơn là nhóm khiến hệ thống chạy trơn tru với dữ liệu sai: thủng lịch giá, map nhầm khách sạn, nhầm giá net thành giá gross. Chúng chỉ lộ ra khi khách đã trả tiền xong.

---

## Câu 2. Quy trình xử lý dữ liệu TA

### Luồng đề xuất

```
(1) THU NHẬN          Sales upload file lên portal, gắn kèm: khách sạn, người gửi,
                      ngày ký, ngày hiệu lực, version. Không nhận qua email.
        ↓
(2) PHÂN LOẠI         Excel (bán cấu trúc) → luồng parse
                      PDF/Word (phi cấu trúc) → luồng trích xuất, bắt buộc có người xác nhận
        ↓
(3) VALIDATE          Rule chặn: thiếu tên, thiếu giá, giá ≤ 0, ngày không parse được.
                      Rule cảnh báo: thiếu quận, thủng lịch giá, mức phạt huỷ ghi dạng khoảng.
                      Fail → tự động email trả lại khách sạn kèm đúng dòng lỗi và file mẫu chuẩn.
        ↓
(4) LÀM SẠCH          Trim khoảng trắng, chuẩn hoa/thường, tách 01/01–31/12/2025 thành
                      valid_from và valid_to, ép kiểu số, quy các dạng rỗng về NULL,
                      tách Superior King/TWN thành hai dòng.
        ↓
(5) ENRICH            Geocode địa chỉ ra toạ độ, chuẩn hoá đơn vị hành chính.
        ↓
(6) MAPPING           Khớp khách sạn trước, hạng phòng sau. Mỗi kết quả kèm confidence score.
        ↓
(7) PHÂN LUỒNG        ≥ 0.95 → auto-map, có ghi log
                      0.70–0.95 → hàng đợi QC
                      < 0.70 → unmatched, đề xuất tạo khách sạn mới
        ↓
(8) QC DUYỆT          Đủ trường bắt buộc → giá hợp lý và lịch giá không thủng →
                      chính sách thực thi được → đối chiếu lại với file gốc
                      Reject → quay về bước (4) hoặc (6) kèm lý do, hoặc hỏi lại khách sạn.
        ↓
(9) PUBLISH           Ghi vào Master Content, bật cờ bán được, lưu audit trail.
        ↓
(10) GIÁM SÁT         Cảnh báo rate sắp hết hạn, phát hiện gap lịch giá,
                      cảnh báo giá lệch bất thường so với kỳ trước.
```

Bước 10 tôi thêm vào vì thấy dữ liệu TA không phải nạp một lần là xong. Khách sạn còn gửi bảng giá mới, còn đổi chính sách. Một bảng giá hết hạn mà không ai để ý thì cũng là lỗi, chỉ là lỗi im lặng.

### Bước rủi ro cao nhất

Tôi chọn bước mapping, cụ thể là mapping ở cấp khách sạn.

Lý do đầu tiên là sai ở đây không kêu. Parse sai định dạng ngày thì hệ thống văng lỗi, ai cũng biết. Nhưng nếu rate của Paris Deli Resort bị gán sang Paris Deli Hotel thì mọi thứ vẫn chạy bình thường, vẫn có tên, có địa chỉ, có giá, hiển thị đẹp, bán được. Không có dấu hiệu nào để phát hiện, cho tới khi khách đã thanh toán và đến sai chỗ.

Lý do thứ hai là phạm vi ảnh hưởng. Một lỗi ở bước làm sạch chỉ hỏng một ô. Một lỗi mapping cấp khách sạn kéo theo toàn bộ rate, hạng phòng, chính sách của khách sạn đó, cộng với mọi booking phát sinh sau.

Còn lý do thứ ba, tôi nghĩ đây là bước duy nhất phải suy đoán. Các bước khác đều xác định, chuỗi `"1750000"` chuyển thành số `1750000` thì luôn đúng. Mapping thì phải phán đoán trên dữ liệu vốn đã thiếu: không số nhà, không toạ độ, không mã, tên viết mỗi nơi một kiểu. Quay lại trường hợp Paris Deli Resort có hai địa chỉ, tôi cho rằng không thuật toán nào giải được, kể cả AI, đơn giản vì thông tin cần thiết không tồn tại trong dữ liệu.

Vài cách tôi nghĩ có thể giảm rủi ro cho bước này: không auto-map chỉ dựa vào tên; chặn cứng theo địa lý, khác thành phố hoặc cách nhau trên 2km thì không cho map dù tên giống hệt; không lấy tên hạng phòng làm tín hiệu khớp cấp khách sạn, đây đúng là bài học rút ra từ file Emerald Bay; bắt buộc QC đối chiếu file gốc với mọi bản ghi từ PDF; và ghi log mọi quyết định để còn truy ngược lại được.

Bước rủi ro cao thứ hai theo tôi là trích xuất PDF, vì đó là nơi sinh ra dữ liệu trông rất hợp lý nhưng sai. Riêng nguồn PDF thì tôi nghĩ không nên cho auto-publish trong mọi trường hợp.

---

## Câu 3. Logic mapping

### Tiêu chí so khớp

Tôi thiết kế theo ba tầng, đi từ chắc chắn đến xác suất.

**Tầng đầu là các định danh cứng.** Khớp được cái nào trong số này thì match luôn, khỏi cần tính điểm: mã khách sạn do công ty tự cấp, mã số thuế, mã supplier bên ngoài như GIATA, domain website, số điện thoại đã chuẩn hoá.

Đáng nói là dữ liệu mẫu hiện tại không có lấy một khoá nào trong số đó. Tôi nghĩ đây mới là gốc rễ của vấn đề. Nên nếu được đề xuất một thứ duy nhất và rẻ nhất, tôi sẽ chọn việc bắt buộc thu thập mã số thuế, số điện thoại và website ngay trong template TA mới.

**Tầng hai là chặn theo địa lý.** Chỉ đem hai bản ghi ra so khi cùng tỉnh thành, và nếu cả hai đều có toạ độ thì phải cách nhau dưới 2km. Bước này loại thẳng những cặp trùng tên khác thành phố, đồng thời giảm rất nhiều phép so sánh khi số lượng khách sạn tăng lên.

**Tầng ba mới là chấm điểm.**

| Tiêu chí | Trọng số | Ghi chú |
|---|---|---|
| Toạ độ | 30 | ≤50m tính 1.0, ≤150m tính 0.9, ≤500m tính 0.6, trên 2km thì loại. Khách quan nhất trong các tiêu chí |
| Tên đã chuẩn hoá | 25 | Bỏ dấu, lowercase, bỏ stopword rồi so khớp mờ. Là tín hiệu chính nhưng không nên cho áp đảo vì dễ sai |
| Địa chỉ | 20 | Trong đó số nhà chiếm 40% điểm của tiêu chí này. Số nhà phân biệt rất mạnh mà hay bị bỏ qua |
| Điện thoại / website / email | 15 | Gần như khoá cứng. Nếu một bên không có dữ liệu thì bỏ qua, không trừ điểm |
| Hạng sao | 5 | Chỉ dùng để loại trừ chứ không dùng để khẳng định |
| Danh mục hạng phòng | 5 | Chỉ cộng điểm phụ, không bao giờ dùng làm căn cứ quyết định. File Emerald Bay cho thấy tên phòng có thể bị nhiễm bởi template sai |

Điểm được chuẩn hoá theo những tiêu chí thực sự có dữ liệu ở cả hai phía, để bản ghi thiếu thông tin không bị phạt oan. Nhưng làm vậy lại sinh ra một vấn đề khác: nếu chỉ có 2 trên 6 tiêu chí có dữ liệu thì điểm 0.95 chẳng nói lên điều gì. Nên tôi nhân thêm một hệ số độ phủ, `0.6 + 0.4 × (số tiêu chí có dữ liệu / 6)`.

Thử áp vào dòng `PARIS DELI RESORT, "Võ Nguyên Giáp, Đà Nẵng"`. Dòng này chỉ có tên và tên đường, thiếu số nhà, toạ độ, điện thoại, hạng sao. Dù tên khớp 100% thì điểm cuối cùng cũng chỉ còn khoảng 0.73, tức là rơi vào hàng đợi QC chứ không được tự động khớp. Đúng như tôi muốn.

### Ngưỡng quyết định

Từ 0.95 trở lên **và** phải khớp thêm ít nhất một định danh cứng, hoặc toạ độ dưới 150m, thì mới cho auto-map. Điều kiện kép này là cố ý, để không bao giờ có chuyện hệ thống tự khớp chỉ vì hai cái tên giống nhau.

Khoảng 0.70 đến 0.95 thì đẩy vào hàng đợi QC, hiển thị 3 ứng viên hàng đầu kèm bảng so sánh từng tiêu chí, để người duyệt nhìn được máy đang dựa vào đâu chứ không phải chỉ thấy một con số.

Dưới 0.70 thì coi là chưa khớp, đề xuất tạo khách sạn mới và để Content team thẩm định.

Có một trường hợp đặc biệt tôi muốn tách riêng: nếu hai ứng viên chênh nhau dưới 0.05 thì chặn auto-map, kể cả khi điểm rất cao. Đây là rào chắn tôi thấy quan trọng nhất, và nó sinh ra chính từ tình huống Paris Deli.

Với hạng phòng thì tôi không so nguyên chuỗi mà tách ra thành thuộc tính: hạng cơ bản (Standard, Superior, Deluxe, Premier, Suite), view (Sea, River, City), tính năng (Balcony, Terrace), kiểu giường, sức chứa. `Seafront Premier` tách thành hạng Premier với view biển. `Superior King/TWN` tách hẳn thành hai bản ghi cùng giá, có gắn cờ để QC biết mà kiểm lại. `Deluxe` và `Deluxe Balcony` là hai loại khác nhau, tuyệt đối không gộp. Hạng phòng lạ thì không tự tạo mà đưa vào hàng đợi, và mỗi lần QC sửa thì ghi lại vào bảng alias để lần sau máy tự làm được.

### Xử lý trường hợp trùng tên khác địa chỉ

Đây chính là tình huống Paris Deli Resort. Tôi sẽ đi theo thứ tự sau.

Đầu tiên là kiểm định danh cứng. Nếu hai dòng cùng mã số thuế hoặc cùng số điện thoại thì gần như chắc chắn là một khách sạn, dòng kia chỉ ghi thiếu, hợp nhất lại và lấy địa chỉ chi tiết hơn làm chuẩn.

Nếu không có định danh cứng thì nhìn vào quan hệ giữa hai địa chỉ. "Võ Nguyên Giáp, Đà Nẵng" là tập cha của "Võ Nguyên Giáp, Sơn Trà, Đà Nẵng", nó kém chi tiết hơn chứ không hề mâu thuẫn. Chỗ này tôi muốn nhấn mạnh một chút, vì tôi nghĩ nhiều hệ thống làm sai ở đây: *thiếu thông tin* và *xung đột thông tin* là hai chuyện khác nhau và phải xử lý khác nhau. Thiếu thì có thể bổ sung rồi gộp. Xung đột thì bắt buộc phải có người phán quyết. Gộp chung hai loại vào một luồng là lúc bắt đầu gộp nhầm hoặc tách nhầm.

Bước tiếp theo là nhìn vào chính nội dung dữ liệu, và đây là chỗ tôi thấy thú vị nhất khi đọc file. Dòng 4 là `Deluxe`, giá 1.680.000, áp dụng cả năm, huỷ miễn phí trước 3 ngày. Dòng 5 là `Deluxe Balcony`, giá 1.880.000, chỉ đến 31/05, huỷ miễn phí trước 7 ngày. Nếu đúng là cùng một khách sạn thì việc hai hạng phòng có hai chính sách huỷ khác nhau là khá bất thường. Tín hiệu đó đủ để tôi thấy cần người xác minh chứ không nên để máy tự quyết.

Cuối cùng là đưa vào hàng đợi review, đưa cho người duyệt ba lựa chọn rõ ràng: cùng một khách sạn thì gộp; hai khách sạn khác nhau thì tách và nhờ Sales xin lại địa chỉ đầy đủ; còn nếu chưa đủ căn cứ thì hệ thống soạn sẵn email hỏi khách sạn đúng câu cần hỏi. Trong lúc chờ thì không publish cả hai. Thà chưa bán còn hơn bán sai khách sạn.

Một chi tiết nhỏ nhưng tôi nghĩ nên nói: các từ Hotel, Resort, Villa, Apartment phải được giữ lại như token phân biệt loại hình, không được bỏ như stopword. Hai bản ghi khác nhau ở token này thì trừ điểm và cấm auto-map, vì đó thường là hai sản phẩm có thật của cùng một chủ.

### Xử lý khách sạn thiếu thông tin

Tôi không xử lý mọi trường thiếu như nhau, mà chia theo hậu quả.

Thiếu những thứ không có thì không bán được, như giá, tên, khoảng thời gian áp dụng, chính sách huỷ, thì chặn publish luôn và tự động email cho khách sạn kèm đúng ô còn trống.

Thiếu những thứ hệ thống tự bổ sung được, như toạ độ hay quận huyện, thì enrich tự động rồi đánh dấu đây là dữ liệu suy ra chứ không phải khách sạn cung cấp.

Thiếu những thứ suy luận được từ dòng khác, ví dụ dòng 4 thiếu "Sơn Trà" trong khi hai dòng cùng đường đều có, thì điền giá trị đề xuất nhưng bắt QC tick xác nhận trước khi publish.

Thiếu trường tuỳ chọn như Extra Bed thì để trống và ẩn luôn mục đó trên giao diện. Chỗ này nghe nhỏ nhưng tôi nghĩ khá quan trọng: hiển thị "0đ" không phải là để trống, mà là cam kết miễn phí với khách.

Riêng thủng lịch giá thì tuyệt đối không ngoại suy. Chỉ bán trong đúng khoảng có giá, phần còn lại để trạng thái chưa mở bán, đồng thời tạo task nhắc Sales đi xin bảng giá nửa cuối năm trước khi hết hạn.

Tóm lại có ba việc tôi cho là không được làm trong mọi trường hợp: bịa dữ liệu cho đủ trường, ngoại suy giá sang giai đoạn không có trong hợp đồng, và để mặc định 0 cho các khoản phụ phí.

---

## Câu 4. Ba phương án triển khai

**Thủ công 100%** thì chạy được ngay, không cần Dev, và con người xử lý được mọi format lạ. Thậm chí bắt được cả những lỗi vô lý mà máy chịu, kiểu chính sách trẻ em trỏ vào một hạng phòng không tồn tại. Nhưng nó không scale, muốn gấp đôi sản lượng thì phải gấp đôi người. Chất lượng phụ thuộc từng người, thậm chí phụ thuộc cả buổi sáng hay buổi chiều. Rủi ro tôi lo nhất là gõ nhầm khi mệt: nhập `1750000` thành `175000` thì không có cảnh báo nào cả. Ngoài ra cách làm này không sinh ra dữ liệu vận hành, nên đến khi sếp hỏi "tại sao 60% khách sạn chưa lên sàn" thì không ai trả lời được. Đúng bằng tình huống của câu 6.

**Bán tự động** là máy import, validate, chuẩn hoá và gợi ý mapping kèm điểm tin cậy, còn người thì duyệt qua giao diện QC, nhóm nào chắc chắn đúng thì cho tự duyệt. Máy làm phần lặp đi lặp lại, vốn là phần nó làm tốt hơn người, còn người giữ quyền quyết định ở chỗ cần phán đoán. Điểm tôi thích nhất ở phương án này là nó sinh ra dữ liệu để cải tiến: tỉ lệ auto-map bao nhiêu, lỗi nào hay gặp, QC tốn thời gian ở đâu. Đổi lại phải đầu tư khoảng 4 đến 6 tuần và vẫn phải nuôi đội QC. Có một rủi ro cần đề phòng là người duyệt tin máy quá rồi bấm Approve theo quán tính, cái này khắc phục được bằng cách luôn hiển thị file gốc bên cạnh, cấm duyệt hàng loạt với nhóm điểm thấp, và audit ngẫu nhiên 5%.

**Tự động hoàn toàn** thì nhanh nhất, chi phí biên gần bằng 0, xử lý được cả PDF bằng LLM. Nhưng ở thời điểm này tôi thấy nhược điểm lấn át. Chưa có bản ghi nào được xác nhận là đúng để làm dữ liệu huấn luyện. Không có cơ chế nào bắt được trường hợp máy sai một cách tự tin, mà đó lại là kiểu sai hay gặp nhất. Nếu AI đọc nhầm chính sách huỷ trong hợp đồng thì công ty vẫn là bên chịu trách nhiệm với khách. Một rule sai có thể làm hỏng hàng trăm khách sạn trước khi ai kịp nhận ra. Và nó cũng không giải quyết được vấn đề gốc: gặp Paris Deli thì AI cũng chịu, vì thông tin không có ở đó.

### Nên chọn hướng nào

Giai đoạn đầu tôi chọn bán tự động, rồi nâng dần mức tự động hoá lên.

Lý do lớn nhất là chất lượng nguồn hiện chưa đủ để tự động hoá. Gần 20 lỗi trong 5 dòng dữ liệu, mà trong đó có những lỗi không thuật toán nào giải được vì thiếu thông tin gốc. Tự động hoá một đầu vào như vậy chỉ khiến đầu ra sai nhanh hơn thôi.

Lý do thứ hai là chưa có chuẩn đúng để đối chiếu. Muốn tự động hoá thì phải biết thế nào là đúng, mà hiện chưa có tập dữ liệu nào được xác nhận. Bán tự động chính là cách tạo ra tập đó, mỗi lần QC duyệt là một nhãn. Vài tháng sau có đủ nhãn thì mới có cơ sở để nâng cấp.

Lý do thứ ba là hồ sơ rủi ro rất lệch. Để một bản ghi nằm chờ QC mười phút thì gần như không tốn gì. Để một khách đến sai khách sạn, hoặc bán giá tháng 5 cho dịp Tết, thì tốn hơn nhiều lần. Trong bối cảnh đó, giữ con người ở vòng ra quyết định là lựa chọn rẻ chứ không phải đắt.

Lộ trình tôi hình dung đại khái thế này. Hai tháng đầu chuẩn hoá template và dựng bộ rule, mapping vẫn thủ công nhưng có gợi ý. Tháng 3 đến tháng 6 bật auto-map ở ngưỡng cao rồi đo tỉ lệ. Nửa cuối năm đưa LLM vào trích xuất PDF nhưng vẫn có người xác nhận, QC chuyển dần sang kiểm mẫu thay vì kiểm hết. Sang năm sau mới tính chuyện tự động toàn phần, con người chỉ còn xử lý ngoại lệ.

Có một việc tôi nghĩ nên làm ngay từ ngày đầu, bất kể chọn phương án nào: ban hành template Excel chuẩn có sẵn validation và yêu cầu Sales dùng khi làm việc với khách sạn. Nó rẻ, nhanh, và quan trọng là chặn lỗi tại gốc thay vì đi dọn hậu quả. Nói hơi thẳng thì một ô "mã số thuế" bắt buộc trong template có khi còn giá trị hơn cả một mô hình AI matching.

---

## Câu 5. Mục tiêu, lợi ích và người dùng

### Mục tiêu lớn nhất

Theo tôi hiểu, dự án hướng tới việc biến dữ liệu TA đang rời rạc và không đáng tin thành nguồn cung chuẩn hoá, chính xác, bán được, và làm được điều đó ở quy mô lớn.

Trước mắt là rút ngắn thời gian từ lúc ký hợp đồng đến lúc lên sàn. Hiện Sales ký xong thì dữ liệu nằm chờ trong email cả tuần, mà mỗi ngày chậm là một ngày mất doanh thu từ khách sạn đó. Trung hạn thì là đảm bảo những gì hiển thị ra cho khách đều đúng với hợp đồng đã ký.

Nhưng ý nghĩa dài hạn mới là điều tôi thấy quan trọng nhất. Lý do công ty ký trực tiếp với khách sạn là để có giá tốt hơn so với lấy qua trung gian. Lợi thế đó chỉ thành hiện thực nếu dữ liệu lên sàn nhanh và đúng. Ký được 200 khách sạn mà chỉ 40% bán được thì lợi thế coi như bằng không. Nói cách khác, TA Data Mapping đang là nút thắt cổ chai của cả chiến lược nguồn cung.

### Lợi ích

Với khách đặt phòng thì có nhiều lựa chọn hơn, giá tốt hơn nhờ hợp đồng trực tiếp. Nhưng cái tôi nghĩ đáng giá nhất là sự tin cậy: giá hiển thị đúng bằng giá phải trả, không bị phụ thu bất ngờ lúc check-in, chính sách huỷ rõ ràng.

Với doanh nghiệp thì tăng doanh thu do nhiều nguồn cung bán được hơn, giảm giờ công nhập liệu và QC, giảm thất thoát do bán dưới giá hợp đồng, giảm rủi ro pháp lý nhờ chính sách được cấu trúc hoá và có audit trail, và mở rộng thị trường mới mà không phải tăng nhân sự tương ứng.

Còn một lợi ích ít được nhắc tới: khách sạn thấy sản phẩm của mình lên sàn nhanh và đúng thông tin thì sẽ tin tưởng hơn, và kỳ đàm phán sau dễ xin giá tốt hơn.

### Người dùng chính

**Sales và Contracting** là người nạp dữ liệu vào hệ thống. Họ ký xong nhưng không biết bao giờ khách sạn lên sàn, đối tác hỏi thì không trả lời được. Bị trả file về nhiều lần vì thiếu trường, mỗi lần lại phải liên hệ khách sạn xin bổ sung, khá mất mặt. Cái họ cần là template chuẩn để đưa khách sạn điền ngay từ đầu, validate ngay lúc upload, và một thanh trạng thái để biết file đang ở đâu.

**Data Ops** là người làm sạch và mapping. Mỗi khách sạn một format nên gần như phải học lại từ đầu với từng file. Gặp trường hợp như Paris Deli thì không biết hỏi ai, đành tự đoán rồi làm. Họ cần import tự động, gợi ý mapping có xếp hạng, và quy tắc rõ ràng cho từng loại ngoại lệ.

**QC** là người gác cổng cuối. Vấn đề của họ là phải kiểm hết 100% bản ghi, kể cả những cái chắc chắn đúng, nên đến case khó thì hết giờ và làm vội, trong khi đó mới là chỗ cần chuyên môn của họ. Họ cần hàng đợi ưu tiên theo rủi ro và màn hình đối chiếu file gốc ngay bên cạnh.

**Head of Supply** cần biết bao nhiêu khách sạn đã bán được, bao nhiêu đang kẹt, và kẹt ở đâu. Hiện thì không có câu trả lời, nên cũng không biết nên đổ nguồn lực vào khâu nào.

Ngoài ra còn hai nhóm gián tiếp là khách sạn đối tác, thường bị hỏi đi hỏi lại cùng một thông tin, và khách đặt phòng, người cuối cùng gánh mọi lỗi của quy trình.

Nhóm thao tác nhiều nhất là Data Ops và QC nên tôi coi họ là persona chính. Nhưng nhóm hay bị bỏ quên lại là Sales, dù chính họ quyết định chất lượng đầu vào. Tôi đoán cải thiện cho Sales sẽ cho hiệu quả cao nhất trên mỗi đồng bỏ ra, vì nó chặn lỗi ngay từ gốc.

---

## Câu 6. Sau 2 tháng chạy thử: 60% chưa hiển thị

Trước khi đề xuất gì, tôi muốn nói một điều: 60% là triệu chứng chứ chưa phải nguyên nhân. Phản xạ dễ mắc là lao ngay vào tối ưu tốc độ QC, trong khi rất có thể phần lớn số đó còn chưa đến tay QC. Chúng có thể đang kẹt ở chỗ chưa nhận được file, fail validate, chưa map được, thiếu trường bắt buộc, hoặc đã bị reject mà chưa ai sửa. Hai đề xuất dưới đây tôi cố ý thiết kế để vừa chẩn đoán vừa điều trị.

### Cải tiến 1: Dashboard sẵn sàng hiển thị

Ý tưởng là một màn hình duy nhất trả lời được câu hỏi: trong 60% chưa hiển thị đó, mỗi khách sạn đang kẹt ở đâu và thiếu đúng cái gì.

Gồm ba phần. Một funnel từ "đã ký" đến "đã hiển thị" để thấy khâu nào rò rỉ nhiều nhất. Một bảng liệt kê từng khách sạn kèm lý do kẹt đã được chuẩn hoá thành mã, kiểu như thiếu giá, thiếu địa chỉ chi tiết, thủng lịch giá, chưa map được, đang chờ QC, đã bị reject, kèm số ngày đang kẹt và người chịu trách nhiệm. Và một biểu đồ Pareto xếp hạng nguyên nhân theo số khách sạn bị ảnh hưởng.

Về mặt kỹ thuật thì không nặng: thêm hai trường trạng thái và lý do kẹt cho mỗi bản ghi, để một rule engine tính lại tự động mỗi khi bản ghi thay đổi.

Vì sao nên làm, thì đơn giản là hiện không ai biết 60% đó kẹt vì lý do gì. Chưa chẩn đoán được thì mọi cải tiến đều là đoán mò. Tôi còn nghĩ khả năng cao sẽ phát hiện ra một phần lớn trong số đó chỉ thiếu đúng một trường, và chỉ cần một đợt email hàng loạt là thông, không phải viết dòng code nào.

Tác động là chuyển từ cảm giác sang số liệu khi ra quyết định, khoanh được nhóm khách sạn gần xong để xử lý dứt điểm trước, và đặt được mục tiêu đo lường được thay vì nói chung chung. Người hưởng lợi trực tiếp là Head of Supply, sau đó là Sales (biết chính xác phải xin khách sạn bổ sung gì) và Data Ops (biết ưu tiên cái nào trước).

### Cải tiến 2: QC Cockpit

Thay giao diện danh sách phẳng kiểm tuần tự bằng một môi trường làm việc gồm bốn phần.

Đầu tiên là phân luồng theo rủi ro. Mỗi bản ghi có điểm rủi ro tính từ độ tin cậy mapping, nguồn dữ liệu (PDF rủi ro hơn Excel), giá trị hợp đồng, số cờ cảnh báo đang bật. Nhóm rủi ro thấp thì cho tự duyệt và chỉ audit ngẫu nhiên 5%, nhóm rủi ro cao thì bắt buộc kiểm đầy đủ.

Thứ hai là màn hình đối chiếu song song: bên trái là file gốc đã highlight vùng dữ liệu tương ứng, bên phải là dữ liệu đã map, trường nào lệch thì tô màu. QC tick xác nhận theo nhóm trường thay vì phải tự dò.

Thứ ba là duyệt hàng loạt nhưng có điều kiện, chỉ trong phạm vi cùng khách sạn, cùng mức tin cậy cao, không có cờ cảnh báo. Bản ghi từ PDF thì cấm.

Thứ tư, và đây là phần tôi thích nhất, là vòng phản hồi. Mỗi lần QC sửa một giá trị, hệ thống ghi lại cặp "máy đề xuất → giá trị đúng" rồi tự bổ sung vào từ điển alias. QC tách `Superior King/TWN` một lần thì lần sau máy tự tách. Nhờ vậy tỉ lệ tự động tăng dần theo thời gian mà không cần Dev đụng vào nữa.

Lý do nên làm là vì QC đang kiểm hết mọi bản ghi trong khi phần lớn là trường hợp dễ. Nguồn lực đang phân bổ ngược: thời gian của người có chuyên môn bị tiêu vào việc máy làm được, còn case khó thì làm vội vì hết giờ.

Tác động là giảm mạnh khối lượng phải kiểm tay và rút ngắn thời gian trên mỗi bản ghi. Có một điểm tôi muốn nói rõ vì dễ bị hiểu nhầm: mục tiêu ở đây không phải kiểm nhanh hơn cho xong, mà là chất lượng phải tăng lên, vì case rủi ro cao được dành nhiều thời gian hơn. Hưởng lợi trực tiếp là QC, sau đó là Data Ops, Head of Supply, và cuối cùng là khách hàng vì ít gặp lỗi giá hơn.

### Nếu chỉ có 2 tuần làm MVP

Tôi sẽ làm Cải tiến 1 trước, kèm theo phần auto-duyệt tối giản của Cải tiến 2.

Chia thô thì: hai ngày đầu định nghĩa bộ rule sẵn sàng hiển thị và danh mục lý do kẹt, phần này BA làm được, chưa cần Dev. Ba ngày tiếp Dev viết rule engine gắn nhãn cho toàn bộ bản ghi hiện có. Ba ngày dựng dashboard. Ba ngày làm rule auto-duyệt cho nhóm điểm cao có định danh cứng và không có cờ cảnh báo, kèm log đầy đủ và một nút tắt khẩn cấp. Hai ngày cuối đo trước sau và audit ngẫu nhiên 5% để chắc chắn chất lượng không tụt.

Xét theo tác động và công sức thì tôi nghĩ thế này.

Quan trọng nhất là chẩn đoán phải đi trước điều trị. Nếu dồn cả hai tuần vào QC Cockpit đầy đủ mà hoá ra phần lớn 60% đang kẹt ở khâu validate, chưa hề tới QC, thì công sức đó gần như không thay đổi được gì. Còn dashboard thì cho biết chính xác nên đầu tư vào đâu ở sprint sau, tức là nó làm cho những sprint tiếp theo hiệu quả hơn.

Về công sức thì đây cũng là hạng mục nhẹ nhất trong nhóm tác động cao. Chủ yếu là rule engine và báo cáo trên dữ liệu đã có sẵn, không phải đổi luồng nghiệp vụ, không phải đào tạo lại người dùng. Ngược lại, màn hình đối chiếu PDF của QC Cockpit là hạng mục giao diện phức tạp, làm vội trong hai tuần thì khả năng cao ra một sản phẩm mà chính QC không muốn dùng.

Thêm nữa, nó cho kết quả nhìn thấy được ngay trong chính hai tuần đó. Có bảng lý do kẹt là Sales gửi được email hàng loạt xin bổ sung cho nhóm chỉ thiếu một trường. Việc này không cần code, chạy song song được từ khoảng ngày thứ sáu.

Phần auto-duyệt thì chỉ tốn chừng ba ngày công, gồm một rule, một cờ và một log, nhưng lấy được phần lớn giá trị giảm tải cho QC. Còn phần đắt tiền của Cải tiến 2 thì để sprint sau, khi đã biết QC thực sự tốn thời gian ở loại bản ghi nào.

Việc tôi sẽ không làm trong hai tuần này là dùng LLM tự động trích xuất PDF. Công sức cao, rủi ro chất lượng cao, và quan trọng nhất là chưa có dữ liệu nào chứng minh PDF đang là nút thắt chính. Đây đúng kiểu hạng mục nghe rất hấp dẫn nhưng dễ tiêu hết sprint mà không nhúc nhích được chỉ số nào.

---

## Câu 7. Tự đánh giá

### Điểm mạnh

Điều tôi tự tin nhất là giải pháp này bám vào bằng chứng thật. Mọi đề xuất đều truy ngược được về một lỗi cụ thể trong hai file mẫu, nên ít nhất nó đang giải đúng vấn đề đang có chứ không phải vấn đề tôi tưởng tượng ra.

Trọng tâm cũng đặt vào đúng nhóm lỗi âm thầm là thủng lịch giá, map nhầm khách sạn, nhầm net với gross. Nhóm này gây thiệt hại lớn nhất nhưng ít được để ý, vì hệ thống không báo lỗi gì cả.

Phần mapping thì tôi không chỉ đưa ra công thức tính điểm mà có thêm mấy cơ chế tự bảo vệ: hệ số độ phủ để chống điểm cao giả, chặn khi hai ứng viên gần bằng nhau, và điều kiện kép cho auto-map. Tôi nghĩ mấy chi tiết đó mới là thứ quyết định hệ thống có an toàn khi chạy thật hay không.

Cuối cùng, đề xuất MVP có kèm cách đo, gồm audit ngẫu nhiên và so sánh trước sau, nên sau sprint sẽ biết được cải tiến có hiệu quả thật không, thay vì chỉ báo cáo là đã làm xong.

### Điểm còn yếu

Thành thật mà nói, các trọng số và ngưỡng trong công thức mapping vẫn là giả định của tôi. Con số 30/25/20 hay ngưỡng 0.95 dựa trên cách tiếp cận chung của bài toán đối sánh thực thể, chứ tôi chưa có dữ liệu để chứng minh chúng đúng. Phải hiệu chỉnh bằng dữ liệu thật, chắc cần khoảng 200 đến 300 cặp gán nhãn tay để đo và tinh chỉnh. Bỏ qua bước này thì ngưỡng lỏng quá sẽ map sai, chặt quá thì QC quá tải.

Dữ liệu mẫu cũng quá nhỏ để kết luận chắc chắn. Năm dòng Excel và một file PDF không đại diện cho toàn bộ nguồn TA. Thực tế chắc còn nhiều dạng khác chưa lộ ra: file nhiều sheet, ô merge, giá chia nhiều mùa, giá theo số lượng phòng, hợp đồng tiếng Anh hoặc tiếng Hàn, file scan phải OCR. Việc nên làm sớm là audit vài chục file thật trước khi chốt bộ rule.

Tôi cũng chưa lượng hoá được chi phí và lợi ích, vì thiếu dữ liệu nền: hiện mất bao nhiêu phút để xử lý một khách sạn, đội QC có mấy người, tổng số khách sạn TA là bao nhiêu. Phần này cần bổ sung trước khi mang đi xin ngân sách.

Ngoài ra bài này tập trung vào luồng nạp dữ liệu lần đầu, chưa đi sâu vào vòng đời về sau: versioning bảng giá, xử lý booking đã phát sinh khi giá thay đổi, hợp đồng chấm dứt giữa chừng. Đa ngôn ngữ và đa tiền tệ khi mở rộng ra khách sạn quốc tế thì tôi cũng chưa tính tới.

Và ở vị trí fresher, tôi ý thức được rằng nhiều đề xuất trong đây tôi mới nhìn được ở góc thiết kế, chưa trải qua thực tế vận hành. Chắc chắn sẽ có những ràng buộc mà chỉ khi ngồi cùng đội QC và Sales vài tuần mới thấy.

### Phụ thuộc vào bộ phận khác

Nặng nhất là Dev, cho rule engine, dashboard, giao diện QC và tích hợp geocoding, cùng với Content hoặc Data team, cho việc định nghĩa chuẩn Master Content, quyết định gộp hay tách khi trùng, và xây từ điển hạng phòng ban đầu. Thiếu hai nhóm này thì mọi thứ dừng ở mức tài liệu.

QC thì cần bỏ thời gian gán nhãn tập kiểm chứng để hiệu chuẩn ngưỡng, nếu không thì mấy con số trong bài mãi là giả định.

Legal và Finance cần chốt cách hiểu những điều khoản mơ hồ, cụ thể là "phạt 50–100%" thì lấy mức nào, và giá là net hay gross.

Nhưng phụ thuộc mà tôi thấy rủi ro nhất lại là Sales. Vì đây là thay đổi thói quen làm việc chứ không phải vấn đề kỹ thuật, nên khó thúc đẩy nhất. Nếu Sales không dùng template chuẩn thì cả hệ thống phía sau chỉ là đi dọn hậu quả mãi. Cách tôi nghĩ có thể giảm rủi ro là làm template thật nhẹ, dưới 10 cột bắt buộc, tích hợp thẳng vào công cụ họ đang dùng, và cho họ thấy lợi ích trực tiếp của chính họ: biết được trạng thái file, không bị khách sạn hỏi khó, không bị trả file về nhiều lần.

### Nếu có thêm thời gian

Việc đầu tiên tôi muốn làm là audit vài chục file TA thật để hoàn thiện danh mục lỗi và xây tập dữ liệu có gán nhãn, rồi hiệu chuẩn mô hình mapping trên đó, đo precision và recall theo từng ngưỡng để chọn mức phù hợp với khẩu vị rủi ro của công ty.

Sau đó là mấy hướng mở rộng: dùng LLM trích xuất hợp đồng PDF theo schema định sẵn kèm điểm tin cậy cho từng trường; chuẩn hoá chính sách huỷ thành cấu trúc máy đọc được để engine tự tính tiền huỷ; và hệ thống cảnh báo giá bất thường, so với lịch sử và so với khách sạn tương đương trong khu vực.

Xa hơn nữa là portal để khách sạn tự cập nhật giá. Cái này mới là giải pháp triệt để, vì dữ liệu vào đúng cấu trúc ngay từ nguồn và cả khâu parse biến mất. Tôi cũng nghĩ khung này dùng lại được cho mảng vé máy bay, vì bài toán map nguồn cung về master content về bản chất là giống nhau.

Nếu chỉ được chọn một việc để làm tiếp thì tôi chọn phần audit dữ liệu thật và hiệu chuẩn mô hình. Lý do đơn giản thôi: mọi con số trong giải pháp này hiện vẫn là giả định, và chừng nào chưa hiệu chuẩn thì chưa biết hệ thống đang map đúng 70% hay 95%. Mà khoảng cách giữa hai con số đó chính là khoảng cách giữa một hệ thống dùng được và một hệ thống gây thiệt hại.

---

*Hết bài làm.*
