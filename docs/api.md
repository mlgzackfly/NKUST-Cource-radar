# 高科選課雷達 API 文件

本文件說明高科選課雷達提供的公開 API，供第三方應用程式整合使用。

## Base URL

```
https://nkust.zeabur.app/api
```

## 通用說明

### 回應格式

所有 API 回應皆為 JSON 格式。

### 錯誤處理

| HTTP 狀態碼 | 說明 |
|------------|------|
| 200 | 成功 |
| 400 | 請求參數錯誤 |
| 404 | 資源不存在 |
| 503 | 資料庫不可用 |

### 速率限制

目前無速率限制，但請合理使用 API，避免過度頻繁的請求。

---

## 公開 API

以下 API 不需要認證即可使用。

### 1. 健康檢查

檢查 API 服務是否正常運作。

```
GET /health
```

**回應範例**

```json
{
  "ok": true
}
```

---

### 2. 課程列表

取得課程列表，支援搜尋與篩選。

```
GET /courses
```

**查詢參數**

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `q` | string | 否 | 搜尋關鍵字（課程名稱、課程代號、選課代號、系所、教師） |
| `year` | string | 否 | 學年度（例如：`114`） |
| `term` | string | 否 | 學期（`1` 或 `2`） |
| `campus` | string | 否 | 校區（例如：`建工`、`燕巢`、`第一`、`楠梓`、`旗津`） |
| `division` | string | 否 | 學制（例如：`日間部四技`） |
| `department` | string | 否 | 系所名稱 |
| `take` | number | 否 | 回傳筆數上限，預設 20，最大 100 |
| `sortBy` | string | 否 | 排序欄位：`latest`（預設）、`name`、`credits`、`rating`、`reviews` |
| `sortOrder` | string | 否 | 排序順序：`desc`（預設）、`asc` |
| `minRating` | number | 否 | 最低評分（1-5） |
| `maxWorkload` | number | 否 | 最高作業量（1-5） |
| `minGrading` | number | 否 | 最低給分甜度（1-5） |
| `timeSlot` | string | 否 | 時段篩選（例如：`1-2` 表示星期一第 2-3 節） |

**回應範例**

```json
{
  "courses": [
    {
      "id": "clxxxx",
      "courseName": "程式設計",
      "courseCode": "CS101",
      "selectCode": "1234",
      "department": "資訊工程系",
      "campus": "建工",
      "year": "114",
      "term": "1",
      "credits": 3,
      "time": "1-2,1-3,1-4",
      "classroom": "E101",
      "instructors": [
        { "id": "ins123", "name": "王大明" }
      ],
      "avgRating": 4.5,
      "avgWorkload": 3.2,
      "avgGrading": 4.0,
      "reviewCount": 15
    }
  ]
}
```

---

### 3. 篩選選項

取得可用的篩選選項（學年、學期、校區、學制、系所）。

```
GET /courses/filters
```

**回應範例**

```json
{
  "years": ["114", "113", "112", "111", "110", "109"],
  "terms": ["1", "2"],
  "campuses": ["建工", "燕巢", "第一", "楠梓", "旗津"],
  "divisions": ["日間部四技", "日間部碩士班", "進修部四技", "進修學院四技"],
  "departments": ["資訊工程系", "電機工程系", "機械工程系", "..."]
}
```

---

### 4. 搜尋建議

取得搜尋自動完成建議，包含課程、教師、系所。

```
GET /search/suggestions
```

**查詢參數**

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `q` | string | 是 | 搜尋關鍵字（至少 2 個字元） |

**回應範例**

```json
[
  {
    "type": "course",
    "value": "程式設計",
    "label": "程式設計",
    "department": "資訊工程系",
    "id": "clxxxx"
  },
  {
    "type": "instructor",
    "value": "王大明",
    "label": "王大明",
    "department": null,
    "id": "ins123"
  },
  {
    "type": "department",
    "value": "資訊工程系",
    "label": "資訊工程系"
  }
]
```

**建議類型說明**

| type | 說明 |
|------|------|
| `course` | 課程名稱，包含課程 ID 可直接連結至課程頁面 |
| `instructor` | 教師姓名，包含教師 ID 可連結至教師檔案 |
| `department` | 系所名稱，可用於篩選該系所課程 |

---

### 5. 課程評分摘要

取得特定課程的評分統計摘要（不含評論內容）。

```
GET /courses/{id}/summary
```

**路徑參數**

| 參數 | 類型 | 說明 |
|------|------|------|
| `id` | string | 課程 ID |

**回應範例**

```json
{
  "courseId": "clxxxx",
  "summary": {
    "totalReviews": 15,
    "avg": {
      "coolness": 4.2,
      "usefulness": 3.8,
      "workload": 3.5,
      "attendance": 2.8,
      "grading": 4.0
    },
    "count": {
      "coolness": 15,
      "usefulness": 14,
      "workload": 15,
      "attendance": 12,
      "grading": 15
    }
  }
}
```

**評分維度說明**

| 欄位 | 說明 | 分數範圍 |
|------|------|----------|
| `coolness` | 涼度（整體評價） | 1-5 |
| `usefulness` | 實用性 | 1-5 |
| `workload` | 作業量（越高越重） | 1-5 |
| `attendance` | 點名頻率（越高越常點） | 1-5 |
| `grading` | 給分甜度 | 1-5 |

---

### 6. 教師資訊

取得教師詳細資訊，包含所有授課記錄與評價統計。

```
GET /instructors/{id}
```

**路徑參數**

| 參數 | 類型 | 說明 |
|------|------|------|
| `id` | string | 教師 ID |

**回應範例**

```json
{
  "instructor": {
    "id": "ins123",
    "name": "王大明",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "courses": [
    {
      "id": "clxxxx",
      "courseName": "程式設計",
      "courseCode": "CS101",
      "selectCode": "1234",
      "year": "114",
      "term": "1",
      "campus": "建工",
      "department": "資訊工程系",
      "enrolled": 45,
      "capacity": 50,
      "credits": 3,
      "requiredOrElective": "必修",
      "classroom": "E101",
      "time": "1-2,1-3,1-4",
      "_count": { "reviews": 15 }
    }
  ],
  "stats": {
    "totalCourses": 25,
    "totalEnrolled": 1250,
    "totalReviews": 180,
    "semesters": ["114-1", "113-2", "113-1"],
    "campuses": ["建工", "燕巢"],
    "departments": ["資訊工程系"]
  },
  "reviewStats": {
    "averageRatings": {
      "coolness": 4.2,
      "usefulness": 3.8,
      "workload": 3.5,
      "attendance": 2.8,
      "grading": 4.0
    },
    "totalReviews": 180
  }
}
```

---

## 需要認證的 API

以下 API 需要 `@nkust.edu.tw` 信箱登入後才能使用。

### 課程評論列表

```
GET /courses/{id}/reviews
```

需要登入才能查看評論內容。

### 發布評論

```
POST /reviews
```

需要登入才能發布評論。

### 投票、檢舉

```
POST /reviews/{id}/vote
POST /reviews/{id}/report
```

需要登入才能操作。

---

## 使用範例

### JavaScript (fetch)

```javascript
// 搜尋課程
const response = await fetch('https://nkust.zeabur.app/api/courses?q=程式設計&take=10');
const data = await response.json();
console.log(data.courses);
```

### Python (requests)

```python
import requests

# 取得篩選選項
response = requests.get('https://nkust.zeabur.app/api/courses/filters')
filters = response.json()
print(filters['departments'])
```

### cURL

```bash
# 搜尋建議
curl "https://nkust.zeabur.app/api/search/suggestions?q=資工"

# 取得課程評分摘要
curl "https://nkust.zeabur.app/api/courses/COURSE_ID/summary"
```

---

## CORS 設定

目前 API 僅允許同源請求。如需跨域存取，請聯繫管理員。

---

## 更新紀錄

| 日期 | 說明 |
|------|------|
| 2024-12-30 | 初版 API 文件 |
