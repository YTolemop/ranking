# 啟用管理者登入與共用儲存

網站仍部署在 GitHub Pages；Supabase 負責驗證管理者與儲存共用賽程。

1. 在自己的 Supabase 帳號建立專案。選擇適合的方案並確認目前配額；資料庫密碼請自行保管。
2. 在 SQL Editor 執行 `schema.sql`，建立資料表、讀取權限、管理者檢查及儲存函式。
3. 在 Authentication → Users 新增／邀請你的管理者使用者，完成信箱驗證。
4. 將下面 SQL 中的信箱換成你的信箱，再在 SQL Editor 執行。這個信箱不需要寫到網站或公開 repo：

```sql
insert into bracket_private.administrators(user_id)
select id from auth.users where lower(email)=lower('你的管理者信箱')
on conflict do nothing;
```

5. 確認查詢只授權了你的那個 user_id。`administrators` 表不允許訪客或一般已登入使用者自行加入。
6. 在 Authentication → URL Configuration 設定 Site URL 與允許的 Redirect URL 為 `https://ytolemop.github.io/ranking/`。Email 登入使用預設 Magic Link 樣板即可。
7. 網站不提供註冊；登入採 `shouldCreateUser: false`。建議在 Authentication 設定關閉新使用者註冊；即使有其他使用者登入，資料庫也不會授予其修改權限。
8. 在 `config.js` 填入 Project URL 及 publishable key（或舊版 anon key）。這兩項設計為公開；**不可填入 service_role、secret key、資料庫密碼或個人 access token**。
9. 將更新後的網站檔案部署至原本 GitHub repo 的 main 分支。
10. 點「管理者登入」，輸入管理者信箱，開啟信箱收到的一次性連結。
11. 第一次登入可建立賽程、匯入 JSON，或在有舊資料的瀏覽器按「匯入本機進度」，將原本賽程公布至雲端。

## 驗證

- 未登入的瀏覽器可以讀取已公布賽程，看不到抽籤與修改操作。
- 管理者登入後可修改；儲存成功才顯示「已同步」。
- 公開頁面在可見時每 5 秒讀取最新結果，切回分頁時也會更新。
- 非管理者直接呼叫寫入介面會被拒絕；直接寫資料表也不允許。
- 同時開兩個管理頁，舊版本不能覆蓋較新的賽程，會提示重新操作。
- 儲存失敗會還原剛才操作，不會把未成功上傳的變更顯示為已同步。
- 原有本機備份仍保留，設定完成不會自動將本機資料上傳或覆蓋已公布賽程。

Supabase 專案未設定時，網站維持原本的本機模式，**不具備共用儲存與登入限制**。設定完成並驗證後，才可對外當成共用賽程使用。

## 圖表操作

賽程卡片固定基本大小，不會因人數增加自動縮小。滑鼠拖曳空白區、觸控滑動、捲軸及聚焦後方向鍵皆可移動。「回到中央」回到冠軍賽位置。點選選手按鈕仍可正常晉級。
