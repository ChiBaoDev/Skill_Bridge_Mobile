# DNTU SkillBridge Mobile

Ứng dụng Android & iOS cho **DNTU SkillBridge**, sử dụng **Expo + React Native WebView** trỏ trực tiếp tới bản web triển khai tại:
`https://skill-bridge-frontend-swart.vercel.app`

Mọi cập nhật giao diện hoặc tính năng trên web sẽ tự động hiển thị trong app mà không cần build lại.

---

## 1. Chạy thử ngay trên điện thoại thật (2 phút)

1. Cài app **Expo Go** trên điện thoại (tìm trên Google Play hoặc App Store).
2. Mở terminal tại thư mục `Skill_Bridge_Mobile`:
   ```bash
   npm start
   ```
3. Dùng điện thoại quét mã QR hiển thị trên terminal:
   - **Android:** Mở Expo Go → chọn *Scan QR code*.
   - **iOS:** Mở Camera mặc định quét QR → bấm mở bằng Expo Go.

*(Lưu ý: Máy tính và điện thoại cần chung mạng Wi-Fi, hoặc chạy `npx expo start --tunnel` nếu khác mạng).*

---

## 2. Build file cài đặt `.apk` (Android) / `.ipa` (iOS) trên Cloud

Không cần cài Android Studio hay máy Mac:

1. Đăng ký tài khoản miễn phí tại [expo.dev](https://expo.dev).
2. Đăng nhập và khởi tạo EAS project (chỉ làm 1 lần):
   ```bash
   npx eas-cli login
   npx eas-cli init
   ```
3. Build file `.apk` cài trực tiếp cho Android:
   ```bash
   npx eas-cli build -p android --profile preview
   ```
   Sau khi build xong (~5–10 phút), Expo sẽ trả về đường dẫn và mã QR để tải file `.apk`.
4. Build iOS (yêu cầu tài khoản Apple Developer):
   ```bash
   npx eas-cli build -p ios --profile production
   ```

---

## 3. Tùy chỉnh sau này

- **Đổi URL web:** Sửa `DEFAULT_APP_URL` trong [App.tsx](./App.tsx) hoặc đặt biến môi trường `EXPO_PUBLIC_APP_URL`.
- **Đổi Icon / Splash Screen:** Thay các file ảnh trong thư mục `assets/` (`icon.png`, `splash-icon.png`, `android-icon-foreground.png`).
- **Đẩy lên repo Git mới:**
  ```bash
  cd Skill_Bridge_Mobile
  git init
  git add .
  git commit -m "init: DNTU SkillBridge mobile wrapper"
  git remote add origin <URL_REPO_MOI_CUA_BAN>
  git push -u origin main
  ```
