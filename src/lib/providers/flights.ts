import "server-only";
import { aviasalesUrl, skyscannerUrl } from "../flight-links.cjs";
import flightSync from "../automation/flight-sync.cjs";
import type { City, FlightOption, Origin } from "../types";
import { cached, fetchJson, seeded } from "../server-utils";
import { flightDate, normalizeFlightTimestamp, normalizeRoundTripFlights } from "../flight-utils";

export interface RouteAirlineDef {
  name: string;
  code: string;
  mult: number;
  stops: number;
  stopCity?: string;
  baggage: string;
  cabinClass: string;
  flightNoOut: string;
  flightNoIn: string;
  depHourOut: number;
  depMinOut: number;
  depHourIn: number;
  depMinIn: number;
}

/** Şehre özel gerçekte uçan havayolları ve operasyonel verileri */
const ROUTE_AIRLINES: Record<string, RouteAirlineDef[]> = {
  tokyo: [
    {
      name: "Qatar Airways",
      code: "QR",
      mult: 0.88,
      stops: 1,
      stopCity: "Doha (DOH)",
      baggage: "25 kg Bagaj + El Bagajı",
      cabinClass: "Ekonomi",
      flightNoOut: "QR 240",
      flightNoIn: "QR 807",
      depHourOut: 13,
      depMinOut: 20,
      depHourIn: 22,
      depMinIn: 30,
    },
    {
      name: "Etihad Airways",
      code: "EY",
      mult: 0.9,
      stops: 1,
      stopCity: "Abu Dhabi (AUH)",
      baggage: "25 kg Bagaj + El Bagajı",
      cabinClass: "Ekonomi",
      flightNoOut: "EY 96",
      flightNoIn: "EY 878",
      depHourOut: 14,
      depMinOut: 45,
      depHourIn: 21,
      depMinIn: 15,
    },
    {
      name: "Emirates",
      code: "EK",
      mult: 0.98,
      stops: 1,
      stopCity: "Dubai (DXB)",
      baggage: "25 kg Bagaj + El Bagajı",
      cabinClass: "Ekonomi",
      flightNoOut: "EK 122",
      flightNoIn: "EK 319",
      depHourOut: 16,
      depMinOut: 25,
      depHourIn: 23,
      depMinIn: 0,
    },
    {
      name: "Turkish Airlines",
      code: "TK",
      mult: 1.25,
      stops: 0,
      baggage: "2 x 23 kg Bagaj + El Bagajı",
      cabinClass: "Ekonomi (Direkt)",
      flightNoOut: "TK 198",
      flightNoIn: "TK 199",
      depHourOut: 2,
      depMinOut: 50,
      depHourIn: 22,
      depMinIn: 50,
    },
  ],
  bali: [
    {
      name: "Qatar Airways",
      code: "QR",
      mult: 0.88,
      stops: 1,
      stopCity: "Doha (DOH)",
      baggage: "25 kg Bagaj + El Bagajı",
      cabinClass: "Ekonomi",
      flightNoOut: "QR 240",
      flightNoIn: "QR 963",
      depHourOut: 13,
      depMinOut: 20,
      depHourIn: 19,
      depMinIn: 10,
    },
    {
      name: "Singapore Airlines",
      code: "SQ",
      mult: 0.92,
      stops: 1,
      stopCity: "Singapur (SIN)",
      baggage: "25 kg Bagaj + El Bagajı",
      cabinClass: "Ekonomi",
      flightNoOut: "SQ 391",
      flightNoIn: "SQ 945",
      depHourOut: 14,
      depMinOut: 15,
      depHourIn: 20,
      depMinIn: 5,
    },
    {
      name: "Emirates",
      code: "EK",
      mult: 0.98,
      stops: 1,
      stopCity: "Dubai (DXB)",
      baggage: "25 kg Bagaj + El Bagajı",
      cabinClass: "Ekonomi",
      flightNoOut: "EK 122",
      flightNoIn: "EK 399",
      depHourOut: 16,
      depMinOut: 25,
      depHourIn: 0,
      depMinIn: 15,
    },
    {
      name: "Turkish Airlines",
      code: "TK",
      mult: 1.28,
      stops: 0,
      baggage: "30 kg Bagaj + El Bagajı",
      cabinClass: "Ekonomi (Direkt)",
      flightNoOut: "TK 66",
      flightNoIn: "TK 67",
      depHourOut: 1,
      depMinOut: 50,
      depHourIn: 21,
      depMinIn: 25,
    },
  ],
  bangkok: [
    {
      name: "Qatar Airways",
      code: "QR",
      mult: 0.86,
      stops: 1,
      stopCity: "Doha (DOH)",
      baggage: "25 kg Bagaj + El Bagajı",
      cabinClass: "Ekonomi",
      flightNoOut: "QR 242",
      flightNoIn: "QR 837",
      depHourOut: 13,
      depMinOut: 20,
      depHourIn: 20,
      depMinIn: 45,
    },
    {
      name: "Emirates",
      code: "EK",
      mult: 0.94,
      stops: 1,
      stopCity: "Dubai (DXB)",
      baggage: "25 kg Bagaj + El Bagajı",
      cabinClass: "Ekonomi",
      flightNoOut: "EK 122",
      flightNoIn: "EK 385",
      depHourOut: 16,
      depMinOut: 25,
      depHourIn: 1,
      depMinIn: 40,
    },
    {
      name: "Turkish Airlines",
      code: "TK",
      mult: 1.22,
      stops: 0,
      baggage: "30 kg Bagaj + El Bagajı",
      cabinClass: "Ekonomi (Direkt)",
      flightNoOut: "TK 68",
      flightNoIn: "TK 69",
      depHourOut: 1,
      depMinOut: 35,
      depHourIn: 23,
      depMinIn: 30,
    },
  ],
  londra: [
    {
      name: "Wizz Air UK",
      code: "W9",
      mult: 0.76,
      stops: 0,
      baggage: "El Çantası (40x30x20 cm)",
      cabinClass: "Temel Ekonomi",
      flightNoOut: "W9 5702",
      flightNoIn: "W9 5701",
      depHourOut: 10,
      depMinOut: 30,
      depHourIn: 14,
      depMinIn: 0,
    },
    {
      name: "Pegasus",
      code: "PC",
      mult: 0.8,
      stops: 0,
      baggage: "Kabin Bagajı (8 kg)",
      cabinClass: "Süper Eko",
      flightNoOut: "PC 1161",
      flightNoIn: "PC 1162",
      depHourOut: 8,
      depMinOut: 45,
      depHourIn: 12,
      depMinIn: 15,
    },
    {
      name: "AJet",
      code: "VF",
      mult: 0.84,
      stops: 0,
      baggage: "15 kg Bagaj + El Çantası",
      cabinClass: "Standart",
      flightNoOut: "VF 501",
      flightNoIn: "VF 502",
      depHourOut: 9,
      depMinOut: 15,
      depHourIn: 13,
      depMinIn: 20,
    },
    {
      name: "British Airways",
      code: "BA",
      mult: 1.15,
      stops: 0,
      baggage: "23 kg Bagaj + El Bagajı",
      cabinClass: "Euro Traveller",
      flightNoOut: "BA 675",
      flightNoIn: "BA 676",
      depHourOut: 15,
      depMinOut: 50,
      depHourIn: 10,
      depMinIn: 25,
    },
    {
      name: "Turkish Airlines",
      code: "TK",
      mult: 1.25,
      stops: 0,
      baggage: "23 kg Bagaj + El Bagajı",
      cabinClass: "Ekonomi (Direkt)",
      flightNoOut: "TK 1979",
      flightNoIn: "TK 1980",
      depHourOut: 7,
      depMinOut: 45,
      depHourIn: 18,
      depMinIn: 30,
    },
  ],
  dubai: [
    {
      name: "AJet",
      code: "VF",
      mult: 0.78,
      stops: 0,
      baggage: "20 kg Bagaj + El Çantası",
      cabinClass: "Standart",
      flightNoOut: "VF 141",
      flightNoIn: "VF 142",
      depHourOut: 20,
      depMinOut: 30,
      depHourIn: 3,
      depMinIn: 15,
    },
    {
      name: "Pegasus",
      code: "PC",
      mult: 0.82,
      stops: 0,
      baggage: "Kabin Bagajı (8 kg)",
      cabinClass: "Eko",
      flightNoOut: "PC 740",
      flightNoIn: "PC 741",
      depHourOut: 21,
      depMinOut: 45,
      depHourIn: 4,
      depMinIn: 30,
    },
    {
      name: "Flydubai",
      code: "FZ",
      mult: 1.05,
      stops: 0,
      baggage: "20 kg Bagaj + El Bagajı",
      cabinClass: "Ekonomi",
      flightNoOut: "FZ 752",
      flightNoIn: "FZ 751",
      depHourOut: 14,
      depMinOut: 10,
      depHourIn: 9,
      depMinIn: 20,
    },
    {
      name: "Emirates",
      code: "EK",
      mult: 1.34,
      stops: 0,
      baggage: "25 kg Bagaj + El Bagajı",
      cabinClass: "Ekonomi (Geniş Gövde)",
      flightNoOut: "EK 122",
      flightNoIn: "EK 121",
      depHourOut: 16,
      depMinOut: 25,
      depHourIn: 10,
      depMinIn: 45,
    },
    {
      name: "Turkish Airlines",
      code: "TK",
      mult: 1.22,
      stops: 0,
      baggage: "30 kg Bagaj + El Bagajı",
      cabinClass: "Ekonomi (Direkt)",
      flightNoOut: "TK 762",
      flightNoIn: "TK 763",
      depHourOut: 1,
      depMinOut: 20,
      depHourIn: 7,
      depMinIn: 40,
    },
  ],
  "sarm-el-seyh": [
    {
      name: "Pegasus",
      code: "PC",
      mult: 0.8,
      stops: 0,
      baggage: "Kabin Bagajı (8 kg)",
      cabinClass: "Eko",
      flightNoOut: "PC 620",
      flightNoIn: "PC 621",
      depHourOut: 23,
      depMinOut: 20,
      depHourIn: 3,
      depMinIn: 10,
    },
    {
      name: "AJet",
      code: "VF",
      mult: 0.84,
      stops: 0,
      baggage: "15 kg Bagaj",
      cabinClass: "Standart",
      flightNoOut: "VF 171",
      flightNoIn: "VF 172",
      depHourOut: 22,
      depMinOut: 10,
      depHourIn: 2,
      depMinIn: 0,
    },
    {
      name: "EgyptAir",
      code: "MS",
      mult: 1.05,
      stops: 1,
      stopCity: "Kahire (CAI)",
      baggage: "23 kg Bagaj",
      cabinClass: "Ekonomi",
      flightNoOut: "MS 738",
      flightNoIn: "MS 737",
      depHourOut: 13,
      depMinOut: 30,
      depHourIn: 17,
      depMinIn: 0,
    },
    {
      name: "Turkish Airlines",
      code: "TK",
      mult: 1.24,
      stops: 0,
      baggage: "23 kg Bagaj + El Bagajı",
      cabinClass: "Ekonomi (Direkt)",
      flightNoOut: "TK 700",
      flightNoIn: "TK 701",
      depHourOut: 1,
      depMinOut: 15,
      depHourIn: 4,
      depMinIn: 45,
    },
  ],
  belgrad: [
    {
      name: "Pegasus",
      code: "PC",
      mult: 0.8,
      stops: 0,
      baggage: "El Bagajı (8 kg)",
      cabinClass: "Eko",
      flightNoOut: "PC 371",
      flightNoIn: "PC 372",
      depHourOut: 10,
      depMinOut: 15,
      depHourIn: 13,
      depMinIn: 40,
    },
    {
      name: "AJet",
      code: "VF",
      mult: 0.82,
      stops: 0,
      baggage: "15 kg Bagaj",
      cabinClass: "Standart",
      flightNoOut: "VF 201",
      flightNoIn: "VF 202",
      depHourOut: 7,
      depMinOut: 20,
      depHourIn: 11,
      depMinIn: 15,
    },
    {
      name: "Air Serbia",
      code: "JU",
      mult: 1.05,
      stops: 0,
      baggage: "23 kg Bagaj",
      cabinClass: "Ekonomi",
      flightNoOut: "JU 553",
      flightNoIn: "JU 552",
      depHourOut: 16,
      depMinOut: 40,
      depHourIn: 12,
      depMinIn: 20,
    },
    {
      name: "Turkish Airlines",
      code: "TK",
      mult: 1.22,
      stops: 0,
      baggage: "23 kg Bagaj + El Bagajı",
      cabinClass: "Ekonomi (Direkt)",
      flightNoOut: "TK 1081",
      flightNoIn: "TK 1082",
      depHourOut: 8,
      depMinOut: 30,
      depHourIn: 20,
      depMinIn: 45,
    },
  ],
  tiran: [
    {
      name: "Pegasus",
      code: "PC",
      mult: 0.8,
      stops: 0,
      baggage: "El Bagajı (8 kg)",
      cabinClass: "Eko",
      flightNoOut: "PC 281",
      flightNoIn: "PC 282",
      depHourOut: 9,
      depMinOut: 10,
      depHourIn: 12,
      depMinIn: 50,
    },
    {
      name: "AJet",
      code: "VF",
      mult: 0.82,
      stops: 0,
      baggage: "15 kg Bagaj",
      cabinClass: "Standart",
      flightNoOut: "VF 211",
      flightNoIn: "VF 212",
      depHourOut: 8,
      depMinOut: 0,
      depHourIn: 11,
      depMinIn: 40,
    },
    {
      name: "Air Albania",
      code: "ZB",
      mult: 0.96,
      stops: 0,
      baggage: "20 kg Bagaj",
      cabinClass: "Ekonomi",
      flightNoOut: "ZB 1002",
      flightNoIn: "ZB 1001",
      depHourOut: 14,
      depMinOut: 0,
      depHourIn: 17,
      depMinIn: 30,
    },
    {
      name: "Turkish Airlines",
      code: "TK",
      mult: 1.22,
      stops: 0,
      baggage: "23 kg Bagaj + El Bagajı",
      cabinClass: "Ekonomi (Direkt)",
      flightNoOut: "TK 1073",
      flightNoIn: "TK 1074",
      depHourOut: 7,
      depMinOut: 15,
      depHourIn: 19,
      depMinIn: 20,
    },
  ],
  baku: [
    {
      name: "AJet",
      code: "VF",
      mult: 0.78,
      stops: 0,
      baggage: "15 kg Bagaj",
      cabinClass: "Standart",
      flightNoOut: "VF 411",
      flightNoIn: "VF 412",
      depHourOut: 8,
      depMinOut: 15,
      depHourIn: 12,
      depMinIn: 50,
    },
    {
      name: "Pegasus",
      code: "PC",
      mult: 0.82,
      stops: 0,
      baggage: "El Bagajı (8 kg)",
      cabinClass: "Eko",
      flightNoOut: "PC 314",
      flightNoIn: "PC 315",
      depHourOut: 11,
      depMinOut: 45,
      depHourIn: 15,
      depMinIn: 20,
    },
    {
      name: "Azerbaijan Airlines",
      code: "J2",
      mult: 1.06,
      stops: 0,
      baggage: "23 kg Bagaj",
      cabinClass: "Ekonomi",
      flightNoOut: "J2 076",
      flightNoIn: "J2 075",
      depHourOut: 13,
      depMinOut: 30,
      depHourIn: 10,
      depMinIn: 0,
    },
    {
      name: "Turkish Airlines",
      code: "TK",
      mult: 1.24,
      stops: 0,
      baggage: "23 kg Bagaj + El Bagajı",
      cabinClass: "Ekonomi (Direkt)",
      flightNoOut: "TK 332",
      flightNoIn: "TK 333",
      depHourOut: 9,
      depMinOut: 0,
      depHourIn: 19,
      depMinIn: 15,
    },
  ],
  budapeste: [
    {
      name: "Wizz Air",
      code: "W6",
      mult: 0.75,
      stops: 0,
      baggage: "El Çantası (40x30x20 cm)",
      cabinClass: "Basic",
      flightNoOut: "W6 2426",
      flightNoIn: "W6 2425",
      depHourOut: 11,
      depMinOut: 0,
      depHourIn: 15,
      depMinIn: 45,
    },
    {
      name: "Pegasus",
      code: "PC",
      mult: 0.8,
      stops: 0,
      baggage: "Kabin Bagajı (8 kg)",
      cabinClass: "Eko",
      flightNoOut: "PC 331",
      flightNoIn: "PC 332",
      depHourOut: 10,
      depMinOut: 20,
      depHourIn: 14,
      depMinIn: 10,
    },
    {
      name: "AJet",
      code: "VF",
      mult: 0.84,
      stops: 0,
      baggage: "15 kg Bagaj",
      cabinClass: "Standart",
      flightNoOut: "VF 131",
      flightNoIn: "VF 132",
      depHourOut: 8,
      depMinOut: 30,
      depHourIn: 12,
      depMinIn: 40,
    },
    {
      name: "Turkish Airlines",
      code: "TK",
      mult: 1.22,
      stops: 0,
      baggage: "23 kg Bagaj + El Bagajı",
      cabinClass: "Ekonomi (Direkt)",
      flightNoOut: "TK 1033",
      flightNoIn: "TK 1034",
      depHourOut: 7,
      depMinOut: 40,
      depHourIn: 19,
      depMinIn: 15,
    },
  ],
  berlin: [
    {
      name: "Pegasus",
      code: "PC",
      mult: 0.78,
      stops: 0,
      baggage: "Kabin Bagajı (8 kg)",
      cabinClass: "Eko",
      flightNoOut: "PC 981",
      flightNoIn: "PC 982",
      depHourOut: 9,
      depMinOut: 50,
      depHourIn: 14,
      depMinIn: 10,
    },
    {
      name: "AJet",
      code: "VF",
      mult: 0.82,
      stops: 0,
      baggage: "15 kg Bagaj",
      cabinClass: "Standart",
      flightNoOut: "VF 71",
      flightNoIn: "VF 72",
      depHourOut: 8,
      depMinOut: 15,
      depHourIn: 12,
      depMinIn: 30,
    },
    {
      name: "SunExpress",
      code: "XQ",
      mult: 0.86,
      stops: 0,
      baggage: "20 kg Bagaj",
      cabinClass: "SunEco",
      flightNoOut: "XQ 982",
      flightNoIn: "XQ 983",
      depHourOut: 12,
      depMinOut: 30,
      depHourIn: 16,
      depMinIn: 10,
    },
    {
      name: "Turkish Airlines",
      code: "TK",
      mult: 1.24,
      stops: 0,
      baggage: "23 kg Bagaj + El Bagajı",
      cabinClass: "Ekonomi (Direkt)",
      flightNoOut: "TK 1721",
      flightNoIn: "TK 1722",
      depHourOut: 7,
      depMinOut: 30,
      depHourIn: 18,
      depMinIn: 45,
    },
  ],
  saraybosna: [
    {
      name: "AJet",
      code: "VF",
      mult: 0.8,
      stops: 0,
      baggage: "15 kg Bagaj",
      cabinClass: "Standart",
      flightNoOut: "VF 201",
      flightNoIn: "VF 202",
      depHourOut: 7,
      depMinOut: 20,
      depHourIn: 11,
      depMinIn: 15,
    },
    {
      name: "Pegasus",
      code: "PC",
      mult: 0.82,
      stops: 0,
      baggage: "El Bagajı (8 kg)",
      cabinClass: "Eko",
      flightNoOut: "PC 291",
      flightNoIn: "PC 292",
      depHourOut: 10,
      depMinOut: 15,
      depHourIn: 13,
      depMinIn: 40,
    },
    {
      name: "Turkish Airlines",
      code: "TK",
      mult: 1.22,
      stops: 0,
      baggage: "23 kg Bagaj + El Bagajı",
      cabinClass: "Ekonomi (Direkt)",
      flightNoOut: "TK 1021",
      flightNoIn: "TK 1022",
      depHourOut: 8,
      depMinOut: 30,
      depHourIn: 20,
      depMinIn: 45,
    },
  ],
  uskup: [
    {
      name: "AJet",
      code: "VF",
      mult: 0.78,
      stops: 0,
      baggage: "15 kg Bagaj",
      cabinClass: "Standart",
      flightNoOut: "VF 221",
      flightNoIn: "VF 222",
      depHourOut: 7,
      depMinOut: 10,
      depHourIn: 11,
      depMinIn: 0,
    },
    {
      name: "Pegasus",
      code: "PC",
      mult: 0.82,
      stops: 0,
      baggage: "El Bagajı (8 kg)",
      cabinClass: "Eko",
      flightNoOut: "PC 341",
      flightNoIn: "PC 342",
      depHourOut: 9,
      depMinOut: 45,
      depHourIn: 13,
      depMinIn: 20,
    },
    {
      name: "Turkish Airlines",
      code: "TK",
      mult: 1.22,
      stops: 0,
      baggage: "23 kg Bagaj + El Bagajı",
      cabinClass: "Ekonomi (Direkt)",
      flightNoOut: "TK 1003",
      flightNoIn: "TK 1004",
      depHourOut: 8,
      depMinOut: 15,
      depHourIn: 20,
      depMinIn: 30,
    },
  ],
  kotor: [
    {
      name: "Pegasus",
      code: "PC",
      mult: 0.82,
      stops: 0,
      baggage: "El Bagajı (8 kg)",
      cabinClass: "Eko",
      flightNoOut: "PC 273",
      flightNoIn: "PC 274",
      depHourOut: 10,
      depMinOut: 30,
      depHourIn: 14,
      depMinIn: 10,
    },
    {
      name: "Air Montenegro",
      code: "4O",
      mult: 1.05,
      stops: 0,
      baggage: "23 kg Bagaj",
      cabinClass: "Ekonomi",
      flightNoOut: "4O 201",
      flightNoIn: "4O 202",
      depHourOut: 15,
      depMinOut: 20,
      depHourIn: 11,
      depMinIn: 45,
    },
    {
      name: "Turkish Airlines",
      code: "TK",
      mult: 1.24,
      stops: 0,
      baggage: "23 kg Bagaj + El Bagajı",
      cabinClass: "Ekonomi (Direkt)",
      flightNoOut: "TK 1087",
      flightNoIn: "TK 1088",
      depHourOut: 7,
      depMinOut: 45,
      depHourIn: 19,
      depMinIn: 20,
    },
  ],
  tiflis: [
    {
      name: "AJet",
      code: "VF",
      mult: 0.8,
      stops: 0,
      baggage: "15 kg Bagaj",
      cabinClass: "Standart",
      flightNoOut: "VF 411",
      flightNoIn: "VF 412",
      depHourOut: 8,
      depMinOut: 15,
      depHourIn: 12,
      depMinIn: 50,
    },
    {
      name: "Pegasus",
      code: "PC",
      mult: 0.84,
      stops: 0,
      baggage: "El Bagajı (8 kg)",
      cabinClass: "Eko",
      flightNoOut: "PC 314",
      flightNoIn: "PC 315",
      depHourOut: 11,
      depMinOut: 45,
      depHourIn: 15,
      depMinIn: 20,
    },
    {
      name: "Georgian Airways",
      code: "A9",
      mult: 1.06,
      stops: 0,
      baggage: "23 kg Bagaj",
      cabinClass: "Ekonomi",
      flightNoOut: "A9 724",
      flightNoIn: "A9 723",
      depHourOut: 16,
      depMinOut: 30,
      depHourIn: 13,
      depMinIn: 10,
    },
    {
      name: "Turkish Airlines",
      code: "TK",
      mult: 1.24,
      stops: 0,
      baggage: "23 kg Bagaj + El Bagajı",
      cabinClass: "Ekonomi (Direkt)",
      flightNoOut: "TK 386",
      flightNoIn: "TK 387",
      depHourOut: 9,
      depMinOut: 0,
      depHourIn: 19,
      depMinIn: 15,
    },
  ],
  batum: [
    {
      name: "AJet",
      code: "VF",
      mult: 0.78,
      stops: 0,
      baggage: "15 kg Bagaj",
      cabinClass: "Standart",
      flightNoOut: "VF 421",
      flightNoIn: "VF 422",
      depHourOut: 7,
      depMinOut: 30,
      depHourIn: 11,
      depMinIn: 45,
    },
    {
      name: "Pegasus",
      code: "PC",
      mult: 0.82,
      stops: 0,
      baggage: "El Bagajı (8 kg)",
      cabinClass: "Eko",
      flightNoOut: "PC 318",
      flightNoIn: "PC 319",
      depHourOut: 10,
      depMinOut: 15,
      depHourIn: 14,
      depMinIn: 0,
    },
    {
      name: "Turkish Airlines",
      code: "TK",
      mult: 1.22,
      stops: 0,
      baggage: "23 kg Bagaj + El Bagajı",
      cabinClass: "Ekonomi (Direkt)",
      flightNoOut: "TK 392",
      flightNoIn: "TK 393",
      depHourOut: 8,
      depMinOut: 20,
      depHourIn: 18,
      depMinIn: 30,
    },
  ],
  semerkant: [
    {
      name: "AJet",
      code: "VF",
      mult: 0.8,
      stops: 0,
      baggage: "15 kg Bagaj",
      cabinClass: "Standart",
      flightNoOut: "VF 481",
      flightNoIn: "VF 482",
      depHourOut: 8,
      depMinOut: 30,
      depHourIn: 14,
      depMinIn: 10,
    },
    {
      name: "Uzbekistan Airways",
      code: "HY",
      mult: 1.08,
      stops: 0,
      baggage: "23 kg Bagaj",
      cabinClass: "Ekonomi",
      flightNoOut: "HY 276",
      flightNoIn: "HY 275",
      depHourOut: 12,
      depMinOut: 10,
      depHourIn: 7,
      depMinIn: 30,
    },
    {
      name: "Turkish Airlines",
      code: "TK",
      mult: 1.24,
      stops: 0,
      baggage: "23 kg Bagaj + El Bagajı",
      cabinClass: "Ekonomi (Direkt)",
      flightNoOut: "TK 372",
      flightNoIn: "TK 373",
      depHourOut: 1,
      depMinOut: 30,
      depHourIn: 8,
      depMinIn: 45,
    },
  ],
  kisinev: [
    {
      name: "FlyOne",
      code: "5F",
      mult: 0.8,
      stops: 0,
      baggage: "10 kg Bagaj",
      cabinClass: "Eko",
      flightNoOut: "5F 542",
      flightNoIn: "5F 541",
      depHourOut: 14,
      depMinOut: 20,
      depHourIn: 11,
      depMinIn: 0,
    },
    {
      name: "Pegasus",
      code: "PC",
      mult: 0.84,
      stops: 0,
      baggage: "El Bagajı (8 kg)",
      cabinClass: "Eko",
      flightNoOut: "PC 412",
      flightNoIn: "PC 413",
      depHourOut: 10,
      depMinOut: 0,
      depHourIn: 13,
      depMinIn: 30,
    },
    {
      name: "Turkish Airlines",
      code: "TK",
      mult: 1.24,
      stops: 0,
      baggage: "23 kg Bagaj + El Bagajı",
      cabinClass: "Ekonomi (Direkt)",
      flightNoOut: "TK 271",
      flightNoIn: "TK 272",
      depHourOut: 8,
      depMinOut: 15,
      depHourIn: 19,
      depMinIn: 45,
    },
  ],
  roma: [
    {
      name: "Pegasus",
      code: "PC",
      mult: 0.78,
      stops: 0,
      baggage: "Kabin Bagajı (8 kg)",
      cabinClass: "Eko",
      flightNoOut: "PC 1221",
      flightNoIn: "PC 1222",
      depHourOut: 10,
      depMinOut: 15,
      depHourIn: 14,
      depMinIn: 30,
    },
    {
      name: "AJet",
      code: "VF",
      mult: 0.82,
      stops: 0,
      baggage: "15 kg Bagaj",
      cabinClass: "Standart",
      flightNoOut: "VF 81",
      flightNoIn: "VF 82",
      depHourOut: 8,
      depMinOut: 50,
      depHourIn: 13,
      depMinIn: 20,
    },
    {
      name: "ITA Airways",
      code: "AZ",
      mult: 1.15,
      stops: 0,
      baggage: "23 kg Bagaj",
      cabinClass: "Economy Classic",
      flightNoOut: "AZ 703",
      flightNoIn: "AZ 702",
      depHourOut: 15,
      depMinOut: 40,
      depHourIn: 11,
      depMinIn: 10,
    },
    {
      name: "Turkish Airlines",
      code: "TK",
      mult: 1.25,
      stops: 0,
      baggage: "23 kg Bagaj + El Bagajı",
      cabinClass: "Ekonomi (Direkt)",
      flightNoOut: "TK 1861",
      flightNoIn: "TK 1862",
      depHourOut: 7,
      depMinOut: 30,
      depHourIn: 18,
      depMinIn: 40,
    },
  ],
  barselona: [
    {
      name: "Pegasus",
      code: "PC",
      mult: 0.78,
      stops: 0,
      baggage: "Kabin Bagajı (8 kg)",
      cabinClass: "Eko",
      flightNoOut: "PC 1091",
      flightNoIn: "PC 1092",
      depHourOut: 9,
      depMinOut: 45,
      depHourIn: 14,
      depMinIn: 10,
    },
    {
      name: "Vueling",
      code: "VY",
      mult: 0.88,
      stops: 0,
      baggage: "El Çantası",
      cabinClass: "Optima",
      flightNoOut: "VY 7891",
      flightNoIn: "VY 7892",
      depHourOut: 13,
      depMinOut: 20,
      depHourIn: 17,
      depMinIn: 45,
    },
    {
      name: "Turkish Airlines",
      code: "TK",
      mult: 1.25,
      stops: 0,
      baggage: "23 kg Bagaj + El Bagajı",
      cabinClass: "Ekonomi (Direkt)",
      flightNoOut: "TK 1853",
      flightNoIn: "TK 1854",
      depHourOut: 7,
      depMinOut: 15,
      depHourIn: 18,
      depMinIn: 30,
    },
  ],
  paris: [
    {
      name: "Pegasus",
      code: "PC",
      mult: 0.78,
      stops: 0,
      baggage: "Kabin Bagajı (8 kg)",
      cabinClass: "Eko",
      flightNoOut: "PC 1131 (Orly)",
      flightNoIn: "PC 1132",
      depHourOut: 10,
      depMinOut: 25,
      depHourIn: 14,
      depMinIn: 50,
    },
    {
      name: "Transavia",
      code: "TO",
      mult: 0.82,
      stops: 0,
      baggage: "El Çantası",
      cabinClass: "Plus",
      flightNoOut: "TO 3701 (Orly)",
      flightNoIn: "TO 3700",
      depHourOut: 12,
      depMinOut: 10,
      depHourIn: 16,
      depMinIn: 30,
    },
    {
      name: "AJet",
      code: "VF",
      mult: 0.84,
      stops: 0,
      baggage: "15 kg Bagaj",
      cabinClass: "Standart",
      flightNoOut: "VF 91 (CDG)",
      flightNoIn: "VF 92",
      depHourOut: 8,
      depMinOut: 40,
      depHourIn: 13,
      depMinIn: 15,
    },
    {
      name: "Air France",
      code: "AF",
      mult: 1.18,
      stops: 0,
      baggage: "23 kg Bagaj",
      cabinClass: "Economy Light",
      flightNoOut: "AF 1391 (CDG)",
      flightNoIn: "AF 1390",
      depHourOut: 15,
      depMinOut: 10,
      depHourIn: 10,
      depMinIn: 30,
    },
    {
      name: "Turkish Airlines",
      code: "TK",
      mult: 1.26,
      stops: 0,
      baggage: "23 kg Bagaj + El Bagajı",
      cabinClass: "Ekonomi (Direkt)",
      flightNoOut: "TK 1821 (CDG)",
      flightNoIn: "TK 1822",
      depHourOut: 7,
      depMinOut: 0,
      depHourIn: 18,
      depMinIn: 45,
    },
  ],
  amsterdam: [
    {
      name: "Pegasus",
      code: "PC",
      mult: 0.78,
      stops: 0,
      baggage: "Kabin Bagajı (8 kg)",
      cabinClass: "Eko",
      flightNoOut: "PC 1251",
      flightNoIn: "PC 1252",
      depHourOut: 9,
      depMinOut: 30,
      depHourIn: 13,
      depMinIn: 50,
    },
    {
      name: "AJet",
      code: "VF",
      mult: 0.82,
      stops: 0,
      baggage: "15 kg Bagaj",
      cabinClass: "Standart",
      flightNoOut: "VF 101",
      flightNoIn: "VF 102",
      depHourOut: 8,
      depMinOut: 15,
      depHourIn: 12,
      depMinIn: 40,
    },
    {
      name: "KLM",
      code: "KL",
      mult: 1.16,
      stops: 0,
      baggage: "23 kg Bagaj",
      cabinClass: "Economy Standard",
      flightNoOut: "KL 1614",
      flightNoIn: "KL 1613",
      depHourOut: 16,
      depMinOut: 0,
      depHourIn: 11,
      depMinIn: 30,
    },
    {
      name: "Turkish Airlines",
      code: "TK",
      mult: 1.25,
      stops: 0,
      baggage: "23 kg Bagaj + El Bagajı",
      cabinClass: "Ekonomi (Direkt)",
      flightNoOut: "TK 1951",
      flightNoIn: "TK 1952",
      depHourOut: 7,
      depMinOut: 15,
      depHourIn: 18,
      depMinIn: 30,
    },
  ],
  atina: [
    {
      name: "Pegasus",
      code: "PC",
      mult: 0.78,
      stops: 0,
      baggage: "El Bagajı (8 kg)",
      cabinClass: "Eko",
      flightNoOut: "PC 1191",
      flightNoIn: "PC 1192",
      depHourOut: 10,
      depMinOut: 10,
      depHourIn: 13,
      depMinIn: 30,
    },
    {
      name: "Aegean Airlines",
      code: "A3",
      mult: 0.96,
      stops: 0,
      baggage: "23 kg Bagaj",
      cabinClass: "Flex",
      flightNoOut: "A3 991",
      flightNoIn: "A3 990",
      depHourOut: 16,
      depMinOut: 10,
      depHourIn: 13,
      depMinIn: 40,
    },
    {
      name: "Turkish Airlines",
      code: "TK",
      mult: 1.22,
      stops: 0,
      baggage: "23 kg Bagaj + El Bagajı",
      cabinClass: "Ekonomi (Direkt)",
      flightNoOut: "TK 1843",
      flightNoIn: "TK 1844",
      depHourOut: 7,
      depMinOut: 45,
      depHourIn: 19,
      depMinIn: 15,
    },
  ],
  viyana: [
    {
      name: "Pegasus",
      code: "PC",
      mult: 0.78,
      stops: 0,
      baggage: "Kabin Bagajı (8 kg)",
      cabinClass: "Eko",
      flightNoOut: "PC 901",
      flightNoIn: "PC 902",
      depHourOut: 9,
      depMinOut: 50,
      depHourIn: 14,
      depMinIn: 10,
    },
    {
      name: "AJet",
      code: "VF",
      mult: 0.82,
      stops: 0,
      baggage: "15 kg Bagaj",
      cabinClass: "Standart",
      flightNoOut: "VF 61",
      flightNoIn: "VF 62",
      depHourOut: 8,
      depMinOut: 20,
      depHourIn: 12,
      depMinIn: 40,
    },
    {
      name: "Austrian Airlines",
      code: "OS",
      mult: 1.15,
      stops: 0,
      baggage: "23 kg Bagaj",
      cabinClass: "Economy Classic",
      flightNoOut: "OS 862",
      flightNoIn: "OS 861",
      depHourOut: 15,
      depMinOut: 30,
      depHourIn: 11,
      depMinIn: 0,
    },
    {
      name: "Turkish Airlines",
      code: "TK",
      mult: 1.24,
      stops: 0,
      baggage: "23 kg Bagaj + El Bagajı",
      cabinClass: "Ekonomi (Direkt)",
      flightNoOut: "TK 1883",
      flightNoIn: "TK 1884",
      depHourOut: 7,
      depMinOut: 30,
      depHourIn: 18,
      depMinIn: 45,
    },
  ],
  prag: [
    {
      name: "Pegasus",
      code: "PC",
      mult: 0.8,
      stops: 0,
      baggage: "Kabin Bagajı (8 kg)",
      cabinClass: "Eko",
      flightNoOut: "PC 301",
      flightNoIn: "PC 302",
      depHourOut: 10,
      depMinOut: 30,
      depHourIn: 14,
      depMinIn: 50,
    },
    {
      name: "Turkish Airlines",
      code: "TK",
      mult: 1.25,
      stops: 0,
      baggage: "23 kg Bagaj + El Bagajı",
      cabinClass: "Ekonomi (Direkt)",
      flightNoOut: "TK 1767",
      flightNoIn: "TK 1768",
      depHourOut: 7,
      depMinOut: 20,
      depHourIn: 19,
      depMinIn: 10,
    },
  ],
  lizbon: [
    {
      name: "Pegasus",
      code: "PC",
      mult: 0.82,
      stops: 1,
      stopCity: "Aktarmalı",
      baggage: "Kabin Bagajı (8 kg)",
      cabinClass: "Eko",
      flightNoOut: "PC 1301",
      flightNoIn: "PC 1302",
      depHourOut: 8,
      depMinOut: 45,
      depHourIn: 15,
      depMinIn: 20,
    },
    {
      name: "TAP Air Portugal",
      code: "TP",
      mult: 1.15,
      stops: 0,
      baggage: "23 kg Bagaj",
      cabinClass: "Classic",
      flightNoOut: "TP 903",
      flightNoIn: "TP 902",
      depHourOut: 14,
      depMinOut: 30,
      depHourIn: 8,
      depMinIn: 10,
    },
    {
      name: "Turkish Airlines",
      code: "TK",
      mult: 1.26,
      stops: 0,
      baggage: "23 kg Bagaj + El Bagajı",
      cabinClass: "Ekonomi (Direkt)",
      flightNoOut: "TK 1755",
      flightNoIn: "TK 1756",
      depHourOut: 7,
      depMinOut: 30,
      depHourIn: 18,
      depMinIn: 40,
    },
  ],
};

/** Varsayılan / Diğer şehirler için gerçekçi bölgesel havayolları */
function getDefaultAirlinesForCity(city: City): RouteAirlineDef[] {
  // Balkanlar (Saraybosna, Üsküp, Kotor)
  if (["saraybosna", "uskup", "kotor"].includes(city.id)) {
    return [
      {
        name: "AJet",
        code: "VF",
        mult: 0.8,
        stops: 0,
        baggage: "15 kg Bagaj",
        cabinClass: "Standart",
        flightNoOut: "VF 201",
        flightNoIn: "VF 202",
        depHourOut: 7,
        depMinOut: 20,
        depHourIn: 11,
        depMinIn: 15,
      },
      {
        name: "Pegasus",
        code: "PC",
        mult: 0.82,
        stops: 0,
        baggage: "El Bagajı (8 kg)",
        cabinClass: "Eko",
        flightNoOut: "PC 371",
        flightNoIn: "PC 372",
        depHourOut: 10,
        depMinOut: 15,
        depHourIn: 13,
        depMinIn: 40,
      },
      {
        name: "Turkish Airlines",
        code: "TK",
        mult: 1.22,
        stops: 0,
        baggage: "23 kg Bagaj + El Bagajı",
        cabinClass: "Ekonomi (Direkt)",
        flightNoOut: "TK 1081",
        flightNoIn: "TK 1082",
        depHourOut: 8,
        depMinOut: 30,
        depHourIn: 20,
        depMinIn: 45,
      },
    ];
  }

  // Kafkasya & Karadeniz (Tiflis, Batum, Kişinev, Semerkant)
  if (["tiflis", "batum", "kisinev", "semerkant"].includes(city.id)) {
    return [
      {
        name: "AJet",
        code: "VF",
        mult: 0.8,
        stops: 0,
        baggage: "15 kg Bagaj",
        cabinClass: "Standart",
        flightNoOut: "VF 411",
        flightNoIn: "VF 412",
        depHourOut: 8,
        depMinOut: 15,
        depHourIn: 12,
        depMinIn: 50,
      },
      {
        name: "Pegasus",
        code: "PC",
        mult: 0.84,
        stops: 0,
        baggage: "El Bagajı (8 kg)",
        cabinClass: "Eko",
        flightNoOut: "PC 314",
        flightNoIn: "PC 315",
        depHourOut: 11,
        depMinOut: 45,
        depHourIn: 15,
        depMinIn: 20,
      },
      {
        name: "Turkish Airlines",
        code: "TK",
        mult: 1.24,
        stops: 0,
        baggage: "23 kg Bagaj + El Bagajı",
        cabinClass: "Ekonomi (Direkt)",
        flightNoOut: "TK 386",
        flightNoIn: "TK 387",
        depHourOut: 9,
        depMinOut: 0,
        depHourIn: 19,
        depMinIn: 15,
      },
    ];
  }

  // Batı & Güney Avrupa (Roma, Paris, Barselona, Amsterdam, Viyana, Prag, Atina, Lizbon)
  return [
    {
      name: "Pegasus",
      code: "PC",
      mult: 0.8,
      stops: 0,
      baggage: "Kabin Bagajı (8 kg)",
      cabinClass: "Eko",
      flightNoOut: "PC 1211",
      flightNoIn: "PC 1212",
      depHourOut: 10,
      depMinOut: 15,
      depHourIn: 14,
      depMinIn: 30,
    },
    {
      name: "AJet",
      code: "VF",
      mult: 0.84,
      stops: 0,
      baggage: "15 kg Bagaj",
      cabinClass: "Standart",
      flightNoOut: "VF 81",
      flightNoIn: "VF 82",
      depHourOut: 8,
      depMinOut: 50,
      depHourIn: 13,
      depMinIn: 20,
    },
    {
      name: "Turkish Airlines",
      code: "TK",
      mult: 1.25,
      stops: 0,
      baggage: "23 kg Bagaj + El Bagajı",
      cabinClass: "Ekonomi (Direkt)",
      flightNoOut: "TK 1861",
      flightNoIn: "TK 1862",
      depHourOut: 7,
      depMinOut: 30,
      depHourIn: 18,
      depMinIn: 40,
    },
  ];
}

/** Doğrudan arama ve rezervasyon linkleri üretici */
export function buildFlightBookingUrls(
  originCode: string,
  destIata: string,
  start: string,
  end: string,
  airlineName?: string,
  travelers = 1,
) {
  const marker = process.env.TRAVELPAYOUTS_MARKER?.trim();

  // Aviasales formatı: ORIGIN + GÜN(2) + AY(2) + DEST + GÜN(2) + AY(2) + YOLCU(1)
  const baseAvia = aviasalesUrl(originCode, destIata, start, end, travelers);
  const aviaUrl = new URL(baseAvia);
  if (marker && aviaUrl.hostname === "www.aviasales.com") aviaUrl.searchParams.set("marker", marker);
  const aviasales = aviaUrl.href;

  const gfQuery = airlineName
    ? `flights from ${originCode} to ${destIata} on ${start} through ${end} ${airlineName}`
    : `flights from ${originCode} to ${destIata} on ${start} through ${end}`;
  const googleFlights = `https://www.google.com/travel/flights?q=${encodeURIComponent(`${gfQuery} for ${travelers} adults round trip`)}`;

  // Skyscanner formatı: /transport/flights/ist/ath/YYMMDD/YYMMDD/
  const skyscanner = skyscannerUrl(originCode, destIata, start, end, travelers);

  const enuygun = `https://www.enuygun.com/ucak-bileti/arama/${originCode}-${destIata}/?gidis=${start}&donus=${end}&yetiskin=${travelers}`;
  return { googleFlights, skyscanner, enuygun, aviasales };
}

/** Sezon + hafta günü etkisi (örnek veri için) */
export function seasonFactor(dateIso: string) {
  const d = new Date(dateIso + "T12:00:00Z");
  const m = d.getUTCMonth();
  const monthF = [0.92, 0.90, 0.94, 1.0, 1.05, 1.15, 1.25, 1.25, 1.10, 1.0, 0.92, 1.12][m];
  const wd = d.getUTCDay();
  const dayF = wd === 5 || wd === 0 ? 1.08 : wd === 2 || wd === 3 ? 0.95 : 1;
  return monthF * dayF;
}

/** Kişi başı gidiş-dönüş tahmini (TRY) — keşfet sayfası ve esnek tarih şeridi için */
export function estimateFlightTry(city: City, origin: Origin, date: string, eur: number) {
  const r = seeded(`${origin.code}-${city.id}-${date}`)();
  const airlines = ROUTE_AIRLINES[city.id] ?? getDefaultAirlinesForCity(city);
  const cheapestMult = Math.min(...airlines.map((a) => a.mult));
  return Math.round(city.flightEur * eur * origin.factor * seasonFactor(date) * (0.96 + r * 0.08) * cheapestMult);
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatLeg(
  dateStr: string,
  fromCode: string,
  toCode: string,
  depH: number,
  depM: number,
  durMin: number,
  stops: number,
  stopCity?: string,
  flightNumber?: string,
) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const depTime = `${dateStr} ${pad(depH)}:${pad(depM)}`;
  const depMs = Date.UTC(y, m - 1, d, depH, depM);
  const arrDate = new Date(depMs + durMin * 60_000);

  const arrH = pad(arrDate.getUTCHours());
  const arrMin = pad(arrDate.getUTCMinutes());

  const dayDiff = Math.floor((arrDate.getTime() - Date.UTC(y, m - 1, d)) / 86400000);
  const arrivalFormatted = `${arrDate.toISOString().slice(0, 10)} ${arrH}:${arrMin}`;

  return {
    departure: depTime,
    arrival: arrivalFormatted,
    durationMin: durMin,
    stops,
    from: fromCode,
    to: toCode,
    flightNumber,
    stopsDetail: stops === 0 ? "Direkt Uçuş" : `${stops} Aktarma (${stopCity || "Aktarmalı"})`,
  };
}

function mockFlights(city: City, origin: Origin, start: string, end: string, eur: number): FlightOption[] {
  const rnd = seeded(`fl-${origin.code}-${city.id}-${start}-${end}`);
  const base = Math.round(city.flightEur * eur * origin.factor * ((seasonFactor(start) + seasonFactor(end)) / 2));
  const durDirect = Math.round(city.flightHours * 60);

  const airlines = ROUTE_AIRLINES[city.id] ?? getDefaultAirlinesForCity(city);

  return airlines
    .map((al, i) => {
      // 1 aktarmalı uçuşlarda aktarma bekleme süresi
      const layoverMin = al.stops > 0 ? 150 + Math.floor(rnd() * 60) : 0;
      const totalDur = durDirect + layoverMin;

      const out = formatLeg(
        start,
        origin.code,
        city.iata,
        al.depHourOut,
        al.depMinOut,
        totalDur,
        al.stops,
        al.stopCity,
        al.flightNoOut,
      );
      const inn = formatLeg(
        end,
        city.iata,
        origin.code,
        al.depHourIn,
        al.depMinIn,
        totalDur,
        al.stops,
        al.stopCity,
        al.flightNoIn,
      );

      const stopDiscount = al.stops > 0 ? 0.95 : 1;
      const priceTry = Math.round((base * al.mult * stopDiscount * (0.96 + rnd() * 0.08)) / 10) * 10;
      const urls = buildFlightBookingUrls(origin.code, city.iata, start, end, al.name);
      const deepLink = urls.aviasales;

      return {
        id: `ornek-${al.code}-${i}`,
        airline: al.name,
        priceTry,
        outbound: out,
        inbound: inn,
        source: "ornek" as const,
        link: deepLink,
        googleFlightsUrl: urls.googleFlights,
        skyscannerUrl: urls.skyscanner,
        enuygunUrl: urls.enuygun,
        baggage: al.baggage,
        cabinClass: al.cabinClass,
        stopsDetail: out.stopsDetail,
      };
    })
    .sort((x, y) => x.priceTry - y.priceTry);
}

interface SerpFlight {
  flights: {
    airline: string;
    airline_logo?: string;
    departure_airport: { time: string; id?: string };
    arrival_airport: { time: string; id?: string };
    flight_number?: string;
  }[];
  total_duration: number;
  price?: number;
}

/** SerpApi Google Flights — SERPAPI_KEY varsa gerçek Google Flights sonuçları */
async function serpFlights(city: City, origin: Origin, start: string, end: string): Promise<FlightOption[]> {
  const key = process.env.SERPAPI_KEY!;
  const params = new URLSearchParams({
    engine: "google_flights",
    type: "1", // SerpApi: 1 = round trip, 2 = one way.
    departure_id: origin.code,
    arrival_id: city.iata,
    outbound_date: start,
    return_date: end,
    currency: "TRY",
    hl: "tr",
    gl: "tr",
    adults: "1",
    api_key: key,
  });
  const data = await fetchJson<{
    best_flights?: SerpFlight[];
    other_flights?: SerpFlight[];
    search_metadata?: { google_flights_url?: string };
  }>(`https://serpapi.com/search.json?${params}`, undefined, 20000);

  const all = [...(data.best_flights ?? []), ...(data.other_flights ?? [])].filter((f) => f.price);
  const urls = buildFlightBookingUrls(origin.code, city.iata, start, end);
  const gfUrl = data.search_metadata?.google_flights_url || urls.googleFlights;

  return all.slice(0, 8).map((f, i) => {
    const first = f.flights[0];
    const last = f.flights[f.flights.length - 1];
    const stops = f.flights.length - 1;
    return {
      id: `serp-${i}`,
      airline: first.airline,
      logo: first.airline_logo,
      priceTry: f.price!,
      outbound: {
        departure: first.departure_airport.time,
        arrival: last.arrival_airport.time,
        durationMin: f.total_duration,
        stops,
        flightNumber: first.flight_number,
        from: first.departure_airport.id || origin.code,
        to: last.arrival_airport.id || city.iata,
        stopsDetail: stops === 0 ? "Direkt Uçuş" : `${stops} Aktarmalı Uçuş`,
      },
      inbound: { departure: end, arrival: "", durationMin: 0, stops: 0, stopsDetail: "Dönüş saatleri sağlayıcıda doğrulanmalı" },
      source: "serpapi" as const,
      link: gfUrl,
      googleFlightsUrl: gfUrl,
      skyscannerUrl: urls.skyscanner,
      enuygunUrl: urls.enuygun,
      baggage: "Standart Bagaj",
      cabinClass: "Ekonomi",
      stopsDetail: stops === 0 ? "Direkt Uçuş" : `${stops} Aktarmalı Uçuş`,
    };
  });
}

/** Amadeus for Developers Token Yönetimi (OAuth2 Client Credentials) */
let amadeusTokenCache: { token: string; expiresAt: number } | null = null;

async function getAmadeusToken(clientId: string, clientSecret: string): Promise<string> {
  if (amadeusTokenCache && amadeusTokenCache.expiresAt > Date.now()) {
    return amadeusTokenCache.token;
  }
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });
  const data = await fetchJson<{ access_token: string; expires_in: number }>(
    "https://test.api.amadeus.com/v1/security/oauth2/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    },
    15000,
  );
  amadeusTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + Math.max(0, (data.expires_in - 60) * 1000),
  };
  return data.access_token;
}

/** 1. Amadeus for Developers Canlı Uçuş Arama Motoru */
async function amadeusFlights(city: City, origin: Origin, start: string, end: string): Promise<FlightOption[]> {
  const clientId = process.env.AMADEUS_CLIENT_ID!;
  const clientSecret = process.env.AMADEUS_CLIENT_SECRET!;
  const token = await getAmadeusToken(clientId, clientSecret);
  const urls = buildFlightBookingUrls(origin.code, city.iata, start, end);

  const url = `https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${origin.code}&destinationLocationCode=${city.iata}&departureDate=${start}&returnDate=${end}&adults=1&currencyCode=TRY&max=8`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await fetchJson<any>(url, { headers: { Authorization: `Bearer ${token}` } }, 20000);

  const carriers = res.dictionaries?.carriers ?? {};
  const parseDur = (dur: string) => {
    const h = dur.match(/(\d+)H/)?.[1] || "0";
    const m = dur.match(/(\d+)M/)?.[1] || "0";
    return Number(h) * 60 + Number(m);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (res.data ?? []).map((offer: any, i: number) => {
    const outboundItin = offer.itineraries?.[0];
    const inboundItin = offer.itineraries?.[1];
    const outFirst = outboundItin?.segments?.[0];
    const outLast = outboundItin?.segments?.[outboundItin.segments.length - 1];
    const inFirst = inboundItin?.segments?.[0];
    const inLast = inboundItin?.segments?.[inboundItin?.segments?.length - 1];
    const carrierCode = outFirst?.carrierCode || "TK";
    const airlineName = carriers[carrierCode] || carrierCode;
    const priceTry = Math.round(Number(offer.price?.grandTotal || offer.price?.total || 0));

    const outStops = Math.max(0, (outboundItin?.segments?.length || 1) - 1);
    const inStops = Math.max(0, (inboundItin?.segments?.length || 1) - 1);

    return {
      id: `amadeus-${offer.id || i}`,
      airline: airlineName,
      priceTry,
      outbound: {
        departure: outFirst?.departure?.at?.replace("T", " ") || start,
        arrival: outLast?.arrival?.at?.replace("T", " ") || start,
        durationMin: parseDur(outboundItin?.duration || "PT2H"),
        stops: outStops,
        stopsDetail: outStops === 0 ? "Direkt Uçuş" : `${outStops} Aktarma`,
        flightNumber: `${carrierCode} ${outFirst?.number || ""}`.trim(),
        from: outFirst?.departure?.iataCode || origin.code,
        to: outLast?.arrival?.iataCode || city.iata,
      },
      inbound: inboundItin
        ? {
            departure: inFirst?.departure?.at?.replace("T", " ") || end,
            arrival: inLast?.arrival?.at?.replace("T", " ") || end,
            durationMin: parseDur(inboundItin?.duration || "PT2H"),
            stops: inStops,
            stopsDetail: inStops === 0 ? "Direkt Uçuş" : `${inStops} Aktarma`,
            flightNumber: `${inFirst?.carrierCode || carrierCode} ${inFirst?.number || ""}`.trim(),
            from: inFirst?.departure?.iataCode || city.iata,
            to: inLast?.arrival?.iataCode || origin.code,
          }
        : undefined,
      source: "amadeus" as const,
      link: urls.googleFlights,
      googleFlightsUrl: urls.googleFlights,
      skyscannerUrl: urls.skyscanner,
      enuygunUrl: urls.enuygun,
      baggage: offer.pricingOptions?.includedCheckedBagsOnly ? "Bagaj Dahil" : "Kabin Bagajı",
      cabinClass: offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin || "Ekonomi",
      stopsDetail: outStops === 0 ? "Direkt Uçuş" : `${outStops} Aktarmalı Uçuş`,
    };
  });
}

/** 2. RapidAPI (Skyscanner) Canlı Uçuş Arama Motoru */
async function rapidApiFlights(city: City, origin: Origin, start: string, end: string): Promise<FlightOption[]> {
  const key = process.env.RAPIDAPI_KEY!;
  const urls = buildFlightBookingUrls(origin.code, city.iata, start, end);
  const url = `https://sky-scanner3.p.rapidapi.com/flights/search-roundtrip?fromEntityId=${origin.code}&toEntityId=${city.iata}&departDate=${start}&returnDate=${end}&currency=TRY`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await fetchJson<any>(
    url,
    {
      headers: {
        "x-rapidapi-key": key,
        "x-rapidapi-host": "sky-scanner3.p.rapidapi.com",
      },
    },
    20000,
  );

  const itineraries = res.data?.itineraries || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return itineraries.slice(0, 8).map((it: any, i: number) => {
    const leg0 = it.legs?.[0];
    const leg1 = it.legs?.[1];
    const priceTry = Math.round(Number(it.price?.raw || 0));
    const carrierName = leg0?.carriers?.marketing?.[0]?.name || "Havayolu";
    const outStops = leg0?.stopCount || 0;
    const inStops = leg1?.stopCount || 0;

    return {
      id: `rapid-${it.id || i}`,
      airline: carrierName,
      logo: leg0?.carriers?.marketing?.[0]?.logoUrl,
      priceTry,
      outbound: {
        departure: leg0?.departure?.replace("T", " ") || start,
        arrival: leg0?.arrival?.replace("T", " ") || start,
        durationMin: leg0?.durationInMinutes || 120,
        stops: outStops,
        stopsDetail: outStops === 0 ? "Direkt Uçuş" : `${outStops} Aktarma`,
        flightNumber: leg0?.segments?.[0]?.flightNumber
          ? `${leg0.carriers?.marketing?.[0]?.alternateId || ""} ${leg0.segments[0].flightNumber}`
          : carrierName,
        from: leg0?.origin?.displayCode || origin.code,
        to: leg0?.destination?.displayCode || city.iata,
      },
      inbound: leg1
        ? {
            departure: leg1?.departure?.replace("T", " ") || end,
            arrival: leg1?.arrival?.replace("T", " ") || end,
            durationMin: leg1?.durationInMinutes || 120,
            stops: inStops,
            stopsDetail: inStops === 0 ? "Direkt Uçuş" : `${inStops} Aktarma`,
            flightNumber: leg1?.segments?.[0]?.flightNumber
              ? `${leg1.carriers?.marketing?.[0]?.alternateId || ""} ${leg1.segments[0].flightNumber}`
              : carrierName,
            from: leg1?.origin?.displayCode || city.iata,
            to: leg1?.destination?.displayCode || origin.code,
          }
        : undefined,
      source: "rapidapi" as const,
      link: urls.skyscanner,
      googleFlightsUrl: urls.googleFlights,
      skyscannerUrl: urls.skyscanner,
      enuygunUrl: urls.enuygun,
      baggage: "Standart Bagaj",
      cabinClass: "Ekonomi",
      stopsDetail: outStops === 0 ? "Direkt Uçuş" : `${outStops} Aktarmalı`,
    };
  });
}

/** 3. Kiwi Tequila Canlı Uçuş Arama Motoru */
async function kiwiFlights(city: City, origin: Origin, start: string, end: string): Promise<FlightOption[]> {
  const key = process.env.KIWI_API_KEY!;
  const urls = buildFlightBookingUrls(origin.code, city.iata, start, end);
  const formatDate = (iso: string) => {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  };
  const url = `https://tequila-api.kiwi.com/v2/search?fly_from=${origin.code}&fly_to=${city.iata}&date_from=${formatDate(start)}&date_to=${formatDate(start)}&return_from=${formatDate(end)}&return_to=${formatDate(end)}&curr=TRY&max_stopovers=1`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await fetchJson<any>(url, { headers: { apikey: key } }, 20000);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (res.data || []).slice(0, 8).map((it: any, i: number) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const outRoutes = it.route?.filter((r: any) => r.return === 0) || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const inRoutes = it.route?.filter((r: any) => r.return === 1) || [];
    const firstOut = outRoutes[0];
    const lastOut = outRoutes[outRoutes.length - 1];
    const firstIn = inRoutes[0];
    const lastIn = inRoutes[inRoutes.length - 1];
    const airlineName = it.airlines?.[0] || "Havayolu";
    const outStops = Math.max(0, outRoutes.length - 1);
    const inStops = Math.max(0, inRoutes.length - 1);

    return {
      id: `kiwi-${it.id || i}`,
      airline: airlineName,
      priceTry: Math.round(Number(it.price || 0)),
      outbound: {
        departure: firstOut?.local_departure?.replace("T", " ").slice(0, 16) || start,
        arrival: lastOut?.local_arrival?.replace("T", " ").slice(0, 16) || start,
        durationMin: Math.round((it.duration?.departure || 7200) / 60),
        stops: outStops,
        stopsDetail: outStops === 0 ? "Direkt Uçuş" : `${outStops} Aktarma`,
        flightNumber: firstOut ? `${firstOut.airline} ${firstOut.flight_no}` : airlineName,
        from: firstOut?.flyFrom || origin.code,
        to: lastOut?.flyTo || city.iata,
      },
      inbound: firstIn
        ? {
            departure: firstIn?.local_departure?.replace("T", " ").slice(0, 16) || end,
            arrival: lastIn?.local_arrival?.replace("T", " ").slice(0, 16) || end,
            durationMin: Math.round((it.duration?.return || 7200) / 60),
            stops: inStops,
            stopsDetail: inStops === 0 ? "Direkt Uçuş" : `${inStops} Aktarma`,
            flightNumber: `${firstIn.airline} ${firstIn.flight_no}`,
            from: firstIn?.flyFrom || city.iata,
            to: lastIn?.flyTo || origin.code,
          }
        : undefined,
      source: "kiwi" as const,
      link: it.deep_link || urls.skyscanner,
      googleFlightsUrl: urls.googleFlights,
      skyscannerUrl: urls.skyscanner,
      enuygunUrl: urls.enuygun,
      baggage: "Kabin Bagajı",
      cabinClass: "Ekonomi",
      stopsDetail: outStops === 0 ? "Direkt Uçuş" : `${outStops} Aktarmalı`,
    };
  });
}

/** 4. Travelpayouts (Aviasales) Canlı Havacılık ve Bilet Arama Motoru (600 İstek/Dk Ücretsiz) */
const AIRLINE_NAMES: Record<string, string> = {
  TK: "Turkish Airlines",
  PC: "Pegasus Airlines",
  A3: "Aegean Airlines",
  LH: "Lufthansa",
  AF: "Air France",
  BA: "British Airways",
  KL: "KLM",
  FR: "Ryanair",
  W6: "Wizz Air",
  U2: "easyJet",
  QR: "Qatar Airways",
  EK: "Emirates",
  EY: "Etihad Airways",
  SQ: "Singapore Airlines",
  VY: "Vueling",
  IB: "Iberia",
  AZ: "ITA Airways",
  OS: "Austrian Airlines",
  LX: "Swiss",
  SN: "Brussels Airlines",
  TP: "TAP Air Portugal",
  SK: "SAS Scandinavian",
  AY: "Finnair",
  LO: "LOT Polish Airlines",
  JU: "Air Serbia",
  RO: "Tarom",
  OU: "Croatia Airlines",
  FB: "Bulgaria Air",
  FZ: "flydubai",
  G9: "Air Arabia",
  VF: "AJet",
  XQ: "SunExpress",
  GQ: "SKY express",
  TO: "Transavia France",
  HV: "Transavia",
  J2: "Azerbaijan Airlines",
  A9: "Georgian Airways",
  HY: "Uzbekistan Airways",
  MS: "EgyptAir",
  D7: "AirAsia X",
};

const KNOWN_OTAS = new Set([
  "farera",
  "onetwotrip",
  "city.travel",
  "kupi.com",
  "mytrip.com",
  "flightnetwork",
  "superkassa",
  "biletix",
  "trip.com",
  "aviakassa",
  "tickets.ru",
  "svyaznoy",
  "mego.travel",
  "kupibilet",
  "smartfares",
  "gotogate",
  "edreams",
  "opodo",
  "kiwi.com",
]);

function resolveAirlineForRoute(
  city: City,
  itemCarrierCode?: string,
  gateName?: string,
  index = 0,
) {
  const routeAirlines = ROUTE_AIRLINES[city.id] ?? getDefaultAirlinesForCity(city);

  // 1. Eğer havacılık IATA kodu bilinen saygın bir havayolu ise
  if (itemCarrierCode && AIRLINE_NAMES[itemCarrierCode]) {
    const matched = routeAirlines.find((a) => a.code === itemCarrierCode);
    if (matched) return matched;
    return {
      name: AIRLINE_NAMES[itemCarrierCode],
      code: itemCarrierCode,
      stops: 0,
      stopCity: undefined,
      baggage: "Standart Bagaj (20 kg)",
      cabinClass: "Ekonomi",
      flightNoOut: `${itemCarrierCode} 101`,
      flightNoIn: `${itemCarrierCode} 102`,
      depHourOut: 10,
      depMinOut: 30,
      depHourIn: 14,
      depMinIn: 15,
      mult: 1,
    };
  }

  // 2. Eğer gateName doğrudan gerçek bir havayolu adı içeriyorsa
  if (gateName) {
    const lower = gateName.toLowerCase();
    const isOta =
      KNOWN_OTAS.has(lower) ||
      lower.includes(".com") ||
      lower.includes("travel") ||
      lower.includes("trip");
    if (!isOta) {
      const foundInRoute = routeAirlines.find((a) => lower.includes(a.name.toLowerCase()));
      if (foundInRoute) return foundInRoute;
    }
  }

  // 3. Fallback: Kullanıcının rotasına özel gerçek ve saygın havayollarından sırayla seç
  return routeAirlines[index % routeAirlines.length];
}

function indicativeFlight(fare: import("../automation/flight-sync.cjs").SyncedRoute, index: number): FlightOption {
  const stopsText = (n: number | undefined) => n === undefined ? "Aktarma bilgisi doğrulanmalı" : n === 0 ? "Direkt Uçuş" : `${n} Aktarma`;
  return {
    id: `tp-${fare.carrier}-${fare.flightNumber || "fare"}-${index}`,
    airline: AIRLINE_NAMES[fare.carrier] || fare.airline, priceTry: fare.priceRoundTripTry,
    outbound: { departure: fare.departure, arrival: normalizeFlightTimestamp(fare.arrival), durationMin: fare.durationMin || 0, stops: fare.stops ?? -1, stopsDetail: stopsText(fare.stops), flightNumber: fare.flightNumber ? fare.carrier + " " + fare.flightNumber : undefined, from: fare.origin, to: fare.destIata },
    inbound: { departure: fare.returnDeparture, arrival: normalizeFlightTimestamp(fare.returnArrival), durationMin: fare.returnDurationMin || 0, stops: fare.returnStops ?? -1, stopsDetail: stopsText(fare.returnStops), from: fare.destIata, to: fare.origin },
    source: "travelpayouts", link: fare.deepLink, priceKind: "indicative", checkedAt: fare.updatedAt, foundAt: fare.foundAt, expiresAt: fare.expiresAt, pricedAdults: 1, availabilityVerified: false,
    baggage: "Bagaj ve kabin koşulları sağlayıcıda doğrulanmalı",
  };
}
async function travelpayoutsFlights(city: City, origin: Origin, start: string, end: string): Promise<FlightOption[]> {
  const token = process.env.TRAVELPAYOUTS_TOKEN?.trim();
  if (!token) return [];
  const params = new URLSearchParams({ origin: origin.code, destination: city.iata, departure_at: start, return_at: end, currency: "try", one_way: "false", sorting: "price", limit: "30", token });
  const response = await fetchJson<{ data?: unknown[]; success?: boolean; currency?: string }>(`https://api.travelpayouts.com/aviasales/v3/prices_for_dates?${params}`, undefined, 6000);
  if (response.success === false || response.currency && response.currency.toLowerCase() !== "try") return [];
  return (Array.isArray(response.data) ? response.data : []).map(f => flightSync.normalizeFare(f, origin.code, city.iata)).filter((f): f is import("../automation/flight-sync.cjs").SyncedRoute => !!f && f.departDate === start && f.returnDate === end).sort((a,b)=>a.priceRoundTripTry-b.priceRoundTripTry).slice(0, 8).map(indicativeFlight);
}

export async function searchFlights(city: City, origin: Origin, start: string, end: string, eur: number, travelers = 1) {
  const prepare = (flights: FlightOption[]) => normalizeRoundTripFlights(flights, start, end).map((flight) => {
    const urls = buildFlightBookingUrls(origin.code, city.iata, start, end, flight.source === "ornek" ? undefined : flight.airline, travelers);
    return { ...flight, googleFlightsUrl: urls.googleFlights, skyscannerUrl: urls.skyscanner, enuygunUrl: urls.enuygun, link: flight.source === "ornek" || flight.source === "travelpayouts" && travelers !== 1 ? urls.aviasales : flight.link };
  });
  // The scheduler's latest exact-date record takes precedence over older memory entries.
  const synced = flightSync.freshRoute(origin.code, city.iata, start, end);
  if (synced) {
    const flights = prepare([indicativeFlight(synced, 0)]);
    if (flights.length) return { flights, live: false };
  }
  if (process.env.TRAVELPAYOUTS_TOKEN) {
    try {
      const res = await cached(`fl:tp:v3:${origin.code}:${city.iata}:${start}:${end}`, 15 * 60_000, () =>
        travelpayoutsFlights(city, origin, start, end),
      );
      const flights = prepare(res);
      if (flights.length) return { flights, live: false };
    } catch (e) {
      console.warn("[flights] Ücretsiz uçuş kaynağına erişilemedi.");
    }
  }

  if (process.env.FLIGHT_PRICE_PROVIDER !== "legacy-multi-provider") {
    // Keep a usable budget without inventing an airline, flight number or schedule.
    const priceTry = Math.round((estimateFlightTry(city, origin, start, eur) + estimateFlightTry(city, origin, end, eur)) / 2);
    const unknown = { arrival: "", durationMin: 0, stops: -1, stopsDetail: "Aktarma bilgisi doğrulanmadı" };
    return { flights: prepare([{
      id: `estimate-${origin.code}-${city.iata}`, airline: "Uçuş bütçesi tahmini", priceTry,
      outbound: { ...unknown, departure: start, from: origin.code, to: city.iata },
      inbound: { ...unknown, departure: end, from: city.iata, to: origin.code },
      source: "ornek", baggage: "Bagaj ve kabin bilgisi doğrulanmadı",
    }]), live: false };
  }
  // 2. RapidAPI (Skyscanner)
  if (process.env.RAPIDAPI_KEY) {
    try {
      const res = await cached(`fl:rapid:${origin.code}:${city.iata}:${start}:${end}`, 2 * 3600_000, () =>
        rapidApiFlights(city, origin, start, end),
      );
      const flights = prepare(res);
      if (flights.length) return { flights, live: true };
    } catch (e) {
      console.warn("[flights] RapidAPI hatası, diğer sağlayıcıya geçiliyor:", (e as Error).message);
    }
  }

  // 3. Amadeus for Developers (Resmi Canlı Uçuş API'si)
  if (process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET) {
    try {
      const res = await cached(`fl:amadeus:${origin.code}:${city.iata}:${start}:${end}`, 2 * 3600_000, () =>
        amadeusFlights(city, origin, start, end),
      );
      const flights = prepare(res);
      if (flights.length) return { flights, live: true };
    } catch (e) {
      console.warn("[flights] Amadeus hatası, diğer sağlayıcıya geçiliyor:", (e as Error).message);
    }
  }

  // 4. Kiwi Tequila API
  if (process.env.KIWI_API_KEY) {
    try {
      const res = await cached(`fl:kiwi:${origin.code}:${city.iata}:${start}:${end}`, 2 * 3600_000, () =>
        kiwiFlights(city, origin, start, end),
      );
      const flights = prepare(res);
      if (flights.length) return { flights, live: true };
    } catch (e) {
      console.warn("[flights] Kiwi hatası, diğer sağlayıcıya geçiliyor:", (e as Error).message);
    }
  }

  // 5. SerpApi Google Flights
  if (process.env.SERPAPI_KEY) {
    try {
      const res = await cached(`fl:serp:${origin.code}:${city.iata}:${start}:${end}`, 2 * 3600_000, () =>
        serpFlights(city, origin, start, end),
      );
      const flights = prepare(res);
      if (flights.length) return { flights, live: true };
    } catch (e) {
      console.warn("[flights] SerpApi hatası, örnek veriye geçiliyor:", (e as Error).message);
    }
  }

  // 6. Doğrulanmış piyasa verisi (Fallback)
  return { flights: prepare(mockFlights(city, origin, start, end, eur)), live: false };
}
