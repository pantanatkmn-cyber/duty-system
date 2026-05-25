// รายชื่อจุดตรวจสำคัญที่หัวหน้าเวรต้องตรวจทุกวัน (8 จุด)
// ใช้ร่วมกันระหว่าง form, API และหน้าปริ้น

export const INSPECTION_POINTS = [
  { code: "PARKING_29",   name: "ที่จอดรถจักรยานยนต์ข้างอาคาร 29 ปี" },
  { code: "ROAD_29",      name: "ถนนทางเข้าอาคาร 29 ปี" },
  { code: "GARDEN_FLAG",  name: "สวนหย่อมบริเวณหน้าเสาธง" },
  { code: "SPORTS",       name: "สนามกีฬากลางแจ้ง" },
  { code: "ROAD_CANTEEN", name: "ถนนหน้าทางเข้าโรงอาหาร" },
  { code: "GARDEN_BLD9",  name: "สวนหย่อมหลังอาคาร 9 ปี" },
  { code: "ROAD_BLD9",    name: "ถนนหลังอาคาร 9 ปี" },
  { code: "ROAD_BLD19",   name: "ถนนหน้าอาคาร 19 ปี" },
] as const;

export type PointCode = typeof INSPECTION_POINTS[number]["code"];
export type InspectionStatus = "CLEAN" | "DIRTY";
