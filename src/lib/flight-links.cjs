// Pure shared URL helpers. Aviasales' documented short route format has no year.
const isoDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
function turkeyToday(now = Date.now()) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date(now)); }
function nextOccurrence(monthDay, after, inclusive) {
  for (let year = Number(after.slice(0,4)); year <= Number(after.slice(0,4)) + 8; year++) {
    const date = `${year}-${monthDay}`;
    if (isoDate(date) && (inclusive ? date >= after : date > after)) return date;
  }
  return null;
}
function skyscannerUrl(origin, destination, start, end, adults = 1) {
  return `https://www.skyscanner.com.tr/transport/flights/${origin.toLowerCase()}/${destination.toLowerCase()}/${start.slice(2).replaceAll('-','')}/${end.slice(2).replaceAll('-','')}/?adultsv2=${adults}&cabinclass=economy`;
}
function aviasalesUrl(origin, destination, start, end, adults = 1, now = Date.now()) {
  if (!/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(destination) || !isoDate(start) || !isoDate(end) || end <= start || !Number.isInteger(adults) || adults < 1 || adults > 9) throw new Error('Geçersiz uçuş araması.');
  // A distant year must not silently become the next occurrence of DDMM.
  if (nextOccurrence(start.slice(5), turkeyToday(now), true) !== start || nextOccurrence(end.slice(5), start, false) !== end) return skyscannerUrl(origin, destination, start, end, adults);
  const short = date => date.slice(8,10) + date.slice(5,7);
  return `https://www.aviasales.com/search/${origin}${short(start)}${destination}${short(end)}${adults}`;
}
module.exports = { aviasalesUrl, skyscannerUrl };
