/**
 * SET 2026-27 (First Phase) examination centres.
 * Source: "Centre and School Allocation Register — SET 1st Phase 2026" (13-07-2026).
 *
 * A student's 9-digit Unique ID encodes its centre in the 2nd and 3rd digits,
 * e.g. 1[02]001001 -> CTR-02. Keys below are those two digits.
 */

export interface School {
  /** School code as printed in the register, unique within its centre. */
  code: string;
  name: string;
}

export interface Centre {
  code: string;
  name: string;
  address: string;
  district: string;
  /** Exact Google Maps search text supplied by KIDS; the destination we send students to. */
  mapsQuery: string;
  /** Schools allocated to this centre, in register order. */
  schools: School[];
}

export const CENTRES: Record<string, Centre> = {
  "01": {
    code: "CTR-01",
    name: "G. R. Maulana Azad Memorial Girls' High School (H.S.)",
    address: "H-83, Paharpur Road, Kolkata 700024",
    mapsQuery: "G. R. Maulana Azad Memorial Girls High School H-83 Paharpur Road Kolkata 700024",
    district: "Garden Reach, Kolkata",
    schools: [
      { code: "SC-01", name: "Maulana Hasrat Mohani Memorial Girls' High School (H.S.)" },
      { code: "SC-02", name: "Maulana Mohd. Ali Jauhar Girls' School (H.S.)" },
      { code: "SC-03", name: "G. R. Nut Behari Das Girls' High School (H.S.)" },
      { code: "SC-04", name: "Santoshpure Shymaprasad Vidyalaya for Girls' (H.S.)" },
      { code: "SC-05", name: "Nut Behari Das Boys' High School (H.S.)" },
    ],
  },
  "02": {
    code: "CTR-02",
    name: "Maulana Hasrat Mohani Memorial Girls' High School (H.S.)",
    address: "F-69, 28 No. Garden Reach Road, Kolkata 700024",
    mapsQuery: "Maulana Hasrat Mohani Memorial Girls High School F-69 28 No. Garden Reach Road Kolkata-700024",
    district: "Garden Reach, Kolkata",
    schools: [
      { code: "SC-01", name: "G. R. Maulana Azad Memorial Girls' High School (H.S.)" },
      { code: "SC-02", name: "Judge Abdul Bari Girls' High School (H.S.)" },
      { code: "SC-03", name: "Garden Reach Mudialy Girls' High School (H.S.)" },
      { code: "SC-04", name: "Metiabruz High School" },
    ],
  },
  "03": {
    code: "CTR-03",
    name: "Dhankheti High School (H.S.)",
    address: "G-185, Shamlal Lane, Garden Reach, Kolkata 700024",
    mapsQuery: "Dhankheti High School 185 Shamlal Lane Garden Reach Kolkata-700024",
    district: "Garden Reach, Kolkata",
    schools: [
      { code: "SC-01", name: "Garden Reach K. C. Mills High School (H.S.)" },
      { code: "SC-02", name: "Bengali Bazar High School (H.S.)" },
      { code: "SC-03", name: "Dhankheti High School (H.S.)" },
      { code: "SC-04", name: "G. R. Mudialy Boys' High School (H.S.)" },
    ],
  },
  "04": {
    code: "CTR-04",
    name: "Kidderpore Muslim High School (H.S.)",
    address: "3, Nawab Ali Lane, Kolkata 700023",
    mapsQuery: "Kidderpore Muslim High School 3 Nawab Ali Lane Kolkata 700023",
    district: "Kidderpore, Kolkata",
    schools: [
      { code: "SC-01", name: "Badshah Khan Centenary Girls High School (H.S.)" },
      { code: "SC-02", name: "Kidderpore Muslim High School (H.S.)" },
      { code: "SC-03", name: "Bankim Ghosh Memorial Girls' High School" },
      { code: "SC-04", name: "Sarat Chandra Paul Girls' High School (H.S.)" },
      { code: "SC-05", name: "The Kidderpore Academy" },
      { code: "SC-06", name: "Khidderpore Milani Boys' High School" },
      { code: "SC-07", name: "Khidderpore Milani Girls' High School" },
    ],
  },
  "05": {
    code: "CTR-05",
    name: "Shri Jnan Bhaskar Vidyalaya",
    address: "11, Dock Eastern Boundary Road, Kolkata 700023",
    mapsQuery: "Shri Jnan Bhaskar Vidyalaya 11 Dock Eastern Boundary Road Kolkata 700023",
    district: "Kidderpore, Kolkata",
    schools: [
      { code: "SC-01", name: "Shri Jnan Bhaskar Vidyalaya" },
      { code: "SC-02", name: "Shri Jnan Bhaskar Balika Vidyalaya" },
      { code: "SC-03", name: "Arya Parishad Vidyalaya (H.S. Co-Ed)" },
      { code: "SC-04", name: "Girls' Arya Parishad Vidyalaya" },
      { code: "SC-05", name: "Lajpat Hindi Balika Vidyalaya School (H.S.)" },
      { code: "SC-06", name: "Lajpat Hindi High School (H.S.)" },
      { code: "SC-07", name: "Adarsh Hindi Girls High School" },
      { code: "SC-08", name: "Adarsh Hindi High School" },
      { code: "SC-09", name: "Adarsh Hindi Vidyalaya High School (H.S.)" },
      { code: "SC-10", name: "Jawaharlal Nehru Balika Vidyapith" },
      { code: "SC-11", name: "Jawaharlal Nehru Vidyapith" },
    ],
  },
  "06": {
    code: "CTR-06",
    name: "Islamia High School (H.S.)",
    address: "44, Hare Krishna Konar Road, Beniapukur, Kolkata 700014",
    mapsQuery: "Islamia High School 44 Hare Krishna Konar Road Beniapukur Kolkata 700014",
    district: "Beniapukur, Kolkata",
    schools: [
      { code: "SC-01", name: "Park Circus High School (H.S.)" },
      { code: "SC-02", name: "Islamia High School (H.S.)" },
      { code: "SC-03", name: "A. P. Department Calcutta Madrasah" },
      { code: "SC-04", name: "Kraya Government High School" },
      { code: "SC-05", name: "Anjuman Mufidul Islam Girls High School (H.S.)" },
      { code: "SC-06", name: "Anjuman Islamia Girls' High School (H.S.)" },
    ],
  },
  "07": {
    code: "CTR-07",
    name: "Md. Jan High School (H.S.)",
    address: "9B, Bolai Dutta Street, Kolkata 700073",
    mapsQuery: "Md. Jan High School 9B Bolai Dutta Street Kolkata 700073",
    district: "Central Kolkata",
    schools: [
      { code: "SC-01", name: "C.M.O. High School (H.S.) (Boys)" },
      { code: "SC-02", name: "The Presidency Muslim High School (H.S.)" },
      { code: "SC-03", name: "Md. Jan High School (H.S.)" },
      { code: "SC-04", name: "C.M.O. High School (H.S.) (Girls)" },
    ],
  },
  "08": {
    code: "CTR-08",
    name: "Momin High School (H.S.)",
    address: "36 & 37, Maulana Abul Kalam Azad Sarani, Kolkata 700011",
    mapsQuery: "Momin High School 36 and 37 Maulana Abul Kalam Azad Sarani Kolkata 700011",
    district: "Central Kolkata",
    schools: [
      { code: "SC-01", name: "Momin High School (H.S.)" },
      { code: "SC-02", name: "Patwar Bagan Girls High School (H.S.)" },
      { code: "SC-03", name: "Baitulmal Girls High School (H.S.)" },
    ],
  },
  "09": {
    code: "CTR-09",
    name: "Aulad Hussain Islamic Academy",
    address: "23, Topsia 2nd Lane, Kolkata 700039",
    mapsQuery: "Aulad Hussain Islamic Academy 23 Topsia 2Nd Lane Kolkata 700039",
    district: "Topsia, Kolkata",
    schools: [
      { code: "SC-01", name: "Aulad Hussain Islamic Academy" },
      { code: "SC-02", name: "Jagabandhu Girls High School" },
      { code: "SC-03", name: "Monu Memorial Institution Urdu Medium High School" },
    ],
  },
  "10": {
    code: "CTR-10",
    name: "Belgachia Urdu High School (Co-Ed)",
    address: "1/2/4, Jiban Krishna Ghosh Road, Kolkata 700037",
    mapsQuery: "Belgachia Urdu High School Jiban Krishna Ghosh Road Kolkata 700037",
    district: "Belgachia, Kolkata",
    schools: [
      { code: "SC-01", name: "Belgachia Urdu High School (Co-Ed)" },
      { code: "SC-02", name: "Belgachia Muslim High School (H.S.)" },
    ],
  },
  "11": {
    code: "CTR-11",
    name: "Alambazar Urdu High School (H.S.)",
    address: "155, S.P. Banerjee Road, Alambazar, Kolkata 700035",
    mapsQuery: "Alambazar Urdu High School 155 S.P. Banerjee Road Alambazar Kolkata 700035",
    district: "Alambazar, Kolkata",
    schools: [
      { code: "SC-01", name: "Cossipore Aman High School" },
      { code: "SC-02", name: "Alambazar Urdu High School (H.S.)" },
      { code: "SC-03", name: "Baranagar Sree Sree Ram Krishna Vidyapith" },
    ],
  },
  "12": {
    code: "CTR-12",
    name: "Kamarhati Union Collegiate High School",
    address: "Chhai Madan Road, 20, Old Line (Union College Road), Kamarhati, Kolkata 700058",
    mapsQuery: "Kamarhati Union Collegiate High School Chhai Madan Road Kamarhati Kolkata 700058",
    district: "Kamarhati, North 24 Parganas",
    schools: [
      { code: "SC-01", name: "Kamarhati Union Collegiate High School" },
      { code: "SC-02", name: "Kamarhati High School (H.S.)" },
      { code: "SC-03", name: "Salimiah High School" },
      { code: "SC-04", name: "Titagarh AGM High School" },
      { code: "SC-05", name: "Titagarh Free India High School" },
      { code: "SC-06", name: "Kamarhati Sagor Datt Free High School" },
    ],
  },
  "13": {
    code: "CTR-13",
    name: "Kankinara Urdu Girls High School",
    address: "House No. 16/1, BL No. 3, Nayabazar, Post Kankinara, North 24 Parganas, West Bengal 743126",
    mapsQuery: "Kankinara Urdu Girls High School Nayabazar Kankinara 743126",
    district: "Kankinara, North 24 Parganas",
    schools: [
      { code: "SC-01", name: "Kankinara Urdu Girls High School" },
      { code: "SC-02", name: "Kankinara Himayatul Ghurba High School (H.S.)" },
    ],
  },
  "14": {
    code: "CTR-14",
    name: "Rishra Anjuman High School",
    address: "3/5, Anjuman Road (Maitri Path), Masjid Lane, Rishra, Hooghly, West Bengal 712248",
    mapsQuery: "Rishra Anjuman High School Anjuman Road Rishra Hooghly 712248",
    district: "Rishra, Hooghly",
    schools: [
      { code: "SC-01", name: "Rishra Anjuman High School" },
      { code: "SC-02", name: "I. M. High Madrasah" },
      { code: "SC-03", name: "Fatema Girls' High School" },
      { code: "SC-04", name: "The Adabi Society High Madrasah" },
    ],
  },
  "15": {
    code: "CTR-15",
    name: "Howrah High School (H.S.)",
    address: "6 & 7/1 Priya, Manna Basti 3rd Lane, Shibpur, Howrah, West Bengal 711102",
    mapsQuery: "Howrah High School Priya Manna Basti Shibpur Howrah 711102",
    district: "Shibpur, Howrah",
    schools: [
      { code: "SC-01", name: "Belur T. H. Memorial High School (H.S.)" },
      { code: "SC-02", name: "Shibpur Anjuman High Madrasah (H.S.)" },
      { code: "SC-03", name: "Taraqui-E-Urdu High School (H.S.)" },
      { code: "SC-04", name: "Shibpur Urdu High School" },
      { code: "SC-05", name: "Shibpur Muslim Girls' High School" },
      { code: "SC-06", name: "Shibpur Bengal Jute Mill Hindi High School" },
      { code: "SC-07", name: "Shibpur Urdu Girls' High School" },
      { code: "SC-08", name: "Howrah Muslim High School (H.S.)" },
      { code: "SC-09", name: "Howrah High School (H.S.)" },
      { code: "SC-10", name: "Howrah Hat High School (H.S.)" },
      { code: "SC-11", name: "Bankra Paschimpara Urdu Junior High School" },
    ],
  },
  "16": {
    code: "CTR-16",
    name: "Raniganj Anjuman Urdu Girls' High School (H.S.)",
    address: "S.M. Road, Raniganj, Burdwan 713347",
    mapsQuery: "Raniganj Anjuman Urdu Girls High School S.M. Road Raniganj Burdwan 713347",
    district: "Raniganj, Paschim Bardhaman",
    schools: [
      { code: "SC-01", name: "Raniganj Anjuman Urdu Girls' High School (H.S.)" },
      { code: "SC-02", name: "Raniganj Urdu High School" },
      { code: "SC-03", name: "Sri Guru Nanak Vidyalaya (H.S.)" },
      { code: "SC-04", name: "Raniganj Marwari Sanatan Vidyalaya" },
      { code: "SC-05", name: "Raniganj Basanti Devi Goenka Vidya Mandir" },
      { code: "SC-06", name: "Ballavpur Raghunath Chak Hindi High School" },
      { code: "SC-07", name: "Raniganj Sri Durga Vidyalaya Girls' High School (H.S.)" },
    ],
  },
  "17": {
    code: "CTR-17",
    name: "Rahmatnagar Iqbal Academy High School (H.S.)",
    address: "12 No. Railway Colony, Andal, Paschim Burdwan 713321",
    mapsQuery: "Rahmatnagar Iqbal Academy High School Railway Colony Andal 713321",
    district: "Andal, Paschim Bardhaman",
    schools: [
      { code: "SC-01", name: "Rahmatnagar Iqbal Academy High School (H.S.)" },
      { code: "SC-02", name: "Andal Hindu Hindi Vidyalaya (H.S.)" },
    ],
  },
  "18": {
    code: "CTR-18",
    name: "Jay Kay Nagar High School (H.S.)",
    address: "Jemari, P.O. Bidhanbag, P.S. Raniganj, Paschim Bardhaman, West Bengal 713337",
    mapsQuery: "Jay Kay Nagar High School Jemari Bidhanbag Raniganj 713337",
    district: "Jemari, Paschim Bardhaman",
    schools: [
      { code: "SC-01", name: "Jay Kay Nagar High School (H.S) (HINDI)" },
      { code: "SC-01", name: "Jay Kay Nagar High School (H.S) (BENG)" },
      { code: "SC-02", name: "Ratibati Hindi High School (H.S.)" },
      { code: "SC-03", name: "Jamuria Hindi High School (H.S.)" },
      { code: "SC-04", name: "D. A. V. Asansol High School (H.S.)" },
    ],
  },
  "19": {
    code: "CTR-19",
    name: "Asansol Rahmania High School",
    address: "Rail Par, Jahangiri Mohalla, Asansol 713302",
    mapsQuery: "Asansol Rahmania High School Rail par jahangiri Mohalla Asansol 713302",
    district: "Asansol, Paschim Bardhaman",
    schools: [
      { code: "SC-01", name: "Dr. Shyama Prasad Vidyalaya (Bengali)" },
      { code: "SC-02", name: "Danishgah Islamia High School" },
      { code: "SC-03", name: "Rahmat Nagar Urdu High School (H.S.), Burnpur" },
      { code: "SC-04", name: "Asansol Rahmania High School" },
      { code: "SC-05", name: "Rabbania Girls' High School" },
      { code: "SC-06", name: "Kulti Millat Urdu Girls' High School (H.S.), Kulti" },
      { code: "SC-07", name: "Kazi Nazrul Islam Urdu Junior High School" },
      { code: "SC-08", name: "Haji Qadam Rasool High School (H.S.)" },
      { code: "SC-09", name: "Asansol Eidgah High School" },
    ],
  },
  "20": {
    code: "CTR-20",
    name: "Madrasah Islamia High Madrasah (H.S.)",
    address: "New Famine Road, Eidgah Mohalla, Post & Dist. Purulia, Pin 723101",
    mapsQuery: "Madrasah Islamia High Madrasah New Famine Road Eidgah Mohalla Purulia 723101",
    district: "Purulia",
    schools: [
      { code: "SC-01", name: "Ayesha Kutchchi Urdu High School" },
      { code: "SC-02", name: "Kasturba Hindi Balika Vidyalaya" },
      { code: "SC-03", name: "Rajasthan Vidyapeeth (Hindi Medium)" },
      { code: "SC-04", name: "Gandhi High Vidyalay (Bengali Medium)" },
      { code: "SC-05", name: "Purulia Municipal Managed High School (H.S.)" },
    ],
  },
  "21": {
    code: "CTR-21",
    name: "Ayesha Kutchi Urdu High School",
    address: "S.G. Road, Purulia (M), District Purulia, West Bengal 723101",
    mapsQuery: "Ayesha Kutchi Urdu High School S.G. Road Purulia 723101",
    district: "Purulia",
    schools: [
      { code: "SC-01", name: "Madrasah Islamia High Madrasah (H.S.)" },
      { code: "SC-02", name: "Munsif Danga High School" },
      { code: "SC-03", name: "Chittranjan Boys High School" },
      { code: "SC-04", name: "Purulia Town High School" },
      { code: "SC-05", name: "Senior Madrasah Islahul Momenin (Urdu & Bengali Medium)" },
      { code: "SC-06", name: "Shishu Siksha Kendra High School" },
    ],
  },
};

/**
 * Official revenue district of each centre, per the SET 2026 master workbook.
 * `Centre.district` above is the locality shown to students; this is the
 * administrative district, and it is what the "Districts" figure counts.
 */
export const CENTRE_DISTRICT: Record<string, string> = {
  "01": "South 24 Parganas",
  "02": "South 24 Parganas",
  "03": "South 24 Parganas",
  "04": "Kolkata",
  "05": "Kolkata",
  "06": "Kolkata",
  "07": "Kolkata",
  "08": "Kolkata",
  "09": "Kolkata",
  "10": "Kolkata",
  "11": "Kolkata",
  "12": "North 24 Parganas",
  "13": "North 24 Parganas",
  "14": "Hooghly",
  "15": "Howrah",
  "16": "Paschim Bardhaman",
  "17": "Paschim Bardhaman",
  "18": "Paschim Bardhaman",
  "19": "Paschim Bardhaman",
  "20": "Purulia",
  "21": "Purulia",
};

export const CENTRE_COUNT = Object.keys(CENTRES).length;

/** The 21 centres in register order, keyed by their Unique ID digits. */
export const CENTRE_LIST: { key: string; centre: Centre }[] = Object.entries(CENTRES).map(
  ([key, centre]) => ({ key, centre }),
);

export const SCHOOL_COUNT = CENTRE_LIST.reduce((n, { centre }) => n + centre.schools.length, 0);

/** Distinct administrative districts covered by the 21 centres. */
export const DISTRICT_COUNT = new Set(Object.values(CENTRE_DISTRICT)).size;

/**
 * Pulls the centre out of the 2nd and 3rd digits of a 9-digit Unique ID.
 *
 * This decodes the ID's *shape*; it does NOT prove the student exists. A typo
 * such as 102001001 is well-formed and will happily resolve to CTR-02. Callers
 * facing students must check the ID against the enrolled register first — see
 * /api/centre — or they will confidently send someone to the wrong school.
 */
export function centreFromUniqueId(uniqueId: string): Centre | undefined {
  if (!/^\d{9}$/.test(uniqueId)) return undefined;
  return CENTRES[uniqueId.slice(1, 3)];
}
