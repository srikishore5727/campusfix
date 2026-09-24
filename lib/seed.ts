import type { Campus, Complaint } from "./types";

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

const now = (minsAgo: number) =>
  new Date(Date.now() - minsAgo * 60000).toISOString();

export const SEED_CAMPUS_A_ID = "campus_greenfield";
export const SEED_CAMPUS_B_ID = "campus_lakeview";

export function seedCampuses(): Campus[] {
  return [
    {
      id: SEED_CAMPUS_A_ID,
      name: "Greenfield Institute of Technology",
      slug: "greenfield",
      created_at: now(60 * 24 * 30),
    },
    {
      id: SEED_CAMPUS_B_ID,
      name: "Lakeview College of Arts",
      slug: "lakeview",
      created_at: now(60 * 24 * 20),
    },
  ];
}

export function seedComplaints(): Complaint[] {
  return [
    {
      id: uid("c"),
      campus_id: SEED_CAMPUS_A_ID,
      user_id: "seed_student_1",
      user_name: "Aarav Patel",
      title: "No water supply on 3rd floor, Block B",
      description:
        "No water since morning 6 AM in rooms 301-315. Tanks seem empty. Please send tanker or fix motor.",
      category: "Water",
      block: "Block B",
      status: "open",
      upvotes_count: 14,
      upvoted_by: [],
      image_url: null,
      created_at: now(60 * 5),
    },
    {
      id: uid("c"),
      campus_id: SEED_CAMPUS_A_ID,
      user_id: "seed_student_2",
      user_name: "Sneha Reddy",
      title: "Wifi down in library wing",
      description:
        "Library wifi (Campus_Wifi_5G) connects but no internet since yesterday. Many students affected during exams.",
      category: "Wifi",
      block: "Library",
      status: "in_progress",
      upvotes_count: 22,
      upvoted_by: [],
      image_url: null,
      created_at: now(60 * 26),
    },
    {
      id: uid("c"),
      campus_id: SEED_CAMPUS_A_ID,
      user_id: "seed_student_3",
      user_name: "Rahul Verma",
      title: "Tube light + fan not working, Room 204",
      description:
        "Room 204 Block A: fan makes noise and stops, tube light flickering. Raised twice on register, no action.",
      category: "Electricity",
      block: "Block A",
      status: "open",
      upvotes_count: 7,
      upvoted_by: [],
      image_url: null,
      created_at: now(60 * 9),
    },
    {
      id: uid("c"),
      campus_id: SEED_CAMPUS_A_ID,
      user_id: "seed_student_4",
      user_name: "Priya Nair",
      title: "Washrooms not cleaned for 3 days, Block C",
      description:
        "Ground floor washrooms in Block C stink, bins overflowing. Cleaning staff not coming since Monday.",
      category: "Cleaning",
      block: "Block C",
      status: "open",
      upvotes_count: 18,
      upvoted_by: [],
      image_url: null,
      created_at: now(60 * 12),
    },
    {
      id: uid("c"),
      campus_id: SEED_CAMPUS_B_ID,
      user_id: "seed_student_5",
      user_name: "Kiran Kumar",
      title: "Mess food quality dropped, dinner batch 2",
      description:
        "Undercooked rice twice this week in batch 2 (8 PM). Please check mess contractor.",
      category: "Mess",
      block: "Mess Hall",
      status: "in_progress",
      upvotes_count: 11,
      upvoted_by: [],
      image_url: null,
      created_at: now(60 * 30),
    },
    {
      id: uid("c"),
      campus_id: SEED_CAMPUS_B_ID,
      user_id: "seed_student_6",
      user_name: "Divya Sharma",
      title: "Street light dead near hostel gate",
      description:
        "Path from main gate to Block D is fully dark after 7 PM. Safety issue, please fix urgently.",
      category: "Electricity",
      block: "Block D",
      status: "resolved",
      upvotes_count: 25,
      upvoted_by: [],
      image_url: null,
      created_at: now(60 * 50),
    },
    {
      id: uid("c"),
      campus_id: SEED_CAMPUS_B_ID,
      user_id: "seed_student_7",
      user_name: "Arjun Mehta",
      title: "Broken tap leaking continuously, Block A",
      description:
        "Common washbasin tap near room 110 leaking 24x7. Needs washer replacement.",
      category: "Water",
      block: "Block A",
      status: "resolved",
      upvotes_count: 9,
      upvoted_by: [],
      image_url: null,
      created_at: now(60 * 70),
    },
    {
      id: uid("c"),
      campus_id: SEED_CAMPUS_A_ID,
      user_id: "seed_student_8",
      user_name: "Ishita Singh",
      title: "Garbage pile behind canteen",
      description: "Huge garbage pile behind canteen attracting dogs.",
      category: "Cleaning",
      block: "Canteen",
      status: "open",
      upvotes_count: 5,
      upvoted_by: [],
      image_url: null,
      created_at: now(90),
    },
  ];
}
