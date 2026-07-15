const EMPLOYEE_IDENTITIES = [
  { email: "asha@fab5network.com", canonicalName: "Asha Jha", aliases: ["Asha", "Asha Jha"] },
  { email: "arunav@fab5network.com", canonicalName: "Arunav Moulik", aliases: ["Arunav Moulik"] },
  { email: "manoj@fab5network.com", canonicalName: "Manoj Tyagi", aliases: ["Manoj", "Manoj Tyagi", "Manoj Kumar Tyagi"] },
  { email: "anil@fab5network.com", canonicalName: "Anil Kumar Jha", aliases: ["Anil", "Anil Kumar Jha"] },
  { email: "khushboo@fab5network.com", canonicalName: "Khushboo Pandey", aliases: ["Khushboo", "Khushboo Pandey"] },
  { email: "akash@fab5network.com", canonicalName: "Akash Gupta", aliases: ["Akash", "Akash Gupta", "Akash Kumar"] },
  { email: "abhay@fab5network.com", canonicalName: "Abhay Singh", aliases: ["Abhay", "Abhay Singh", "Abhay Kumar Singh"] },
  { email: "info@fab5network.com", canonicalName: "Arunav", aliases: ["Arunav"] } // admin, distinct from Arunav Moulik
];

const NAME_TO_EMAIL = new Map();
EMPLOYEE_IDENTITIES.forEach(({ email, aliases }) => {
  aliases.forEach((alias) => NAME_TO_EMAIL.set(alias.trim().toLowerCase(), email));
});

const EMAIL_TO_CANONICAL = new Map(
  EMPLOYEE_IDENTITIES.map(({ email, canonicalName }) => [email, canonicalName])
);


export const resolveEmployeeName = (rawName) => {
  if (!rawName) return rawName;
  const email = NAME_TO_EMAIL.get(String(rawName).trim().toLowerCase());
  if (!email) return rawName;
  return EMAIL_TO_CANONICAL.get(email);
};

export const resolveEmployeeNameByEmail = (email) => {
  if (!email) return null;
  return EMAIL_TO_CANONICAL.get(String(email).trim().toLowerCase()) || null;
};

export { EMPLOYEE_IDENTITIES };
