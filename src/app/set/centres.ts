/**
 * SET 2026-27 (First Phase) examination centres.
 * Source: "Centre and School Allocation Register — SET 1st Phase 2026" (13-07-2026).
 *
 * A student's 9-digit Unique ID encodes its centre in the 2nd and 3rd digits,
 * e.g. 1[02]001001 -> CTR-02. Keys below are those two digits.
 */

export interface Centre {
  code: string;
  name: string;
  address: string;
  district: string;
}

export const CENTRES: Record<string, Centre> = {
  "01": {
    code: "CTR-01",
    name: "G. R. Maulana Azad Memorial Girls' High School (H.S.)",
    address: "H-83, Paharpur Road, Kolkata 700024",
    district: "Garden Reach, Kolkata",
  },
  "02": {
    code: "CTR-02",
    name: "Maulana Hasrat Mohani Memorial Girls' High School (H.S.)",
    address: "F-69, 28 No. Garden Reach Road, Kolkata 700024",
    district: "Garden Reach, Kolkata",
  },
  "03": {
    code: "CTR-03",
    name: "Dhankheti High School (H.S.)",
    address: "G-185, Shamlal Lane, Garden Reach, Kolkata 700024",
    district: "Garden Reach, Kolkata",
  },
  "04": {
    code: "CTR-04",
    name: "Kidderpore Muslim High School (H.S.)",
    address: "3, Nawab Ali Lane, Kolkata 700023",
    district: "Kidderpore, Kolkata",
  },
  "05": {
    code: "CTR-05",
    name: "Shri Jnan Bhaskar Vidyalaya",
    address: "11, Dock Eastern Boundary Road, Kolkata 700023",
    district: "Kidderpore, Kolkata",
  },
  "06": {
    code: "CTR-06",
    name: "Islamia High School (H.S.)",
    address: "44, Hare Krishna Konar Road, Beniapukur, Kolkata 700014",
    district: "Beniapukur, Kolkata",
  },
  "07": {
    code: "CTR-07",
    name: "Md. Jan High School (H.S.)",
    address: "9B, Bolai Dutta Street, Kolkata 700073",
    district: "Central Kolkata",
  },
  "08": {
    code: "CTR-08",
    name: "Momin High School (H.S.)",
    address: "36 & 37, Maulana Abul Kalam Azad Sarani, Kolkata 700011",
    district: "Central Kolkata",
  },
  "09": {
    code: "CTR-09",
    name: "Aulad Hussain Islamic Academy",
    address: "23, Topsia 2nd Lane, Kolkata 700039",
    district: "Topsia, Kolkata",
  },
  "10": {
    code: "CTR-10",
    name: "Belgachia Urdu High School (Co-Ed)",
    address: "1/2/4, Jiban Krishna Ghosh Road, Kolkata 700037",
    district: "Belgachia, Kolkata",
  },
  "11": {
    code: "CTR-11",
    name: "Alambazar Urdu High School (H.S.)",
    address: "155, S.P. Banerjee Road, Alambazar, Kolkata 700035",
    district: "Alambazar, Kolkata",
  },
  "12": {
    code: "CTR-12",
    name: "Kamarhati Union Collegiate High School",
    address: "Chhai Madan Road, 20, Old Line (Union College Road), Kamarhati, Kolkata 700058",
    district: "Kamarhati, North 24 Parganas",
  },
  "13": {
    code: "CTR-13",
    name: "Kankinara Urdu Girls High School",
    address: "House No. 16/1, BL No. 3, Nayabazar, Post Kankinara, North 24 Parganas, West Bengal 743126",
    district: "Kankinara, North 24 Parganas",
  },
  "14": {
    code: "CTR-14",
    name: "Rishra Anjuman High School",
    address: "3/5, Anjuman Road (Maitri Path), Masjid Lane, Rishra, Hooghly, West Bengal 712248",
    district: "Rishra, Hooghly",
  },
  "15": {
    code: "CTR-15",
    name: "Howrah High School (H.S.)",
    address: "6 & 7/1 Priya, Manna Basti 3rd Lane, Shibpur, Howrah, West Bengal 711102",
    district: "Shibpur, Howrah",
  },
  "16": {
    code: "CTR-16",
    name: "Raniganj Anjuman Urdu Girls' High School (H.S.)",
    address: "S.M. Road, Raniganj, Burdwan 713347",
    district: "Raniganj, Paschim Bardhaman",
  },
  "17": {
    code: "CTR-17",
    name: "Rahmatnagar Iqbal Academy High School (H.S.)",
    address: "12 No. Railway Colony, Andal, Paschim Burdwan 713321",
    district: "Andal, Paschim Bardhaman",
  },
  "18": {
    code: "CTR-18",
    name: "Jay Kay Nagar High School (H.S.)",
    address: "Jemari, P.O. Bidhanbag, P.S. Raniganj, Paschim Bardhaman, West Bengal 713337",
    district: "Jemari, Paschim Bardhaman",
  },
  "19": {
    code: "CTR-19",
    name: "Asansol Rahmania High School",
    address: "Rail Par, Jahangiri Mohalla, Asansol 713302",
    district: "Asansol, Paschim Bardhaman",
  },
  "20": {
    code: "CTR-20",
    name: "Madrasah Islamia High Madrasah (H.S.)",
    address: "New Famine Road, Eidgah Mohalla, Post & Dist. Purulia, Pin 723101",
    district: "Purulia",
  },
  "21": {
    code: "CTR-21",
    name: "Ayesha Kutchi Urdu High School",
    address: "S.G. Road, Purulia (M), District Purulia, West Bengal 723101",
    district: "Purulia",
  },
};

export const CENTRE_COUNT = Object.keys(CENTRES).length;

/** Pulls the centre code out of the 2nd and 3rd digits of a 9-digit Unique ID. */
export function centreFromUniqueId(uniqueId: string): Centre | undefined {
  if (!/^\d{9}$/.test(uniqueId)) return undefined;
  return CENTRES[uniqueId.slice(1, 3)];
}
