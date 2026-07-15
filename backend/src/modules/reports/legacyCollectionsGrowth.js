import User from "../auth/user.model.js";
import { resolveEmployeeNameByEmail } from "./employeeIdentity.js";

export const LEGACY_KEY_TO_EMAIL = {
  Akash: "akash@fab5network.com",
  Asha: "asha@fab5network.com",
  Arunav: "arunav@fab5network.com", 
  Abhay: "abhay@fab5network.com",
  Anil: "anil@fab5network.com",
  Khushboo: "khushboo@fab5network.com",
  Manoj: "manoj@fab5network.com"
};

const RAW_HISTORICAL_GROWTH = [
  { rawDate: new Date(2024, 0, 1), Akash: 0, Asha: 604468.7, Arunav: 1353455, Abhay: 0, Anil: 96665.6, Khushboo: 360628, Manoj: 2366185 },
  { rawDate: new Date(2024, 1, 1), Akash: 374189, Asha: 527504, Arunav: 1483716, Abhay: 4856, Anil: 96666, Khushboo: 356328, Manoj: 2577859 },
  { rawDate: new Date(2024, 2, 1), Akash: 487714, Asha: 543627, Arunav: 1811084, Abhay: 81120, Anil: 96666, Khushboo: 352396, Manoj: 2514169 },
  { rawDate: new Date(2024, 3, 1), Akash: 646697, Asha: 910774, Arunav: 1705480, Abhay: 87680, Anil: 185679, Khushboo: 525937, Manoj: 2425880 },
  { rawDate: new Date(2024, 4, 1), Akash: 723614, Asha: 875021, Arunav: 1765137, Abhay: 105273, Anil: 175207, Khushboo: 752441, Manoj: 2119912 },
  { rawDate: new Date(2024, 5, 1), Akash: 896093, Asha: 954917, Arunav: 1581232, Abhay: 108643, Anil: 175207, Khushboo: 880997, Manoj: 1907357 },
  { rawDate: new Date(2024, 6, 1), Akash: 1129662, Asha: 962175, Arunav: 1594183, Abhay: 113138, Anil: 175207, Khushboo: 894356, Manoj: 2165474 },
  { rawDate: new Date(2024, 7, 1), Akash: 1302040, Asha: 1133906, Arunav: 1547206, Abhay: 125853, Anil: 181107, Khushboo: 913958, Manoj: 1328858 },
  { rawDate: new Date(2024, 8, 1), Akash: 1466352, Asha: 1162284, Arunav: 1665632, Abhay: 130583, Anil: 654668, Khushboo: 872902, Manoj: 1563596 },
  { rawDate: new Date(2024, 9, 1), Akash: 1658136, Asha: 1307429, Arunav: 1926049, Abhay: 149976, Anil: 694512, Khushboo: 719966, Manoj: 1585523 },
  { rawDate: new Date(2024, 10, 1), Akash: 1663966, Asha: 1277747, Arunav: 1998945, Abhay: 138484, Anil: 682256, Khushboo: 750928, Manoj: 1589446 },
  { rawDate: new Date(2024, 11, 1), Akash: 1765230, Asha: 1351344, Arunav: 2070196, Abhay: 147306, Anil: 978719, Khushboo: 832061, Manoj: 1541929 },
  { rawDate: new Date(2025, 0, 1), Akash: 1897543, Asha: 1473153, Arunav: 2179331, Abhay: 243653, Anil: 937139, Khushboo: 850004, Manoj: 1643100 },
  { rawDate: new Date(2025, 1, 1), Akash: 1922890, Asha: 1521981, Arunav: 2545889, Abhay: 231657, Anil: 1064021, Khushboo: 834150, Manoj: 1960474 },
  { rawDate: new Date(2025, 2, 1), Akash: 2053198, Asha: 1561160, Arunav: 2463465, Abhay: 401148, Anil: 1008928, Khushboo: 868043, Manoj: 2338453 },
  { rawDate: new Date(2025, 3, 1), Akash: 1761103, Asha: 1778079, Arunav: 2344987, Abhay: 523042, Anil: 1021827, Khushboo: 820077, Manoj: 2554841 },
  { rawDate: new Date(2025, 4, 1), Akash: 1546042, Asha: 1841504, Arunav: 2437862, Abhay: 654674, Anil: 973141, Khushboo: 849321, Manoj: 2520102 },
  { rawDate: new Date(2025, 5, 1), Akash: 1513462, Asha: 1734119, Arunav: 2655887, Abhay: 654189, Anil: 1162203, Khushboo: 878871, Manoj: 2609612 },
  { rawDate: new Date(2025, 6, 1), Akash: 1606139, Asha: 1924057, Arunav: 3196126, Abhay: 614014, Anil: 1435219, Khushboo: 868285, Manoj: 2317503 },
  { rawDate: new Date(2025, 7, 1), Akash: 1299032, Asha: 2195844, Arunav: 3259907, Abhay: 632098, Anil: 195314, Khushboo: 919042, Manoj: 2271941 },
  { rawDate: new Date(2025, 8, 1), Akash: 1395186, Asha: 2339323, Arunav: 3707488, Abhay: 635148, Anil: 119692, Khushboo: 937501, Manoj: 2483649 },
  { rawDate: new Date(2025, 9, 1), Akash: 1628548, Asha: 2561876, Arunav: 3796114, Abhay: 637656, Anil: 87647, Khushboo: 1025147, Manoj: 2531966 },
  { rawDate: new Date(2025, 10, 1), Akash: 1634337, Asha: 2633038, Arunav: 3857811, Abhay: 647686, Anil: 65608, Khushboo: 979226, Manoj: 2520711 },
  { rawDate: new Date(2025, 11, 1), Akash: 1633883, Asha: 2839606, Arunav: 3840851, Abhay: 655356, Anil: 103960, Khushboo: 1072663, Manoj: 2573317 },
  { rawDate: new Date(2026, 0, 1), Akash: 1778743, Asha: 2899697, Arunav: 4004978, Abhay: 771120, Anil: 68706, Khushboo: 1029038, Manoj: 2375789 },
  { rawDate: new Date(2026, 1, 1), Akash: 1806007, Asha: 2952004, Arunav: 4185445, Abhay: 764104, Anil: 68706, Khushboo: 1191827, Manoj: 2682408 },
  { rawDate: new Date(2026, 2, 1), Akash: 1699929, Asha: 2970508, Arunav: 4078126, Abhay: 786614, Anil: 68706, Khushboo: 734943, Manoj: 2716123 },
  { rawDate: new Date(2026, 3, 1), Akash: 1759202, Asha: 3213105, Arunav: 4107642, Abhay: 789648, Anil: 156825, Khushboo: 755845, Manoj: 2649724 },
  { rawDate: new Date(2026, 4, 1), Akash: 1817877, Asha: 3096510, Arunav: 3999466, Abhay: 761815, Anil: 133606, Khushboo: 752605, Manoj: 2520626 },
  { rawDate: new Date(2026, 5, 1), Akash: 1752747, Asha: 3147589, Arunav: 4046132, Abhay: 657964, Anil: 161012, Khushboo: 750998, Manoj: 2691866 },
];


export const getLegacyCollectionsGrowth = async (cutoffDate, targetEmployeeEmail = null) => {
  const emailsToFetch = Object.values(LEGACY_KEY_TO_EMAIL);
  const users = await User.find({ email: { $in: emailsToFetch } });
  
  const emailToExactNameMap = {};
  users.forEach(u => {
    emailToExactNameMap[u.email] = u.name;
  });

  return RAW_HISTORICAL_GROWTH
    .filter((row) => row.rawDate < cutoffDate)
    .map((row) => {
      const shaped = {
        time: row.rawDate.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
        sortDate: row.rawDate,
        Global: 0
      };

      Object.entries(LEGACY_KEY_TO_EMAIL).forEach(([legacyKey, email]) => {
        if (targetEmployeeEmail && email !== targetEmployeeEmail) return;

        const exactDbName = emailToExactNameMap[email] || legacyKey;
        const val = row[legacyKey] || 0;

        shaped[exactDbName] = (shaped[exactDbName] || 0) + val;
        shaped.Global += val;
      });

      shaped.Global = Math.round(shaped.Global * 100) / 100;
      return shaped;
    });
};