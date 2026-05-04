const path = require('path');
const fs = require('fs/promises');
const puppeteer = require('puppeteer');
// Giả định bạn đã import model Commitment đúng chuẩn Sequelize/Mongoose
const { Commitment } = require('../models');
const ApiResponse = require('../utils/response');

// Hàm tạo HTML Template chuẩn văn bản hành chính
const templateHTML = (data) => {
  const { date, partyA, partyB, modelType } = data;

  // Lọc chính xác nội dung Mô hình theo Điều 5
  const getModelContent = (type) => {
    switch (type) {
      case 1:
        return `
          <p><strong>Mô hình 1: Giảng viên làm chính – Sinh viên học việc</strong><br/>
          (Áp dụng cho sinh viên năm 2–3, mới tham gia nghiên cứu)<br/>
          - Bên A: <strong>65–70%</strong> tổng giá trị tiền thưởng<br/>
          - Bên B: <strong>30–35%</strong> tổng giá trị tiền thưởng</p>`;
      case 2:
        return `
          <p><strong>Mô hình 2: Đồng tác giả thực chất</strong><br/>
          (Áp dụng cho sinh viên năm cuối, cao học hoặc sinh viên tham gia đầy đủ các khâu nghiên cứu)<br/>
          - Bên A: <strong>50–60%</strong> tổng giá trị tiền thưởng<br/>
          - Bên B: <strong>40–50%</strong> tổng giá trị tiền thưởng</p>`;
      case 3:
        return `
          <p><strong>Mô hình 3: Sinh viên làm chính – Giảng viên bảo trợ học thuật</strong><br/>
          (Áp dụng khi sinh viên thực hiện phần lớn công việc nghiên cứu và viết bài)<br/>
          - Bên A: <strong>40–50%</strong> tổng giá trị tiền thưởng<br/>
          - Bên B: <strong>50–60%</strong> tổng giá trị tiền thưởng</p>`;
      default:
        return `<p>(Lỗi: Không xác định được mô hình phân bổ)</p>`;
    }
  };

  return `
  <!DOCTYPE html>
  <html>
  <head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.5; margin: 0; color: #000; }
    .header { text-align: center; font-weight: bold; margin-bottom: 30px; }
    .header p { margin: 5px 0; }
    .title { text-align: center; font-weight: bold; font-size: 14pt; margin: 20px 0; text-transform: uppercase; }
    .section-title { font-weight: bold; margin-top: 15px; text-transform: uppercase; }
    .info-block p { margin: 5px 0; }
    ul, ol { margin-top: 5px; margin-bottom: 5px; }
    li { margin-bottom: 3px; }
    .signature-table { width: 100%; margin-top: 40px; }
    .signature-table td { width: 50%; text-align: center; vertical-align: top; }
    .space-for-sign { height: 100px; }
  </style>
  </head>
  <body>
    <div class="header">
      <p>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
      <p>Độc lập – Tự do – Hạnh phúc</p>
      <p>***</p>
    </div>

    <div class="title">BẢN CAM KẾT BẢO MẬT THÔNG TIN, QUYỀN VÀ NGHĨA VỤ TRONG HOẠT ĐỘNG NGHIÊN CỨU KHOA HỌC</div>

    <p>Hôm nay, ngày ${date.day} tháng ${date.month} năm ${date.year}, tại ${date.location}, chúng tôi gồm có:</p>

    <div class="info-block">
      <p><strong>BÊN A: GIẢNG VIÊN – NGHIÊN CỨU VIÊN (Người hướng dẫn chính)</strong></p>
      <p>- Họ và tên: <strong>${partyA.name}</strong></p>
      <p>- Chức danh: ${partyA.title}</p>
      <p>- Đơn vị công tác: ${partyA.office}</p>
      <p>- Email: ${partyA.email}</p>
      <p> (Sau đây gọi là <strong>“Bên A”</strong>)</p>
    </div>

    <div class="info-block" style="margin-top: 15px;">
      <p><strong>BÊN B: SINH VIÊN THAM GIA NGHIÊN CỨU KHOA HỌC</strong></p>
      <p>- Họ và tên: <strong>${partyB.name}</strong></p>
      <p>- Mã số sinh viên: ${partyB.mssv}</p>
      <p>- Lớp/Khoa/Trường: ${partyB.class}</p>
      <p>- Email: ${partyB.email}</p>
      <p> (Sau đây gọi là <strong>“Bên B”</strong>)</p>
    </div>

    <p>Hai bên cùng thống nhất ký kết <strong>Cam kết bảo mật thông tin và phân bổ quyền lợi trong hoạt động nghiên cứu khoa học</strong> với các điều khoản sau:</p>

    <div class="section-title">ĐIỀU 1. PHẠM VI ÁP DỤNG</div>
    <p>Cam kết này áp dụng cho toàn bộ:</p>
    <ul style="list-style-type: disc;">
      <li>Đề tài nghiên cứu khoa học, khóa luận, luận văn, bài báo khoa học, báo cáo hội thảo;</li>
      <li>Ý tưởng nghiên cứu, giả thuyết khoa học, phương pháp, dữ liệu, kết quả nghiên cứu;</li>
      <li>Tài liệu, bản thảo, số liệu thô, hình ảnh, biểu đồ, mã nguồn và mọi thông tin liên quan mà Bên B được tiếp cận trong quá trình Bên A hướng dẫn.</li>
    </ul>

    <div class="section-title">ĐIỀU 2. BẢO MẬT THÔNG TIN</div>
    <p>1.   Bên B cam kết không tiết lộ, không sao chép, không chuyển giao cho bất kỳ bên thứ ba nào các thông tin nghiên cứu nêu tại Điều 1 dưới bất kỳ hình thức nào khi chưa có sự đồng ý bằng văn bản của Bên A.</p>
    <p>2.   Nghĩa vụ bảo mật có hiệu lực trong suốt quá trình nghiên cứu và tiếp tục có hiệu lực sau khi đề tài kết thúc, Bên B tốt nghiệp hoặc không còn tham gia nhóm nghiên cứu.</p>

    <div class="section-title">ĐIỀU 3. QUYỀN TÁC GIẢ VÀ QUYỀN SỞ HỮU TRÍ TUỆ</div>
    <p>1.   <strong>Bên A</strong> được xác định là người hướng dẫn chính và/hoặc người đề xuất ý tưởng nghiên cứu, chịu trách nhiệm chính về định hướng khoa học của đề tài.</p>
    <p>2.   Quyền tác giả và thứ tự tên tác giả trong các công bố khoa học được xác định dựa trên:</p>
    <ul style="list-style-type: disc;">
      <li>Mức độ đóng góp thực tế của từng bên;</li>
      <li>Thông lệ học thuật;</li>
      <li>Quy định của pháp luật và của cơ sở đào tạo;</li>
      <li>Quyết định cuối cùng của Bên A với tinh thần minh bạch và công bằng.</li>
    </ul>
    <p>3.   <strong>Bên B</strong> không được tự ý nộp bài, công bố, đăng tải hoặc sử dụng một phần hay toàn bộ kết quả nghiên cứu khi chưa có sự chấp thuận của Bên A.</p>

    <div class="section-title">ĐIỀU 4. NGUYÊN TẮC PHÂN BỔ QUYỀN LỢI TÀI CHÍNH</div>
    <ol>
      <li>Nguyên tắc cốt lõi:
        <ul style="list-style-type: disc;">
          <li>Quyền tác giả được xác nhận và định nghĩa khác với Quyền tiền thưởng;</li>
          <li>Mức tiền thưởng được phân bổ theo mức đóng góp thực tế;</li>
          <li>Sinh viên luôn được xem xét có phần thưởng;</li>
          <li>Giảng viên là người quyết định cuối cùng nhưng mọi thông tin phải được minh bạch.</li>
        </ul>
      </li>
      <li>Trường hợp bài báo, báo cáo hội thảo hoặc công bố khoa học phát sinh khoản thưởng từ nhà trường hoặc đơn vị tài trợ (dự kiến từ 40.000.000 đến 100.000.000 VNĐ hoặc theo quy định từng thời kỳ), khoản thưởng này được xem là quyền lợi phát sinh từ hoạt động nghiên cứu chung.</li>
      <li>Việc phân bổ tiền thưởng được thực hiện trên cơ sở:
        <ul>
          <li>Mức độ đóng góp thực tế của từng bên;</li>
          <li>Vai trò trong nghiên cứu (ý tưởng, thiết kế nghiên cứu, thực nghiệm, phân tích dữ liệu, viết và chỉnh sửa bài);</li>
          <li>Thông lệ học thuật và quy định của nhà trường.</li>
        </ul>
      </li>
    </ol>
    <p>4.   Sinh viên tham gia nghiên cứu <strong>luôn được xem xét phân bổ quyền lợi tài chính tương xứng</strong>, không bị coi là lao động không thù lao.</p>

    <div class="section-title">ĐIỀU 5. CÁC MÔ HÌNH PHÂN BỔ TIỀN THƯỞNG THAM KHẢO</div>
    <p>Hai bên thống nhất áp dụng mô hình sau, tùy theo tính chất và mức độ đóng góp của Bên B trong từng đề tài cụ thể:</p>
    ${getModelContent(modelType)}
    <p>Tỷ lệ phân bổ cụ thể sẽ được hai bên xác nhận bằng văn bản hoặc email trước thời điểm nhận thưởng.</p>

    <div class="section-title">ĐIỀU 6. QUYỀN VÀ NGHĨA VỤ CỦA SINH VIÊN (BÊN B)</div>
    
      <p>1.   Thực hiện nghiên cứu trung thực, nghiêm túc, tuân thủ đạo đức học thuật.</p>
      <p>2.   Tôn trọng vai trò hướng dẫn khoa học của Bên A.</p>
      <p>3.   Ghi nhận đầy đủ sự hướng dẫn và đóng góp của Bên A trong mọi sản phẩm học thuật.</p>
      <p>4.   Chịu trách nhiệm trước pháp luật và nhà trường nếu vi phạm các cam kết đã ký.</p>

    <div class="section-title">ĐIỀU 7. XỬ LÝ VI PHẠM</div>
    <p>1.   Trường hợp Bên B vi phạm cam kết, Bên A có quyền yêu cầu chấm dứt hành vi vi phạm, không cho phép sử dụng kết quả nghiên cứu và báo cáo vụ việc với nhà trường hoặc cơ quan có thẩm quyền.</p>
    <p>2.   Bên vi phạm phải chịu trách nhiệm bồi thường thiệt hại (nếu có) theo quy định pháp luật Việt Nam hiện hành, bao gồm nhưng không giới hạn ở:</p>
    <ul style="list-style-type: disc;">
      <li>Bộ luật Dân sự năm 2015, đặc biệt là các Điều 584, 585 và 589 về căn cứ phát sinh trách nhiệm bồi thường thiệt hại, nguyên tắc bồi thường và thiệt hại được bồi thường;</li>
      <li>Luật Sở hữu trí tuệ năm 2005, sửa đổi, bổ sung các năm 2009, 2019 và 2022, đặc biệt là các Điều 28, 35, 198 và 202 liên quan đến hành vi xâm phạm quyền tác giả, quyền liên quan và biện pháp xử lý, bồi thường thiệt hại;</li>
      <li>Các văn bản pháp luật khác có liên quan và quy định nội bộ của cơ sở đào tạo (nếu có).</li>
    </ul>

    <div class="section-title">ĐIỀU 8. HIỆU LỰC CAM KẾT VÀ GIÁ TRỊ PHÁP LÝ</div>
    <p>1.   Cam kết này được xem là <strong>thỏa thuận dân sự</strong> theo quy định của Bộ luật Dân sự năm 2015, có bản chất pháp lý tương tự một hợp đồng dân sự, được xác lập trên cơ sở tự nguyện, bình đẳng, thiện chí và trung thực của các bên.</p>
    <p>2.   Cam kết này đáp ứng các điều kiện có hiệu lực của giao dịch dân sự theo Điều 117 Bộ luật Dân sự năm 2015 và được pháp luật Việt Nam bảo vệ.</p>
    <p>3.   Cam kết này có hiệu lực kể từ ngày ký.</p>
    <p>4.   Cam kết được lập thành 02 (hai) bản có giá trị pháp lý như nhau, mỗi bên giữ 01 (một) bản.</p>

    <table class="signature-table">
      <tr>
        <td>
          <strong>BÊN A</strong><br/>
          <em>(Ký, ghi rõ họ tên)</em>
          <div class="space-for-sign"></div>
          <strong>${partyA.name}</strong>
        </td>
        <td>
          <strong>BÊN B</strong><br/>
          <em>(Ký, ghi rõ họ tên)</em>
          <div class="space-for-sign"></div>
          <strong>${partyB.name}</strong>
        </td>
      </tr>
    </table>
  </body>
  </html>`;
};

const listCommitments = async (req, res, next) => {
  try {
    const data = await Commitment.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']],
    });
    return ApiResponse.success(res, data);
  } catch (error) {
    next(error);
  }
};

const exportPdf = async (req, res, next) => {
  try {
    const { commitmentId } = req.body;
    if (!commitmentId) {
      return ApiResponse.badRequest(res, 'Commitment ID is required.');
    }

    const commitment = await Commitment.findOne({ where: { id: commitmentId, user_id: req.user.id } });
    if (!commitment) {
      return ApiResponse.notFound(res, 'Commitment not found or you do not have permission.');
    }

    // Lấy dữ liệu từ DB để điền vào template
    const partyA = {
      name: commitment.party_a_name,
      title: commitment.party_a_title || '',
      office: commitment.party_a_office || '',
      email: commitment.party_a_email || '',
    };
    const partyB = {
      name: commitment.party_b_name,
      mssv: commitment.party_b_mssv,
      class: commitment.party_b_class || '',
      email: commitment.party_b_email || '',
    };
    const modelType = commitment.model_type;
    const commitDate = new Date(commitment.created_at);
    const date = {
      day: commitDate.getDate(),
      month: commitDate.getMonth() + 1,
      year: commitDate.getFullYear(),
      time: commitDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      location: commitment.commitment_location || 'TP. Hồ Chí Minh',
    };

    const html = templateHTML({ date, partyA, partyB, modelType });

    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded' });

    const fileName = `Cam_Ket_NCKH_${partyB.mssv}_${commitment.id}.pdf`;
    const outputPath = path.join(__dirname, '../../outputs', fileName);

    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '30mm' },
    });

    await browser.close();

    // Cập nhật đường dẫn PDF vào DB
    await commitment.update({ pdf_path: outputPath });

    const fileBuffer = await fs.readFile(outputPath);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(fileBuffer);
  } catch (error) {
    next(error);
  }
};

const { v4: uuidv4 } = require('uuid');

// --- In-Memory Storage for Drafts ---
const draftStorage = new Map();

// ====================================================================================
// DRAFT AND PREVIEW FLOW (IN-MEMORY)
// ====================================================================================

/**
 * @description Tạo một bản nháp commitment và lưu vào bộ nhớ tạm (in-memory).
 * @route POST /api/commitments/draft
 * @access Private
 */
const createDraftCommitment = async (req, res, next) => {
  try {
    const { partyA, partyB, modelType, commitmentLocation } = req.body;

    // Validate required fields
    if (!partyA?.name || !partyB?.name || !partyB?.mssv || !modelType) {
      return ApiResponse.badRequest(res, 'Missing required commitment information for draft.');
    }

    // Tạo dữ liệu commitment từ body request
    const commitData = {
      user_id: req.user.id, // Lưu user_id để kiểm tra quyền sau này
      party_a_name: partyA.name,
      party_a_title: partyA.title || null,
      party_a_office: partyA.office || null,
      party_a_email: partyA.email || null,
      party_b_name: partyB.name,
      party_b_mssv: partyB.mssv,
      party_b_class: partyB.class || null,
      party_b_email: partyB.email || null,
      model_type: Number(modelType),
      commitment_location: commitmentLocation || null,
    };

    // Tạo một ID duy nhất cho bản nháp
    const draftId = uuidv4();

    // Lưu bản nháp vào bộ nhớ ảo
    draftStorage.set(draftId, commitData);

    // (Tùy chọn) Xóa bản nháp sau một khoảng thời gian để tránh đầy bộ nhớ
    setTimeout(() => {
      if (draftStorage.has(draftId)) {
        draftStorage.delete(draftId);
        console.log(`Draft ${draftId} expired and was deleted.`);
      }
    }, 1000 * 60 * 30); // Xóa sau 30 phút

    // Trả về draftId cho client
    return ApiResponse.success(res, { draftId }, 'Draft created successfully. Use this ID for preview and finalization.');
  } catch (error) {
    next(error);
  }
};

/**
 * @description Tạo và trả về file PDF để xem trước từ một bản nháp trong bộ nhớ.
 * @route GET /api/commitments/preview/:draftId
 * @access Private
 */
const previewDraftPdf = async (req, res, next) => {
  try {
    const { draftId } = req.params;
    console.log("=== BẮT ĐẦU CHẠY PREVIEW ===");
    console.log("1. Đang tìm Draft ID:", draftId);

    // 1. Lấy dữ liệu từ bộ nhớ ảo
    if (!draftStorage.has(draftId)) {
      console.log("❌ LỖI: Không tìm thấy Draft trong bộ nhớ.");
      return ApiResponse.notFound(res, 'Draft not found. It may have expired or is invalid.');
    }
    const commitment = draftStorage.get(draftId);

    // 2. Kiểm tra quyền
    if (commitment.user_id !== req.user.id) {
      console.log("❌ LỖI: Sai user_id.");
      return ApiResponse.forbidden(res, 'You do not have permission to view this draft.');
    }

    // 3. Mapping biến "bắc cầu"
    const partyA = {
      name: commitment.party_a_name,
      title: commitment.party_a_title || '',
      office: commitment.party_a_office || '',
      email: commitment.party_a_email || '',
    };
    const partyB = {
      name: commitment.party_b_name,
      mssv: commitment.party_b_mssv,
      class: commitment.party_b_class || '',
      email: commitment.party_b_email || '',
    };
    const modelType = commitment.model_type;
    const commitDate = new Date();
    const date = {
      day: commitDate.getDate().toString().padStart(2, '0'),
      month: (commitDate.getMonth() + 1).toString().padStart(2, '0'),
      year: commitDate.getFullYear(),
      location: commitment.commitment_location || 'Hội An, Quảng Nam',
    };

    // Đổ dữ liệu vào HTML
    const html = templateHTML({ date, partyA, partyB, modelType });
    console.log("2. Render HTML thành công. Độ dài chuỗi HTML:", html.length);

    // 4. Khởi chạy Puppeteer
    console.log("3. Đang khởi động Puppeteer...");
    const browser = await puppeteer.launch({ 
      headless: 'new', 
      ignoreHTTPSErrors: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-web-security'
      ] 
    });
    
    const page = await browser.newPage();
    
    // Đổi 'domcontentloaded' thành 'networkidle0' để đảm bảo HTML nạp xong 100%
    await page.setContent(html, { waitUntil: 'networkidle0' }); 
    
    console.log("4. Đang in ra PDF Buffer...");
    const pdfBuffer = await page.pdf({ 
      format: 'A4', 
      printBackground: true, 
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '30mm' } 
    });
    
    await browser.close();
    
    console.log("5. Tạo PDF thành công! Kích thước file (bytes):", pdfBuffer.length);

    // Bắt lỗi nếu Puppeteer tạo file rỗng
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error("Puppeteer tạo ra file 0 bytes. Vui lòng kiểm tra lại thư viện trên Server.");
    }

    // 5. Trả về PDF chuẩn nhị phân
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="preview_commitment.pdf"',
      'Content-Length': pdfBuffer.length
    });
    
    console.log("=== KẾT THÚC PREVIEW ===");
    return res.end(pdfBuffer); // Dùng res.end thay vì res.send

  } catch (error) {
    console.error("=== ❌ LỖI CRASH TẠI HÀM PREVIEW ===", error);
    next(error);
  }
};

/**
 * @description Hoàn tất, lưu commitment từ bản nháp vào DB và trả về PDF để tải xuống.
 * @route POST /api/commitments/finalize/:draftId
 * @access Private
 */
const finalizeCommitment = async (req, res, next) => {
  try {
    const { draftId } = req.params;
    console.log("=== BẮT ĐẦU HOÀN TẤT & LƯU PDF ===");

    // 1. Lấy dữ liệu từ bộ nhớ ảo
    if (!draftStorage.has(draftId)) {
      console.log("❌ LỖI: Không tìm thấy Draft trong bộ nhớ.");
      return ApiResponse.notFound(res, 'Bản nháp không tồn tại hoặc đã hết hạn.');
    }
    const draftData = draftStorage.get(draftId);

    // 2. Kiểm tra quyền
    if (draftData.user_id !== req.user.id) {
      console.log("❌ LỖI: Sai user_id.");
      return ApiResponse.forbidden(res, 'Bạn không có quyền thao tác trên bản nháp này.');
    }

    // 3. Lưu vào DB
    console.log("1. Đang lưu dữ liệu vào Database...");
    const newCommitment = await Commitment.create(draftData);
    if (!newCommitment) {
      throw new Error("Không thể khởi tạo bản ghi trong Database.");
    }

    // Xử lý biến thời gian tùy thuộc vào cấu hình Sequelize của bạn
    const dbDate = newCommitment.createdAt || newCommitment.created_at || new Date();

    // 4. Tạo HTML
    const partyA = {
      name: newCommitment.party_a_name || '',
      title: newCommitment.party_a_title || '',
      office: newCommitment.party_a_office || '',
      email: newCommitment.party_a_email || '',
    };
    const partyB = {
      name: newCommitment.party_b_name || '',
      mssv: newCommitment.party_b_mssv || '',
      class: newCommitment.party_b_class || '',
      email: newCommitment.party_b_email || '',
    };
    const modelType = newCommitment.model_type;
    const commitDate = new Date(dbDate);
    const date = {
      day: commitDate.getDate().toString().padStart(2, '0'),
      month: (commitDate.getMonth() + 1).toString().padStart(2, '0'),
      year: commitDate.getFullYear(),
      location: newCommitment.commitment_location || 'TINLAB',
    };

    const html = templateHTML({ date, partyA, partyB, modelType });

    // 5. Khởi chạy Puppeteer
    console.log("2. Đang khởi chạy Puppeteer để xuất file...");
    const browser = await puppeteer.launch({ 
      headless: 'new', 
      ignoreHTTPSErrors: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ] 
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // TẠO BUFFER TRƯỚC (Không lưu ra file vội)
    console.log("3. Đang render PDF...");
    const pdfBuffer = await page.pdf({ 
      format: 'A4', 
      printBackground: true, 
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '30mm' } 
    });
    
    await browser.close();

    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error("PDF sinh ra bị rỗng (0 bytes)!");
    }

    // 6. LƯU RA Ổ CỨNG BẰNG BUFFER
    console.log("4. Đang lưu file PDF ra ổ cứng...");
    const fileName = `Cam_Ket_NCKH_${partyB.mssv}_${newCommitment.id}.pdf`;
    const outputPath = path.join(__dirname, '../../outputs', fileName);
    
    // Đảm bảo thư mục outputs tồn tại
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    // Dùng fs.writeFile để ghi cứng Buffer xuống đĩa một cách đồng bộ
    await fs.writeFile(outputPath, pdfBuffer);
    console.log("=> Đã lưu file cứng thành công tại:", outputPath);

    // 7. Cập nhật đường dẫn vào Database và dọn dẹp bộ nhớ nháp
    console.log("5. Cập nhật Database và xóa bản nháp...");
    await newCommitment.update({ pdf_path: outputPath });
    draftStorage.delete(draftId);

    // 8. Trả file về cho trình duyệt để tải xuống
    console.log("6. Đang gửi file về Client...");
    res.set({
      'Content-Type': 'application/pdf',
      // Dùng attachment để bắt trình duyệt tải file xuống thay vì mở tab mới
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': pdfBuffer.length,
      'Access-Control-Expose-Headers': 'Content-Disposition',
    });
    
    console.log("=== KẾT THÚC HOÀN TẤT THÀNH CÔNG ===");
    return res.end(pdfBuffer);

  } catch (error) {
    console.error("=== ❌ LỖI CRASH TẠI HÀM FINALIZE ===", error);
    next(error);
  }
};

module.exports = {
  // New Draft Flow
  createDraftCommitment,
  previewDraftPdf,
  finalizeCommitment,

  // Kept from old flow
  listCommitments,
  exportPdf,
};