import type { JobStatus } from "@/types/db";

export type DemoTechnician = {
  name: string;
  phone: string;
};

export type DemoLineItem = {
  name: string;
  price: number;
  quantity: number;
};

export type DemoJob = {
  customerName: string;
  phone: string;
  address: string;
  issue: string;
  problemDescription: string;
  status: JobStatus;
  urgency: "emergency" | "same_day" | "scheduled";
  source: "manual" | "intake" | "call";
  // Index into demoTechnicians array, or null if unassigned
  techIndex: number | null;
  // How long ago (in minutes) this job was created
  ageMinutes: number;
  // Quote line items — only include for statuses that would have a quote
  quote?: DemoLineItem[];
  // Quote status — only relevant when quote is present
  quoteStatus?: "sent" | "accepted";
};

export const demoTechnicians: DemoTechnician[] = [
  { name: "Mia Torres", phone: "+15551234567" },
  { name: "Leo Grant", phone: "+15557654321" },
  { name: "Avery Brooks", phone: "+15553459876" },
];

export const demoJobs: DemoJob[] = [
  // new — unassigned, just came in
  {
    customerName: "Riverside Dental",
    phone: "+15550010001",
    address: "240 Riverside Blvd",
    issue: "AC not cooling — patients complaining",
    problemDescription:
      "Main AC unit stopped cooling entirely. Office is getting warm. Patients scheduled all day.",
    status: "new",
    urgency: "emergency",
    source: "intake",
    techIndex: null,
    ageMinutes: 12,
  },
  {
    customerName: "Carmichael Home",
    phone: "+15550020002",
    address: "18 Carmichael Ct",
    issue: "Central heat not turning on",
    problemDescription:
      "Thermostat clicks but furnace doesn't start. No heat since last night.",
    status: "new",
    urgency: "same_day",
    source: "call",
    techIndex: null,
    ageMinutes: 55,
  },

  // assigned — tech notified, not yet en route
  {
    customerName: "Peak Fitness Studio",
    phone: "+15550030003",
    address: "900 Summit Ave",
    issue: "Rooftop unit cycling on and off",
    problemDescription:
      "RTU runs for about 3 minutes then shuts off. Repeating every 10 minutes. Class times affected.",
    status: "assigned",
    urgency: "same_day",
    source: "manual",
    techIndex: 0,
    ageMinutes: 95,
  },
  {
    customerName: "River Oaks Bakery",
    phone: "+15550040004",
    address: "45 River Oaks Dr",
    issue: "Walk-in cooler alarm triggered",
    problemDescription:
      "Walk-in cooler temperature alarm. Showing 48°F, set to 38°F. Perishables at risk.",
    status: "assigned",
    urgency: "emergency",
    source: "call",
    techIndex: 1,
    ageMinutes: 38,
  },

  // en_route — tech on the way
  {
    customerName: "Wilkins Family",
    phone: "+15550050005",
    address: "312 Wilkins Way",
    issue: "Furnace short cycling every few minutes",
    problemDescription:
      "Gas furnace starts, runs for 2–3 minutes, then shuts off. Happens repeatedly. House not reaching set temp.",
    status: "en_route",
    urgency: "same_day",
    source: "intake",
    techIndex: 2,
    ageMinutes: 140,
  },
  {
    customerName: "Bridgeview Pharmacy",
    phone: "+15550060006",
    address: "77 Bridgeview Rd",
    issue: "East zone not cooling — refrigeration section warm",
    problemDescription:
      "Refrigeration display cases in the east aisle running warm. Products at risk. No obvious breaker issue.",
    status: "en_route",
    urgency: "emergency",
    source: "call",
    techIndex: 0,
    ageMinutes: 190,
  },

  // in_progress — tech on site
  {
    customerName: "Harbor Point Restaurant",
    phone: "+15550070007",
    address: "1 Harbor Point Ln",
    issue: "Kitchen walk-in cooler down before dinner service",
    problemDescription:
      "Walk-in cooler compressor won't start. Dinner service in 3 hours. Food storage at risk.",
    status: "in_progress",
    urgency: "emergency",
    source: "call",
    techIndex: 1,
    ageMinutes: 175,
  },
  {
    customerName: "Miller Apartments",
    phone: "+15550080008",
    address: "501 Ash Blvd, Unit 4B",
    issue: "AC leak through ceiling tile in unit below",
    problemDescription:
      "Condensate draining through ceiling tiles in unit 3B from 4B above. Water damage visible.",
    status: "in_progress",
    urgency: "same_day",
    source: "intake",
    techIndex: 2,
    ageMinutes: 230,
  },

  // quote_pending — quote sent, waiting on customer
  {
    customerName: "Sunridge Office Park",
    phone: "+15550090009",
    address: "2200 Sunridge Pkwy",
    issue: "RTU diagnostic — compressor noise",
    problemDescription:
      "Rooftop unit making grinding noise on startup. Diagnosed: failing compressor bearing. Quote sent.",
    status: "quote_pending",
    urgency: "scheduled",
    source: "manual",
    techIndex: 0,
    ageMinutes: 350,
    quote: [
      { name: "RTU diagnostic", price: 179, quantity: 1 },
      { name: "Compressor bearing replacement", price: 490, quantity: 1 },
      { name: "Labor — compressor work", price: 145, quantity: 2 },
    ],
    quoteStatus: "sent",
  },
  {
    customerName: "Henderson Home",
    phone: "+15550100010",
    address: "88 Henderson Rd",
    issue: "AC not cooling — refrigerant low",
    problemDescription:
      "AC running but not reaching set temp. Coils iced. Refrigerant recharge needed after leak check.",
    status: "quote_pending",
    urgency: "same_day",
    source: "call",
    techIndex: 1,
    ageMinutes: 410,
    quote: [
      { name: "Leak detection", price: 129, quantity: 1 },
      { name: "Refrigerant recharge (R-410A)", price: 95, quantity: 2 },
      { name: "Evaporator coil inspection", price: 85, quantity: 1 },
    ],
    quoteStatus: "sent",
  },

  // completed — closed with accepted quote
  {
    customerName: "Westview Senior Center",
    phone: "+15550110011",
    address: "400 Westview Blvd",
    issue: "Common area HVAC not responding to thermostat",
    problemDescription:
      "Thermostat in lobby had failed. Replaced control board and thermostat. System operational.",
    status: "completed",
    urgency: "scheduled",
    source: "intake",
    techIndex: 2,
    ageMinutes: 480,
    quote: [
      { name: "Thermostat replacement", price: 220, quantity: 1 },
      { name: "Control board swap", price: 310, quantity: 1 },
      { name: "Labor", price: 110, quantity: 1 },
    ],
    quoteStatus: "accepted",
  },
  {
    customerName: "Downtown Cafe",
    phone: "+15550120012",
    address: "15 Main Street",
    issue: "Emergency — AC down during afternoon rush",
    problemDescription:
      "Capacitor failure on main AC unit. Replaced capacitor and tested system. Fully restored.",
    status: "completed",
    urgency: "emergency",
    source: "call",
    techIndex: 0,
    ageMinutes: 590,
    quote: [
      { name: "Emergency callout fee", price: 150, quantity: 1 },
      { name: "Capacitor replacement", price: 180, quantity: 1 },
      { name: "System test and commissioning", price: 75, quantity: 1 },
    ],
    quoteStatus: "accepted",
  },

  // no_access — tech couldn't reach the site
  {
    customerName: "Pine Glen Condos",
    phone: "+15550130013",
    address: "55 Pine Glen Dr, Unit 8",
    issue: "AC not cooling — unit inaccessible",
    problemDescription:
      "Tenant did not answer. Maintenance coordinator unavailable. Rescheduling required.",
    status: "no_access",
    urgency: "scheduled",
    source: "manual",
    techIndex: 1,
    ageMinutes: 290,
  },

  // cancelled
  {
    customerName: "Hartwell Retail",
    phone: "+15550140014",
    address: "800 Hartwell Center Dr",
    issue: "HVAC inspection request — cancelled by customer",
    problemDescription: "Customer called to cancel before dispatch.",
    status: "cancelled",
    urgency: "scheduled",
    source: "call",
    techIndex: null,
    ageMinutes: 220,
  },
];
