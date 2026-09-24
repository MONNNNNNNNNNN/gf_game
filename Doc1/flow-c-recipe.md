# สูตรสร้าง Flow C ลงทะเบียนจากช่องติ๊กในชีตหลักสูตร

ชีต `หลักสูตร` แถวละหลักสูตร ต่อท้ายตารางมีคอลัมน์ละหนึ่งคน ผู้ดูแลติ๊กคนที่จะเข้าอบรม
ในแถวของหลักสูตรนั้น ติ๊กได้หลายคนในแถวเดียว

Flow C ทำให้ตาราง `Enrollments` ตรงกับช่องติ๊ก ทุกชั่วโมงในเวลางาน

| ในชีตหลักสูตร | Flow C ทำ |
|---|---|
| ติ๊กคน ที่ยังไม่มีแถว | เพิ่มแถวใน Enrollments |
| เอาติ๊กออก และคนนั้นยังไม่ได้รับอะไรเลย | ลบแถวนั้น |
| เอาติ๊กออก แต่ได้รับแจ้งเตือนหรือยืนยันไปแล้ว | ไม่ลบ ชีตผู้เข้าอบรมแสดงแถวนั้นเป็นสีส้ม ผู้ดูแลตัดสินใจเอง |
| หลักสูตรที่ ใช้แจ้งเตือน ไม่ติ๊ก | ไม่แตะเลย ประวัติปีเก่าปลอดภัย |
| คนที่ไม่มีคอลัมน์ เช่นเข้าใหม่ยังไม่ได้เพิ่ม | ไม่แตะแถวของคนนั้น |

Flow A และ B ทำงานกับตาราง Enrollments เหมือนเดิม ไม่ต้องแก้

---

## 1 สร้างโฟลว์

**สร้าง** → **โฟลว์ระบบคลาวด์ตามกำหนดการ** ชื่อ `Training Roster_Rev2`
ความถี่ **วัน** ทุก `1` วัน เขตเวลา `(UTC+07:00) Bangkok, Hanoi, Jakarta`
**ในชั่วโมงเหล่านี้** `7,8,9,10,11,12,13,14,15,16,17,18` **ในนาทีเหล่านี้** `15`

รันนาทีที่ 15 ไม่ชนกับ Flow A (08:00) และ Flow B (08:30) ที่เขียนไฟล์เดียวกัน
อยากให้ทำงานทันที กด **เรียกใช้** ที่หน้ารายละเอียด Flow

## 2 อ่านสามตาราง

**Excel Online (Business) → แสดงรายการแถวที่มีอยู่ในตาราง** ไฟล์ `/แผนอบรม/ระบบอบรม_Rev1.xlsx`

| ชื่อ | ตาราง |
|---|---|
| `ReadTrainings` | Trainings |
| `ReadEmployees` | Employees |
| `ReadEnrollments` | Enrollments |

ทุกตัว **การตั้งค่า** → **การแบ่งหน้า** เปิด → **เกณฑ์** `5000`

## 3 เตรียมข้อมูล

**กรองอาร์เรย์** ชื่อ `ActiveCourses` จาก `fx` `outputs('ReadTrainings')?['body/value']`
โหมดขั้นสูง

```
@equals(toLower(string(item()?['ใช้แจ้งเตือน'])),'true')
```

**กรองอาร์เรย์** ชื่อ `ActiveEmployees` จาก `fx` `outputs('ReadEmployees')?['body/value']`
ซ้าย `fx` `item()?['สถานะ']` เท่ากับ `ทำงานอยู่`

**เลือก** ชื่อ `ExistingIds` จาก `fx` `outputs('ReadEnrollments')?['body/value']`
สลับช่อง แผนที่ เป็นโหมดข้อความ ใส่ `fx` `item()?['รหัสการลงทะเบียน']`

**ตัวแปร → เริ่มต้นตัวแปร** สองตัว ชนิด จำนวนเต็ม ค่า `0` ชื่อ `added` และ `removed`

## 4 วนทีละหลักสูตร

**ใช้กับแต่ละรายการ** ชื่อ `ForEachCourse` จาก `fx` `body('ActiveCourses')` ไม่เปิด Concurrency

ข้างในลูป

**เขียน** ชื่อ `Course` `fx` `items('ForEachCourse')?['รหัสหลักสูตร']`

**เลือก** ชื่อ `Picks` จาก `fx` `body('ActiveEmployees')` โหมด คีย์และค่า

| คีย์ | ค่า |
|---|---|
| `id` | `fx` `string(item()?['รหัสพนักงาน'])` |
| `name` | `fx` `item()?['ชื่อแสดง']` |
| `picked` | `fx` `if(contains(items('ForEachCourse'),item()?['ชื่อแสดง']),toLower(string(items('ForEachCourse')?[item()?['ชื่อแสดง']])),'missing')` |

`picked` คือช่องติ๊กของคนนั้นในแถวหลักสูตรนี้ ได้ `true`, `false` หรือ `missing`
ถ้ายังไม่มีคอลัมน์ของคนนั้น `missing` ทำให้ Flow ไม่เพิ่มและไม่ลบแถวของเขา

### 4.1 เพิ่มคนที่ติ๊ก

**กรองอาร์เรย์** ชื่อ `NewPicks` จาก `fx` `body('Picks')` โหมดขั้นสูง

```
@and(equals(item()?['picked'],'true'),not(contains(body('ExistingIds'),concat('ENR-',outputs('Course'),'-',item()?['id']))))
```

**ใช้กับแต่ละรายการ** ชื่อ `ForEachNew` จาก `fx` `body('NewPicks')` ข้างใน

**Excel Online (Business) → เพิ่มแถวลงในตาราง** ชื่อ `AddEnrollment` ตาราง `Enrollments`

| ช่อง | ค่า |
|---|---|
| รหัสหลักสูตร | `fx` `outputs('Course')` |
| ผู้เข้าอบรม | `fx` `items('ForEachNew')?['name']` |

ช่องอื่นเว้นว่างทั้งหมด ตารางเติมสูตรให้แถวใหม่เอง ช่องติ๊กว่างนับเป็นไม่ใช่
แล้ว **เพิ่มค่าตัวแปร** `added` ทีละ `1`

### 4.2 ลบคนที่เอาติ๊กออกและยังไม่ได้รับอะไร

ต่อจาก `ForEachNew` (นอกลูปนั้น ยังอยู่ใน `ForEachCourse`)

**กรองอาร์เรย์** ชื่อ `Unpicked` จาก `fx` `body('Picks')` ซ้าย `fx` `item()?['picked']` เท่ากับ `false`

**เลือก** ชื่อ `UnpickedIds` จาก `fx` `body('Unpicked')` โหมดข้อความ `fx` `item()?['id']`

**กรองอาร์เรย์** ชื่อ `ToRemove` จาก `fx` `outputs('ReadEnrollments')?['body/value']` โหมดขั้นสูง

```
@and(equals(item()?['รหัสหลักสูตร'],outputs('Course')),contains(body('UnpickedIds'),string(item()?['รหัสพนักงาน'])),not(equals(toLower(string(item()?['เข้าอบรมแล้ว'])),'true')),not(equals(toLower(string(item()?['ขอยืนยันแล้ว'])),'true')),not(equals(toLower(string(item()?['แจ้งล่วงหน้า 7 วันแล้ว'])),'true')),not(equals(toLower(string(item()?['แจ้งล่วงหน้า 1 วันแล้ว'])),'true')),not(equals(toLower(string(item()?['เพิ่มปฏิทินแล้ว'])),'true')))
```

**ใช้กับแต่ละรายการ** ชื่อ `ForEachRemove` จาก `fx` `body('ToRemove')` ข้างใน

**Excel Online (Business) → ลบแถว** ชื่อ `RemoveEnrollment` ตาราง `Enrollments`
Key Column `รหัสการลงทะเบียน` Key Value `fx` `items('ForEachRemove')?['รหัสการลงทะเบียน']`
แล้ว **เพิ่มค่าตัวแปร** `removed` ทีละ `1`

## 5 ทดสอบ

ทดสอบตาม `docs/user-cases.md` หัวข้อ Flow C
